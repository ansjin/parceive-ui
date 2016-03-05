
angular
  .module('app')
  .factory('profilerSvgHelper', profilerSvgHelper);

// inject dependencies
profilerSvgHelper.$inject = ['d3', 'SizeService'];

function profilerSvgHelper(d3, size) {
  var factory = {
    drawRectSvg: drawRectSvg,
    drawRectSvgZoom: drawRectSvgZoom,
    drawTextSvg: drawTextSvg,
    drawTextSvgZoom: drawTextSvgZoom
  };

  return factory;

  function drawRectSvg(selection, nodes, v, isTracing) {
    selection
      .data(nodes)
      .enter()
      .append('rect')
      .attr('stroke', 'white')
      .attr('stroke-opacity', 1)
      .attr('stroke-width', 2)
      .attr('id', function(d) {
        return d.id;
      })
      .attr('fill', function(d) {
        return v.gradient(d.duration);
      })
      .attr('x', function(d) {
        return v.xScale(d.start);
      })
      .attr('width', function(d) {
        return v.widthScale(d.duration);
      })
      .attr('y', function(d) {
        var y = v.rectHeight * (d.level - v.adjustLevel) - v.rectHeight;
        if (d.level > v.maxLevel) { v.maxLevel = d.level; }
        if (v.showLoop && isTracing) { y += (d.loopAdjust - v.adjustLevel) * v.rectHeight; }
        if (v.zoomId !== null) { y -= v.rectHeight; }
        return y;
      })
      .attr('height', function() {
        var h = v.rectHeight;
        if (v.zoomId !== null) { h = v.rectHeight / 2; }
        return h;
      })
      .attr('fill-opacity', function() {
        var f = 1;
        if (v.zoomId !== null) { f = 0; }
        return f;
      });
  }

  function drawRectSvgZoom(selection, v, isTracing) {
    selection
      .transition()
      .duration(v.transTime)
      .ease(v.transType)
      .attr('fill-opacity', 1)
      .attr('height', function() {
        return v.rectHeight;
      })
      .attr('y', function(d) {
        var y = v.rectHeight * (d.level - v.adjustLevel) - v.rectHeight;
        if (v.showLoop && isTracing) { y += (d.loopAdjust - v.adjustLevel) * v.rectHeight; }
        return y;
      });
  }

  function drawTextSvg(selection, nodes, loopText, v, isTracing) {
    selection
      .data(nodes.filter(function(d) {
        if (loopText) {
          // only show loop text for calls with
          // loopIterationCount greater than 0
          return d.loopIterationCount > 0;
        }

        // only show text for calls with widths big enough
        // to contain the full name of the call
        var rectWidth = size.svgSizeById(d.id).width;
        var textWidth = size.svgTextSize(d.name, 14).width;
        return rectWidth > textWidth + 20;
      }))
      .enter()
      .append('text')
      .attr('id', function(d) { 
        return loopText ? 'loop_' + d.id : 'text_' + d.id;
      })
      .attr('class', function() { return loopText ? 'loop' : 'title'; })
      .attr('font-family', 'Arial')
      .attr('font-size', '14px')
      .attr('fill', function() { return loopText ? 'black' : 'white'; })
      .attr('x', function(d) {
        var old = v.xScale(d.start);
        var sliced = Number(old.slice(0, -1));
        var x = Number(sliced + v.textPadX) + '%';
        return x;
      })
      .attr('y', function(d) {
        var y = v.rectHeight * (d.level - v.adjustLevel) - v.rectHeight;
        y += v.textPadY;
        if (v.showLoop && isTracing) { 
          y += (d.loopAdjust - v.adjustLevel) * v.rectHeight;
          if (loopText) {
            y+= v.rectHeight;
          } 
        }
        if (v.zoomId !== null) { y -= 50; }
        return y;
      })
      .attr('fill-opacity', function() {
        var f = 1;
        if (v.zoomId !== null) { f = 0; }
        return f;
      })
      .text(function(d) { return loopText ? d.loopIterationCount : d.name; });
  }

  function drawTextSvgZoom(selection, loopText, v, isTracing) {
    selection
      .transition()
      .duration(v.transTime)
      .ease(v.transType)
      .attr('fill-opacity', 1)
      .attr('y', function(d) {
        var y = v.rectHeight * (d.level - v.adjustLevel) - v.rectHeight;
        if (v.showLoop && isTracing) { 
          y += (d.loopAdjust - v.adjustLevel) * v.rectHeight; 
          if (loopText) {
            y+= v.rectHeight;
          }
        }
        return y + v.textPadY;
      });
  }
}
