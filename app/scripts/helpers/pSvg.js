angular
  .module('app')
  .factory('pSvg', pSvg);

// inject dependencies
pSvg.$inject = ['d3', 'SizeService', 'pView'];

function pSvg(d3, size, pv) {
  var factory = {
    doTrace: doTrace,
    doProfile: doProfile
  };

  return factory;

  function doTrace(svg, _svg, d, index) {
    return new Promise(function(resolve, reject) {
      drawHeader(svg, _svg, d);
      drawCalls(svg, _svg, d, index);
      if (_svg.isTracing) {
        drawLoops(svg, _svg, d, index);
      }
      updateViewHeight(svg, _svg);

      resolve(true);
    });
  }

  function doProfile(svg, _svg) {
    return new Promise(function(resolve, reject) {
      drawCalls(svg, _svg);
      updateViewHeight(svg, _svg);

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
    var selection = svg.selectAll('rect.header_' + d.id);
    var y = newY(_svg);

    selection
      .data([{}])
      .enter()
      .append('rect')
      .attr('class', 'rect.header_' + d.id)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('fill', 'grey')
      .attr('x', 0)
      .attr('width', '100%')
      .attr('height', _svg.rectHeight)
      .attr('y', y);

    selection
      .data([{}])
      .enter()
      .append('text')
      .attr('class', 'header')
      .attr('font-family', 'Arial')
      .attr('font-size', '14px')
      .attr('fill', 'white')
      .attr('x', 5)
      .attr('y', y + _svg.textPadY)
      .text(d.threadName);

    _svg.viewHeight++;
  }

  function newY(_svg) {
    return _svg.viewHeight * _svg.rectHeight;
  }

  function getYValue(_svg, d, index, isLoop) {
    var multiplier = d.level - _svg.currentTop.level;
    if (_svg.showLoop && _svg.isTracing) {
      multiplier += (d.loopAdjust - _svg.currentTop.loopAdjust);
    }
    var value = _svg.rectHeight * multiplier;
    if (isLoop) {
      value = value + 44;
      // console.log(d, _svg.viewLevels);
      // value = value + (_svg.viewLevels[d.level + 1] * _svg.rectHeight);
    }
    return value + newY(_svg);
  }

  function getXValue(_svg, d, scale) {
    return scale(d.start);
  }

  function getWidthValue(_svg, d, scale) {
    return scale(d.duration);
  }

  function drawCalls(svg, _svg, d, index) {
    // set selection class
    var rectClass = _svg.isTracing
      ? 'rect.call_thread_' + d.traceData.id : 'rect.call';
    var textClass = _svg.isTracing
      ? 'text.call_thread_' + d.traceData.id : 'text.call';   
    var selectionRect = svg.selectAll(rectClass);
    var selectionText = svg.selectAll(textClass);

    // set current top item and generate node partitions
    var nodes, threadTop, currentTop = _svg.currentTop;
    if (_svg.isTracing) {
      threadTop = d.threadTop;
      var nodeData = threadTop.threadID === currentTop.threadID
        ? pv.findDeep(d.traceData, currentTop.id)
        : d.traceData;
      nodes = _svg.partition.nodes(nodeData);
    } else {
      nodes = _svg.partition.nodes(pv.findDeep(_svg.profileData, currentTop.id));
    }

    console.log(nodes)

    // define scale for width values
    var widthScale = d3.scale.linear()
      .domain([0, currentTop.duration])
      .range([0, _svg.svgWidth]);

    // define scale for x coordinate values
    var xScale = d3.scale.linear()
      .domain([currentTop.start, currentTop.end])
      .range([0, _svg.svgWidth]);

    // width and x scale, and also partitioned nodes
    // take note of starting y cooordinate
    // take note of x value and width value (should be 0 and 100% respectively in target cases)

    var count = 0, levels = 0;
    selectionRect
      .data(nodes.filter(function(d) {
        // only show calls with duration >= runtimethreshold and
        // duration <= duration of current top level object
        return d.duration >= _svg.runtimeThreshold
        && d.duration <= currentTop.duration; // && d.threadID == 0;
      }))
      .enter()
      .append('rect')
      .attr('class', rectClass)
      .attr('stroke', 'white')
      .attr('stroke-opacity', 1)
      .attr('stroke-width', 2)
      .attr('height', _svg.rectHeight)
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

        return getYValue(_svg, d, index) - _svg.rectHeight;
      })
      .attr('fill-opacity', 0)

      // add animation effect
      .transition()
      .duration(_svg.transTime)
      .ease(_svg.transType)
      .attr('y', function(d) {
        return getYValue(_svg, d, index);
      })
      .attr('fill-opacity', 1);

    _svg.viewHeight += count;
  }

  function drawLoops() {

  }
}