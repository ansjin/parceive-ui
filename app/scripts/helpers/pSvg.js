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
      drawLoops(svg, _svg, d, index);
      updateViewHeight(svg, _svg);
      drawLine();

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

    // set current top item and generate node partitions
    var threadTop = d.threadTop
    var currentTop = _svg.currentTop;
    var viewData = _svg.isTracing ? d.traceData : d.profileData;
    var nodeData = threadTop.threadID === currentTop.threadID
        ? pv.findDeep(viewData, currentTop.id)
        : viewData;
    var nodes = _svg.partition.nodes(nodeData);

    // define scale for width values
    var widthScale = d3.scale.linear()
      .domain([0, currentTop.duration])
      .range([0, _svg.svgWidth]);

    // define scale for x coordinate values
    var xScale = d3.scale.linear()
      .domain([currentTop.start, currentTop.end])
      .range([0, _svg.svgWidth]);

    var count = 0, levels = 0;
    var rects = svg.selectAll(rectClass)
      .data(nodes.filter(function(d) {
        // only show calls with duration >= runtimethreshold and
        // duration <= duration of current top level object
        return d.duration >= _svg.runtimeThreshold
        && d.duration <= currentTop.duration;
      }))
      .enter()
      .append('rect')
      .attr('class', rectClass)
      .attr('stroke', 'white')
      .attr('stroke-opacity', 1)
      .attr('stroke-width', 2)
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

        return getYValue(_svg, d, index) + newY(_svg);
      });

    
    
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
        && rectWidth > textWidth
        && d.duration <= currentTop.duration;
      }))
      .enter()
      .append('text')
      .attr('class', textClass)
      .attr('font-family', 'Arial')
      .attr('font-size', '14px')
      .attr('fill', 'white')
      .text(function(d) { return d.name; })
      .attr('x', function(d) {
        var sliced = Number(getXValue(_svg, d, xScale).slice(0, -1));
        return Number(sliced + _svg.textPadX) + '%';
      })
      .attr('y', function(d) {
        return getYValue(_svg, d, index) + _svg.textPadY + newY(_svg);
      });

    _svg.viewHeight += count;
  }

  function drawLoops() {

  }

  function drawLine() {

  }
}