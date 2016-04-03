// everything that has to do with functions caried out on the view

angular
  .module('app')
  .factory('pView', pView);

// inject dependencies
pView.$inject = ['d3', 'SizeService'];

function pView(d3, size) {
  var factory = {
    setNodes: setNodes,
    findDeep: findDeep,
    callHighlight: callHighlight,
    callHighlightRemove: callHighlightRemove,
    callTooltip: callTooltip,
    loopHighlight: loopHighlight,
    loopHighlightRemove: loopHighlightRemove,
    loopTooltip: loopTooltip,
    removeTooltip: removeTooltip,
    isHovered: isHovered,
    isVisible: isVisible,
    isSelected: isSelected,
    clickType: clickType,
    setSelectedNodes: setSelectedNodes,
    resetSelectedNode: resetSelectedNode,
    toggleLoop: toggleLoop,
    toggleViewMode: toggleViewMode,
    updateDurationSlider: updateDurationSlider
  };

  return factory;

  function setNodes(_svg, selection) {
    return new Promise(function(resolve, reject) {
      selection.remove();

      // partition view data using d3's parition layout function
      _svg.nodes = _svg.partition.nodes(findDeep(_svg.viewData, _svg.currentTop.id));
      
      // define scale for width values
      _svg.widthScale = d3.scale.linear()
        .domain([0, _svg.nodes[0].duration])
        .range([0, _svg.svgWidth]);

      // define scale for x coordinate values
      _svg.xScale = d3.scale.linear()
        .domain([_svg.nodes[0].start, _svg.nodes[0].end])
        .range([0, _svg.svgWidth]);

      resolve(true);
    });
  }

  function findDeep(obj, id) {
    var val = {};

    function recurse(children, id) {
      for (var i = children.length - 1; i >= 0; i--) {
        if (children[i].id === id) {
          val = children[i];
        }
        if (children[i].hasOwnProperty('children') === true) {
          recurse(children[i].children, id);
        }
      }
    }

    if (obj.id === id) {
      val = obj;
    } else {
      recurse(obj.children, id);
    }

    return val;
  }

  function addTooltip(name, duration, _svg) {
    var x = d3.event.pageX;
    var y = d3.event.pageY;
    var svgWidthPixels = size.svgSizeById(_svg.profileId).width;
    var tooltipPadding = 20;
    var tooltipWidth = _.max([
      _svg.minTooltipWidth,
      size.textSize(name, 14).width
    ]);

    // show tooltip to the left of the mouse if there is not
    // enough space for it to appear on the right
    if (tooltipWidth + tooltipPadding > svgWidthPixels - x) {
      x = x - (tooltipWidth + tooltipPadding);
    }

    // update the tooltip position and value
    var tooltip = d3.select('#tooltip')
      .style('left', x  + 'px')
      .style('top', y + 'px')
      .style('width', tooltipWidth + 'px');
    tooltip
      .select('#title')
      .text(name);
    tooltip
      .select('#value')
      .text(duration);

    // show the tooltip
    tooltip.classed('hidden', false);
  }

  function callHighlight(d) {
    d3.select('#rect_' + d.id).attr('fill-opacity', 0.5);
    d3.select('#text_' + d.id).attr('fill-opacity', 0.5);    
  }

  function callHighlightRemove(d) {
    d3.select('#rect_' + d.id).attr('fill-opacity', 1);
    d3.select('#text_' + d.id).attr('fill-opacity', 1);
  }

  function callTooltip(d, _svg) {
    var duration = (d.duration / _svg.mainDuration * 100).toFixed(2) + ' %';
    addTooltip(d.name, duration, _svg);
  }

  function loopHighlight(d) {
    d3.select('#loopline_' + d.id).attr('stroke-opacity', 0.5);
    d3.select('#looptext_' + d.id).attr('fill-opacity', 0.5);
    d3.select('#loopsmall_' + d.id).attr('fill-opacity', 0.5);
    d3.select('#loopendright_'+ d.id).attr('fill-opacity', 0.5);
    d3.select('#loopendleft_'+ d.id).attr('fill-opacity', 0.5);
  }

  function loopHighlightRemove(d) {
    d3.select('#loopline_' + d.id).attr('stroke-opacity', 1);
    d3.select('#looptext_' + d.id).attr('fill-opacity', 1);
    d3.select('#loopsmall_' + d.id).attr('fill-opacity', 1);
    d3.select('#loopendright_'+ d.id).attr('fill-opacity', 1);
    d3.select('#loopendleft_'+ d.id).attr('fill-opacity', 1);
  }

  function loopTooltip(d, _svg) {
    var duration = (d.loopDuration / _svg.mainDuration * 100).toFixed(2) + ' %';
    addTooltip('Loop iterations: ' + d.loopIterationCount, duration, _svg);
  }

  function removeTooltip(d) {
    d3.select('#tooltip').classed('hidden', true);
  }

  function isHovered(d, type, _svg) {
    if (type === 'Loop') {
      // check if loop is minimized loop
      if (d.loopDuration < _svg.runtimeThreshold) {
        return d3.select('#loopsmall_' + d.id).attr('fill-opacity') == 0.5;
      }

      return d3.select('#loopline_' + d.id).attr('stroke-opacity') == 0.5;
    } else {
      return d3.select('#rect_' + d.id).attr('fill-opacity') == 0.5;
    }
  }

  function isSelected(d) {
    return d3.select('#rect_' + d.id).attr('fill') == 'grey';
  }

  function isVisible(d, type, _svg) {
    if (type === 'Loop') {
      // check if loop is minimized loop
      if (d.loopDuration < _svg.runtimeThreshold) {
        return d3.select('#loopsmall_' + d.id).empty();
      }

      return d3.select('#loopline_' + d.id).empty();
    } else {
      return d3.select('#rect_' + d.id).empty();
    }
  }

  function clickType(_svg) {
    _svg.clickCount++;

    return new Promise(function(resolve, reject) {
      // evaluate click count after defined time
      window.setTimeout(function() {
        var type = null; 

        if (_svg.clickCount === 2) {
          type = 'double';
        }

        if (_svg.clickCount === 1) {
          type = 'single';
        }

        _svg.clickCount = 0;
        resolve(type);
      }, 300);
    });
  }

  function setSelectedNodes(_svg) {
    _.forEach(_svg.selectedNodes, function(id) {
      d3.select('#rect_' + id).attr('fill', 'grey');
    });
  }

  function resetSelectedNode(id, _svg) {
    var d = d3.select('#rect_' + id)[0][0].__data__;
    d3.select('#rect_' + id).attr('fill', _svg.gradient(d.duration));
  }

  function toggleLoop(_svg) {
    _svg.showLoop = _svg.showLoop ? false : true;

    // update loop button
    var text = _svg.showLoop ? 'Hide' : 'Show';
    $('#profiler-loop').text(text + ' Loops');
  }

  function toggleViewMode(_svg) {
    // update toggle button
    var state = !_svg.isTracing ? 'Tracing' : 'Profiling';
    $('#profiler-view-toggle').text('Switch to ' + state);

    // show/hide toggle loop button
    var value = _svg.isTracing ? 'inline-block' : 'none';
    $('#profiler-loop').css('display', value);

    // update duration slider
    $('#profiler-thresh').val(_svg.thresholdFactor);
    updateDurationSlider(_svg);
  }

  function updateDurationSlider(_svg) {
    var value = $('#profiler-thresh').val();
    _svg.thresholdFactor = value;
    $('#thresh-lbl').attr('title', 'Showing calls with >= ' + value + '% duration of ' + _svg.currentTop.name); 
    $('#thresh-lbl').text(value + '%');   
  }
}