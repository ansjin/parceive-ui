angular
  .module('app')
  .factory('pSvg', pSvg);

// inject dependencies
pSvg.$inject = ['d3', 'SizeService', 'pView'];

function pSvg(d3, size, pv) {
  var factory = {
    doTrace: doTrace,
    doProfile: doProfile,
    doThreadLine: doThreadLine
  };

  return factory;

  function doTrace(svg, _svg, d, index) {
    return new Promise(function(resolve, reject) {
      drawHeader(svg, _svg, d);
      drawCalls(svg, _svg, d, index);
      updateViewHeight(svg, _svg);

      resolve(true);
    });
  }

  function doProfile(svg, _svg, d, index) {
    return new Promise(function(resolve, reject) {
      drawHeader(svg, _svg, d);
      drawCalls(svg, _svg, d, index);
      updateViewHeight(svg, _svg);

      resolve(true);
    });
  }

  function doThreadLine(svg, _svg, x) {
    return new Promise(function(resolve, reject) {
      svg.selectAll('line.threadLine').remove();
      var selection = svg.selectAll('line.threadLine');
      var y2 = newY(_svg);

      selection
        .data([{}])
        .enter()
        .append('line')
        .attr('class', 'threadLine')
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .attr('fill-opacity', 0.4)
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', y2);

      resolve(true);
    });
  }

  function updateViewHeight(svg, _svg) {
    var parent = document.getElementById(_svg.profileId).parentNode;
    var parentx3 = parent.parentNode.parentNode;
    var y = newY(_svg);
    
    svg.style('height', y + 'px');
    parentx3.style.height = 'inherit';
    parent.style.height = y + 'px'; 
  }

  function drawHeader(svg, _svg, d) {
    var selection = svg.selectAll('rect_header');
    var y = newY(_svg);
    var thread = Number(d.threadName.split(' ')[1]);
    var createdBy = _.result(_.find(_svg.threadCaller, 'id', thread), 'createdBy');

    selection
      .data([{}])
      .enter()
      .append('rect')
      .attr('class', 'rect_header')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('fill', 'black')
      .attr('x', 0)
      .attr('width', '100%')
      .attr('height', _svg.rectHeight)
      .attr('y', y);

    selection
      .data([{}])
      .enter()
      .append('text')
      .attr('class', 'rect_header')
      .attr('font-family', 'Arial')
      .attr('font-size', '14px')
      .attr('fill', 'white')
      .attr('x', 5)
      .attr('y', y + _svg.textPadY)
      .text(function(i) { 
        var created;
        if (createdBy === null) {
          created = ' (<= Null)';
        } else {
          created = ' (<= Thread ' + createdBy + ')'
        }
        return d.threadName + created; 
      });

    if (thread > 0) {
      selection
        .data([{id: thread}])
        .enter()
        .append('text')
        .attr('class', 'rect_header_btn')
        .attr('font-family', 'Arial')
        .attr('font-size', '14px')
        .attr('fill', 'white')
        .attr('cursor', 'pointer')
        .attr('x', function(i) {
          _svg.threadRemoveX = _svg.threadRemoveX || pv.getSvgWidth(_svg) - 100;
          return _svg.threadRemoveX;
        })
        .attr('y', y + _svg.textPadY)
        .text('[Remove]');
    }

    _svg.viewHeight++;
  }

  function newY(_svg) {
    return _svg.viewHeight * _svg.rectHeight;
  }

  function getYValue(_svg, d, isLoop) {
    var minus = _svg.currentTop.level;
    if (d.threadID !== _svg.currentTop.threadID) {
      minus = 1;
    }

    var multiplier = d.level - minus;
    var value = _svg.rectHeight * multiplier;

    if (_svg.showLoop && _svg.isTracing) {
      var adjust = d.threadID !== _svg.currentTop.threadID 
        ? d.loopAdjust : d.loopAdjust - _svg.viewLevels[_svg.currentTop.level];
      value = value + (adjust * _svg.rectHeight);
    }

    return value;
  }

  function getXValue(_svg, d, scale) {
    return scale(d.start);
  }

  function getWidthValue(_svg, d, scale) {
    return scale(d.duration);
  }

  function drawCalls(svg, _svg, d, index) {
    // set selection class
    var threadID = _svg.isTracing ? d.traceData.threadID : d.profileData.threadID;
    var rectClass = 'rect.call_thread_' + threadID;
    var textClass = 'text.call_thread_' + threadID; 
    _svg.viewLevels = d.viewLevels;

    // set current top item and generate node partitions
    var threadTop = d.threadTop
    var currentTop = _svg.currentTop;

    // define scale for width values
    var widthScale = d3.scale.linear()
      .domain([0, currentTop.duration])
      .range([0, _svg.svgWidth]);

    // define scale for x coordinate values
    var xScale = d3.scale.linear()
      .domain([currentTop.start, currentTop.end])
      .range([0, _svg.svgWidth]);

    var loopLevel, diff = 0, hasLoops = [];
    var nodeData, viewData = _svg.isTracing ? d.traceData : d.profileData;
    if (threadTop.threadID === currentTop.threadID) {
      nodeData = pv.findDeep(viewData, currentTop.id);
      loopLevel = currentTop.level;
    } else {
      nodeData = viewData;
      loopLevel = threadTop.level;
      // adjust the xscale and widthscale
    }
    var nodes = _svg.partition.nodes(nodeData);
    
    var count = 0, levels = 0;
    var rects = svg.selectAll(rectClass)
      .data(nodes.filter(function(d) {
        // only show calls with duration >= runtimethreshold and
        // duration <= duration of current top level object
        return d.duration >= _svg.runtimeThreshold; // && d.duration <= _svg.currentTop.duration
      }))
      .enter()
      .append('rect')
      .attr('class', rectClass)
      .attr('stroke', 'white')
      .attr('stroke-opacity', 1)
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .attr('height', _svg.rectHeight)
      .attr('id', function(d) {
        return 'rect_' + d.id;
      })
      .attr('fill', function(d) {
        return _svg.gradient(d.duration);
      })
      .attr('x', function(d) {
        return getXValue(_svg, d, xScale);
      })
      .attr('width', function(d) {
        return getWidthValue(_svg, d, widthScale);
      })
      .attr('y', function(d) {
        // count no. of levels added
        if (levels === 0 || d.level > levels) {
          levels = d.level; count++;
        }

        if (d.hasLoops && hasLoops.indexOf(d.level) < 0) {
          hasLoops.push(d.level);
        }
        return getYValue(_svg, d) + newY(_svg);
      });

    if (_svg.showLoop && _svg.isTracing) {
      diff = _svg.viewLevels[levels] - _svg.viewLevels[loopLevel];
      if (hasLoops.indexOf(levels) > -1) {
        diff++;
      }
      // console.log(diff, _svg.viewLevels, levels, loopLevel);
    }
    
    rects
      .append('title')
      .text(function(d) { 
        var p = widthScale(d.duration);
        p = p.substring(0, p.length - 1);
        return d.name + ' (' + Math.floor(p) + '%)'; 
      });

    var texts = svg.selectAll(textClass)
      .data(nodes.filter(function(d) {
        // only show text for calls with duration >= runtimethreshold
        // and duration <= duration of current top level object
        // and widths big enough to contain the full name of the call
        if (document.getElementById('rect_' + d.id) == null) {
          return false;
        }

        var rectWidth = size.svgSizeById('rect_' + d.id).width;
        var textPad = 20; // left and right padding
        var textWidth = size.svgTextSize(d.name, 14).width + textPad;
        return d.duration >= _svg.runtimeThreshold 
        && rectWidth > textWidth; //&& d.duration <= currentTop.duration;
      }))
      .enter()
      .append('text')
      .attr('class', textClass)
      .attr('font-family', 'Arial')
      .attr('font-size', '14px')
      .attr('fill', 'white')
      .text(function(d) { return d.name; })
      .attr('x', function(d) {
        // if (d.start < _svg.currentTop.start) {
        //   d = _svg.currentTop;
        // }
        var sliced = Number(getXValue(_svg, d, xScale).slice(0, -1));
        return Number(sliced + _svg.textPadX) + '%';
      })
      .attr('y', function(d) {
        return getYValue(_svg, d) + _svg.textPadY + newY(_svg);
      });

    // draw loop svg elements
    if (_svg.showLoop && _svg.isTracing) {
      _.forEach(nodes, function(obj, i) {
        if (obj.loopData.length > 0) {

          // loop lines
        var loopLineClass = 'line.loop_thread_' + threadID;
        var loopline = svg.selectAll(loopLineClass)
          .data(obj.loopData.filter(function(d) {
            // only show loop for calls with loopIterationCount greater than 0
            // and loop duration >= current threshold and
            // loop duration <= the duration of current top level object
            return d.loopIterationCount > 0 
            && d.loopDuration >= _svg.runtimeThreshold;
          }))
          .enter()
          .append('line')
          .attr('class', loopLineClass)
          .attr('stroke', function(d) {
            return _svg.gradient(d.loopDuration);
          })
          .attr('stroke-width', 4)
          .attr('id', function(d) { return 'loopline_' + obj.id; })
          .attr('x1', function(d) {
            return xScale(d.loopStart);
          })
          .attr('x2', function(d) {
            return xScale(d.loopEnd);
          })
          .attr('y1', function(d) {
            return getYValue(_svg, obj) + newY(_svg) + _svg.rectHeight + Math.floor(_svg.rectHeight / 2);
          })
          .attr('y2', function(d) {
            return getYValue(_svg, obj) + newY(_svg) + _svg.rectHeight + Math.floor(_svg.rectHeight / 2);
          });

        loopline
          .append('title')
          .text(function(d) { 
            return d.loopIterationCount + ' loop iteration(s)'; 
          });

        // loop iteration count text
        var loopTextClass = 'text.loop_thread_' + threadID;
        var loopText = svg.selectAll(loopTextClass)
          .data(obj.loopData.filter(function(d) {
            // only show loop text for calls with duration >= runtimethreshold
            // and duration <= duration of current top level object
            // and loop line widths big enough to contain the iteration count text
            if (document.getElementById('loopline_' + obj.id) == null) {
              return false;
            }

            var loopWidth = size.svgSizeById('loopline_' + obj.id).width;
            var textPad = 20; // left and right padding
            var textWidth = size.svgTextSize(d.loopIterationCount, 14).width + textPad;
            return d.loopIterationCount > 0 
            && d.loopDuration >= _svg.runtimeThreshold 
            && loopWidth > textWidth;
          }))
          .enter()
          .append('text')
          .attr('id', function(d) { return 'looptext_' + obj.id; })
          .attr('class', loopTextClass + ', line')
          .attr('font-family', 'Arial')
          .attr('font-size', '14px')
          .attr('fill', 'black')
          .text(function(d) { return d.loopIterationCount; })
          .attr('x', function(d) {
            var sliced = Number(xScale(Math.floor(d.loopStart + d.loopEnd) / 2).slice(0, -1));
            var pad = _svg.textPadX * d.loopIterationCount.toString().length;
            return Number(sliced - pad) + '%';
          })
          .attr('y', function(d) {
            return getYValue(_svg, obj) + newY(_svg) + _svg.rectHeight + _svg.textPadY;
          });

        // loop rounded ends
        var loopEndClass = 'circle.loop_thread_' + threadID;
        var loopEndLeft = svg.selectAll(loopEndClass)
          .data(obj.loopData.filter(function(d) {
            // only show loop for calls with loopIterationCount greater than 0
            // and loop duration >= current threshold
            return d.loopIterationCount > 0 
            && d.loopDuration >= _svg.runtimeThreshold;
          }))
          .enter()
          .append('circle')
          .attr('class', loopEndClass)
          .attr('id', function(d) { return 'loopendleft_' + obj.id; })
          .attr('fill', function(d) { return _svg.gradient(d.loopDuration); })
          .attr('cx', function(d) { return xScale(d.loopStart); })
          .attr('cy', function(d) { 
            return getYValue(_svg, obj) + newY(_svg) + _svg.rectHeight + Math.floor(_svg.rectHeight / 2);
          })
          .attr('r', 4);

        loopEndLeft
          .append('title')
          .text(function(d) { 
            return d.loopIterationCount + ' loop iteration(s)'; 
          });

        var loopEndRight = svg.selectAll(loopEndClass)
          .data(obj.loopData.filter(function(d) {
            // only show loop for calls with loopIterationCount greater than 0
            // and loop duration >= current threshold
            return d.loopIterationCount > 0 
            && d.loopDuration >= _svg.runtimeThreshold;
          }))
          .enter()
          .append('circle')
          .attr('class', loopEndClass)
          .attr('id', function(d) { return 'loopendright_' + obj.id; })
          .attr('fill', function(d) { return _svg.gradient(d.loopDuration); })
          .attr('cx', function(d) { return xScale(d.loopEnd); })
          .attr('cy', function(d) { 
            return getYValue(_svg, obj) + newY(_svg) + _svg.rectHeight + Math.floor(_svg.rectHeight / 2);
          })
          .attr('r', 4);

        loopEndRight
          .append('title')
          .text(function(d) { 
            return d.loopIterationCount + ' loop iteration(s)'; 
          });

        // loop small circles (for when the loop duration is super tiny)
        var loopSmallClass = 'circle.loop_small_thread_' + threadID;
        var loopSmall = svg.selectAll(loopSmallClass)
          .data(obj.loopData.filter(function(d) {
            // only show loop for calls with loopIterationCount greater than 0
            // and loop duration < current threshold
            if (document.getElementById('rect_' + obj.id) == null) {
              return false;
            }

            return d.loopIterationCount > 0 
            && d.loopDuration < _svg.runtimeThreshold;
          }))
          .enter()
          .append('circle')
          .attr('class', 'small')
          .attr('id', function(d) { return 'loopsmall_' + obj.id; })
          .attr('fill', function(d) { return _svg.gradient(d.loopDuration); })
          .attr('cx', function(d) { 
            return xScale(Math.floor((d.loopStart + d.loopEnd) / 2)); 
          })
          .attr('cy', function(d) { 
            return  getYValue(_svg, obj) + newY(_svg) + _svg.rectHeight + Math.floor(_svg.rectHeight / 2);
          })
          .attr('r', 4);

        loopSmall
          .append('title')
          .text(function(d) { 
            return d.loopIterationCount + ' loop iteration(s)'; 
          });
        }
      });
    }

    _svg.viewHeight += count + diff;
  }
}