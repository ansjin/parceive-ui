/* global $, window, document, console */

angular
  .module('thread-view', ['app'])
  .value('name', 'Thread view')
  .value('group', 'Profile views')
  .value('focusCb', focusCb)
  .value('markedCb', markedCb)
  .value('hoverCb', hoverCb)
  .value('spotCb', spotCb)
  .service('render', render);

// handle focus event
function focusCb(stateManager, data) {

}

// handle mark event
function markedCb(stateManager, data) {
  if (data.length < 1) { return; }

  console.log(data);
}

// handle hover event
function hoverCb(stateManager, data) {

}

// handle spot event
function spotCb(stateManager, data) {
  
}

// inject view dependencies
render.$inject = [
  'd3',
  'pData',
  'LoaderService'
];

// render the view
function render(d3, pd, ld) {
  return function(svg, stateManager) {
    // data holder for this view
    var _thread = {
      viewData: {},
      profileId: Date.now(),
      svgWidth: '100%',
      rectHeight: 22,
      textPadY: 15,
      selected: [],
      rawThreads: [],
      threadCalls: [],
      thresholdFactor: 1,
      runtimeThreshold: 0,
      threadCaller: [],
      viewHeight: 0
    };

    // get thread data for current database
    pd.getThreads()
    .then(function(data) {
      _thread.rawThreads = data;

      var promises = [];
      _.forEach(data, function(d, i) {
        if (d.id !== 0) {
          promises.push(ld.getInstruction(d.createInstructionID).then(function(f) {return f.getThread()}));
        }
      });
      return RSVP.all(promises);
    })
    .then(function(data) {
      data.unshift({id: null});
      _thread.threadCaller = data;
      return pd.getThreadsFirstCalls();
    })
    .then(function(data) {
      _thread.threadCalls = data;

      for (var i = 0, len = _thread.rawThreads.length; i < len; i++) {
        _thread.rawThreads[i]['callDuration'] = _thread.threadCalls[i].duration;
        _thread.rawThreads[i]['calledBy'] = _thread.threadCaller[i].id;
      }

      // set svg id
      svg.attr('id', _thread.profileId);

      // format data and display threads
      setRuntimeThreshold();
      nestData(_thread.rawThreads);
      updateDurationSlider();
      display();

      window.setTimeout(function() {
        // add click handler to trigger adding thread to performance view
        document.getElementById('compare-thread')
        .addEventListener('click', function() {
          viewThread();
        });

        // add click handler to re-render view on window resize
        window.addEventListener('resize', function() {
          display();
        });

        // add on-change handler to update duration slider
        document.getElementById('thread-thresh')
        .addEventListener('change', function() {
          updateDurationSlider();
          setRuntimeThreshold();
          display();
        });
      }, 1000);
    }); 

    function updateDurationSlider() {
      var value = $('#thread-thresh').val();
      _thread.thresholdFactor = value;
      _thread.selected = [];
      $('#thread-thresh-lbl').attr('title', 'Showing calls with >= ' + value + '% duration of Main'); 
      $('#thread-thresh-lbl').text(value + '%');   
    }

    function setRuntimeThreshold() {
      _thread.runtimeThreshold = Math.ceil(_thread.threadCalls[0].duration * (_thread.thresholdFactor / 100));
    }

    // nest thread data
    function nestData(data) {
      var obj = null;
      var parentId = null;

      // set object properties
      for (var i = 0, len = data.length; i < len; i++) {
        var d = data[i];
        var temp = {
          id: d.id,
          name: 'Thread ' + d.id,
          callDuration: d.callDuration,
          calledBy: d.calledBy === null ? 'Null' : 'Thread ' + d.calledBy, 
          parent: parentId,
          x: 0,
          width: 100,
          level: i
        };
        parentId = d.id;

        if (obj === null) {
          obj = temp;
          continue;
        }

        var pointer = obj;
        while (pointer !== undefined) {
          if (pointer.id === temp.parent) {
            if (pointer.hasOwnProperty('children')) {
              pointer.children.push(temp);
            } else {
              pointer['children'] = [temp];
            }
          }

          if (pointer.hasOwnProperty('children')) {
            pointer = pointer.children[0];
          } else {
            pointer = undefined;
          }
        }
      }

      _thread.viewData = obj;
    }

    // display thread view
    function display() {
      // partition view data using d3's parition layout function
      var partition = d3.layout.partition().value(function(d) {
        return 100;
      });
      var nodes = partition.nodes(_thread.viewData);

      // define scale for width values
      var widthScale = d3.scale.linear()
        .domain([0, 100])
        .range([0, _thread.svgWidth]);

      // define scale for width values to show percentage of runtime
      // domain = input, range = output
      var widthScalePercent = d3.scale.linear()
        .domain([0, _thread.threadCalls[0].duration])
        .range([0, _thread.svgWidth]);

      // define scale for x coordinate values
      var xScale = d3.scale.linear()
        .domain([0, 100])
        .range([0, 1]);

      // draw svg rect and text
      svg.selectAll('*').remove();

      svg.selectAll('rect.innerrect')
        .data(nodes)
        .enter()
        .append('rect')
        .attr('class', 'innerrect')
        .attr('stroke', 'white')
        .attr('stroke-opacity', 1)
        .attr('stroke-width', 2)
        .attr('id', function(d) {
          return 'innerrect_' + d.id;
        })
        .attr('fill', '#bbb')
        .attr('x', function(d) {
          return xScale(d.x);
        })
        .attr('width', function(d) {
          return widthScalePercent(d.callDuration);
        })
        .attr('height', function() {
          return _thread.rectHeight;
        })
        .attr('y', function(d) {
          return d.level * _thread.rectHeight;
        });

      var count = 0, levels = 0;
      var rects = svg.selectAll('rect.rect')
        .data(nodes)
        .enter()
        .append('rect')
        .attr('class', 'rect')
        .attr('stroke', 'white')
        .attr('stroke-opacity', 1)
        .attr('stroke-width', 2)
        .attr('id', function(d) {
          return 'rect_' + d.id;
        })
        .attr('fill', function(d) {
          if (d.callDuration >= _thread.runtimeThreshold) {
            return '#bbb';
          } else {
            return '#fcc';
          }
        })
        .attr('x', function(d) {
          return xScale(d.x);
        })
        .attr('width', function(d) {
          return widthScale(d.width);
        })
        .attr('height', function() {
          return _thread.rectHeight;
        })
        .attr('y', function(d) {
          // count no. of levels added
          if (levels === 0 || d.level > levels) {
            levels = d.level; count++;
          } 

          return d.level * _thread.rectHeight;
        })
        .attr('fill-opacity', 0.6)
        .on('mouseenter', function(d) {
          if (d.callDuration < _thread.runtimeThreshold) { return; }
          d3.select(this).attr('fill-opacity', 0.2);
        })
        .on('mouseleave', function(d) {
          if (d.callDuration < _thread.runtimeThreshold) { return; }
          d3.select(this).attr('fill-opacity', 0.6);
        })
        .on('click', function(d) {
          if (d.callDuration < _thread.runtimeThreshold) { return; }
          if (_thread.selected.indexOf(d.id) < 0) {
            _thread.selected.push(d.id);
            d3.select(this).attr('fill', '#4BB6D6');
          } else {
            _thread.selected.splice(_thread.selected.indexOf(d.id), 1);
            d3.select(this).attr('fill', '#bbb');
          }
        });

      rects
        .append('title')
        .text(function(d) { 
          var p = widthScalePercent(d.callDuration);
          p = p.substring(0, p.length - 1);
          return d.name + ' (' + Math.floor(p) + '%)'; 
        });

      svg.selectAll('text.text')
        .data(nodes)
        .enter()
        .append('text')
        .attr('class', 'text')
        .attr('font-family', 'Arial')
        .attr('font-size', '14px')
        .attr('fill', function(d) {
          if (d.callDuration >= _thread.runtimeThreshold) {
            return 'black';
          } else {
            return 'red';
          }
        })
        .text(function(d) { return d.name + ' (<= ' + d.calledBy + ')'; })
        .attr('id', function(d) {
          return 'text_' + d.id;
        })
        .attr('x', function(d) {
          return xScale(d.x);
        })
        .attr('y', function(d) {
          return (d.level * _thread.rectHeight) + _thread.textPadY;
        });

      _thread.viewHeight += count;
      updateViewHeight();
    }

    function newY() {
      return _thread.viewHeight * _thread.rectHeight;
    }

    function updateViewHeight() {
      var parent = document.getElementById(_thread.profileId).parentNode;
      var parentx3 = parent.parentNode.parentNode;
      var y = newY();
      
      svg.style('height', y + 'px');
      parentx3.style.height = 'inherit';
      parent.style.height = y + 'px'; 
    }

    function viewThread() {
      if (_thread.selected.length < 1) {
        return;
      }

      // gather threads to compare
      console.log('comparing ' + _thread.selected);
      var marker = [];
      for (var i = 0, len = _thread.selected.length; i < len; i++) {
        if (_thread.selected[i] === 0) {
          console.log('cannot compare with thread 0');
          continue;
        }

        var obj = {
          type: 'Thread',
          id: _thread.selected[i],
          isMarked: false
        };
        marker.push(obj);
      }
      stateManager.mark(marker);

      // clear selected items
      _thread.selected = [];
      display();
    }
  }
}
