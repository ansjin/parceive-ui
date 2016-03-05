/* global $, window, document, console */

angular
  .module('profile-view', ['app'])
  .value('name', 'Profile view')
  .value('group', 'Profile views')
  .value('markedCb', markedCb)
  .value('focusCb', focusCb)
  .value('hoverCb', hoverCb)
  .service('render', render);

// handle marked event
function markedCb() {

}

// handle focus event
function focusCb() {

}

// handle hover event
function hoverCb() {

}

// inject view dependencies
render.$inject = [
  'd3',
  'profilerDataHelper',
  'profilerViewHelper',
  'profilerVarHelper',
  'SizeService',
  'GradientService',
  'LoaderService'
];

// render the view
function render(d3, pdh, pvh, pvar, size, grad, ld) {
  return function(svg, stateManager) {
    var v = pvar.initVar();

    function init() {
      // get "main" function data
      pdh.getMain().then(function(call) {
        v.mainDuration = call.duration;
        v.mainCallId = call.id;
        v.mainCallGroupId = call.callGroupID;
        loadView();
      });
    }

    function setRuntimeThreshold(runtime) {
      v.runtimeThreshold = Math.ceil(runtime * (v.thresholdFactor / 100));
    }

    function isTracing() {
      return v.viewMode === 'T';
    }

    function showHideLoopBtn() {
      var text = isTracing() ? '' : 'hide';
      document.getElementById('profiler-loop').className = text;
    }

    function toggleLoop() {
      // change loop visibility
      v.showLoop = v.showLoop ? false : true;

      initZoomVars();
      reload();

      // update loop button
      var text = v.showLoop ? 'Hide' : 'Show';
      $('#profiler-loop').text(text + ' Loops');
    }

    function toggleViewMode() {
      initZoomVars();

      // change view mode
      v.viewMode = v.viewMode === 'T' ? 'P' : 'T';

      reload();

      // update toggle button
      var state = !isTracing() ? 'Tracing' : 'Profiling';
      $('#profiler-view-toggle').text('Switch to ' + state);

      // show/hide loop button
      showHideLoopBtn();
    }

    function initZoomVars() {
      // store some variables for use when returning back to the 
      // view we are toggling out of
      if (isTracing()) {
        v.zoomTracingId = v.zoomId;
        v.zoomTracingHistory = v.zoomHistory;
        v.zoomTracingAdjustment = v.adjustLevel;
        v.zoomTracingMaxLevel = v.maxLevel;
      } else {
        v.zoomProfilingId = v.zoomId;
        v.zoomProfilingHistory = v.zoomHistory;
        v.zoomProfilingAdjustment = v.adjustLevel;
        v.zoomProfilingMaxLevel = v.maxLevel;
      }
    }

    function reload() {
      // set values for variables used in view we are toggling into
      // if the variables had a previously saved value, retrieve them.
      if (isTracing()) {
        v.zoomId = v.zoomTracingId === null ? v.mainCallId : v.zoomTracingId;
        v.zoomHistory = v.zoomTracingHistory.length === 0 ? [] : v.zoomTracingHistory;
        v.adjustLevel = v.zoomTracingAdjustment > 0 ? v.zoomTracingAdjustment : 0;
        v.maxLevel = v.zoomTracingMaxLevel > 1 ? v.zoomTracingMaxLevel : 1;

        if (v.initTracingMode) {
          displayView();
        } else {
          v.zoomId = null;
          loadView();
          v.initTracingMode = true;
        }
      } else {
        v.zoomId = v.zoomProfilingId === null ? v.mainCallGroupId : v.zoomProfilingId;
        v.zoomHistory = v.zoomProfilingHistory.length === 0 ? [] : v.zoomProfilingHistory;
        v.adjustLevel = v.zoomProfilingAdjustment > 0 ? v.zoomProfilingAdjustment : 0;
        v.maxLevel = v.zoomProfilingMaxLevel > 1 ? v.zoomProfilingMaxLevel : 1;

        if (v.initProfilingMode) {
          displayView();
        } else {
          v.zoomId = null;
          loadView();
          v.initProfilingMode = true;
        }
      }
    }

    // load view depending on current view mode
    function loadView() {
      var id = isTracing() ? v.mainCallId : v.mainCallGroupId;
      var ancestor = 'null';
      var level = 1;
      
      setRuntimeThreshold(v.mainDuration);
      var func = isTracing()
        ? pdh.getCallObj(id, ancestor, level)
        : pdh.getCallGroupObj(id, ancestor, level);
      
      func
        .then(function(data) {
          buildViewData(data);
          loadChildren(id, level);
        });
    }

    function checkCallHistory(id) {
      // return true if call id is not in call history
      var history = isTracing() ? v.callHistory : v.callGroupHistory;
      return history.indexOf(id) === -1;
    }

    function addCallHistory(id) {
      if (isTracing()) {
        v.callHistory.push(id);
      } else {
        v.callGroupHistory.push(id);
      }
    }

    function loadChildren(id, level) {
      var parent;
      var func = isTracing()
        ? pdh.getCall(id)
        : pdh.getCallGroup(id);

      func
        .then(function(call) {
          parent = call;
          return pdh.getRecursive(call, isTracing(), v.runtimeThreshold, level)
        })
        .then(function(data) {
          _.forEach(data, function(d) {
            if (checkCallHistory(d.id)) {
              buildViewData(d);
              addCallHistory(d.id);
            }
          });

          // update the display
          displayView();
        }, function(err) { console.log(err); });
    }

    // add an object to the children element of tracing or profiling data
    // obj parameter can either be call or callGroup data
    function buildViewData(obj) {
      if (obj.ancestor === 'null') {
        if (isTracing()) {
          v.tracingData = obj;
        } else {
          obj.start = 0;
          obj.end = obj.duration;
          v.profilingData = obj;
        }
      } else {
        if (isTracing()) {
          pvh.appendDeep(v.tracingData, obj, isTracing());
        } else {
          pvh.appendDeep(v.profilingData, obj, isTracing());
        }
      }
    }

    // build the profiling or tracing svg, and display it
    function displayView() {
      if (v.showLoop && isTracing()) {
        pvh.addLoopProperties(v.tracingData);
      }

      // initialize some view variables if uninitialized
      if (v.initView === false) {
        v.initView = true;
        v.profileId = Date.now();
        svg.attr('id', v.profileId);
        v.svgElem = document.getElementById(v.profileId);
        v.svgParentElem = document.getElementById(v.profileId).parentNode;
        v.gradient = grad.gradient(0, v.mainDuration);
        v.partition = d3.layout.partition().value(function(d) {
          return d.duration;
        });
      }

      if (v.zoomId !== null) {
        // if we're zooming, retrieve zoomed sub section of view data
        v.viewData = isTracing() ?
        pvh.findDeep(v.tracingData, v.zoomId) : pvh.findDeep(v.profilingData, v.zoomId);
      } else {
        v.viewData = isTracing() ? v.tracingData : v.profilingData;
      }

      console.log(v.viewData);

      // partition view data using d3's parition layout function
      var nodes = v.partition.nodes(v.viewData);

      // define scale for width values
      v.widthScale = d3.scale.linear()
        .domain([0, nodes[0].duration])
        .range([0, v.svgWidth]);

      // define scale for x coordinate values
      v.xScale = d3.scale.linear()
        .domain([nodes[0].start, nodes[0].end])
        .range([0, v.svgWidth]);

      // remove any child elements of svg
      svg.selectAll('*').remove();

      // draw rect svg elements using data
      drawRectSvg(svg.selectAll('rect'), nodes);

      // draw text svg elements using data
      drawTextSvg(svg.selectAll('text.title'), nodes, false);

      if (v.showLoop && isTracing()) {
        // draw loop iteration count
        drawTextSvg(svg.selectAll('text.loop'), nodes, true);
      }

      // set click/dblClick handlers for rect and text
      svgClickHander(svg.selectAll('rect, text.title'));

      // adjust svg height, so scrollbars appear if any
      // var newSvgHeight = rectHeight * (maxLevel - adjustLevel);
      // svg.style('height', newSvgHeight + 'px');

      // if we are zooming a node to top
      if (v.zoomId !== null) {
        drawRectSvgZoom(svg.selectAll('rect'));
        drawTextSvgZoom(svg.selectAll('text.title'), false);
        if (v.showLoop && isTracing()) {
          drawTextSvgZoom(svg.selectAll('text.loop'), true);
        }
      }

      // highlight selected nodes if any are present
      if (isTracing()) {
        if (v.selectedTracingNodes.length > 0) {
          displaySelectedNodes(svg.selectAll('rect'));
        }
      } else {
        if (v.selectedProfilingNodes.length > 0) {
          displaySelectedNodes(svg.selectAll('rect'));
        }
      }
    }

    function svgClickHander(selection) {
      selection
        .on('click', selectNode)
        .on('mouseenter', highlightNode)
        .on('mouseleave', removeNodeHighlight);
    }

    function highlightNode(d) {
      // reduce opacity of selected call
      d3.select(this).attr('fill-opacity', 0.5);

      var x = d3.event.pageX;
      var y = d3.event.pageY;
      var duration = d.duration / v.mainDuration * 100;
      var svgWidthPixels = size.svgSizeById(v.profileId).width;
      var tooltipPadding = 20;
      var tooltipWidth = _.max([
        v.minTooltipWidth,
        size.textSize(d.name, 14).width
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
        .text(d.name + ' - lvl:' + d.level + ' - adj:' + d.loopAdjust + ' - iter:' + d.loopIterationCount);
      tooltip
        .select('#value')
        .text(duration.toFixed(2) + ' %');

      // show the tooltip
      tooltip.classed('hidden', false);

      // broadcast hover action through state manager
      var hoverType = isTracing() ? 'Call' : 'CallGroup';
      stateManager.hover([{type: hoverType, id: d.id}]);
    }

    function removeNodeHighlight() {
      // set selected call's opacity back to 100%
      d3.select(this).attr('fill-opacity', 1);

      // hide the tooltip
      d3.select('#tooltip').classed('hidden', true);
    }

    function selectNode(d) {
      v.clickThis = this;
      v.clickData = d;
      v.clickCount++;

      // evaluate click count after defined time
      window.setTimeout(function() {
        // for two clicks, zoom to node
        if (v.clickCount === 2) {
          zoom(v.clickData);
        }

        // for one click, select node
        if (v.clickCount === 1) {
          setSelectedNodes(v.clickData, v.clickThis);
        }

        // reset click counter
        v.clickCount = 0;
      }, 300);
    }

    function setSelectedNodes(d, obj) {
      var node;
      var rectSelect = d3.select(obj);
      var selectedNodes = isTracing() ?
      v.selectedTracingNodes : v.selectedProfilingNodes;

      if (!rectSelect.empty()) {
        if (rectSelect.attr('prev-color') === null) {
          var currentColor = rectSelect.attr('fill');
          rectSelect
            .attr('prev-color', currentColor)
            .attr('fill', 'grey')
            .attr('fill-opacity', 0.8);

          // add node to selection
          node = _.findWhere(selectedNodes, {id: d.id});
          if (node === undefined) {
            if (isTracing()) {
              v.selectedTracingNodes.push({
                type: 'Call',
                id: d.id,
                isMarked: true
              });
            } else {
              v.selectedProfilingNodes.push({
                type: 'CallGroup',
                id: d.id,
                isMarked: true
              });
            }
          }
        } else {
          var prevColor = rectSelect.attr('prev-color');
          rectSelect.attr('prev-color', null);
          rectSelect.attr('fill', prevColor);

          // remove node from selection
          node = _.findWhere(selectedNodes, {id: d.id});
          if (node !== undefined) {
            if (isTracing()) {
              v.selectedTracingNodes.splice(selectedNodes.indexOf(node), 1);
            } else {
              v.selectedProfilingNodes.splice(selectedNodes.indexOf(node), 1);
            }
          }
        }
      }
    }

    function displaySelectedNodes(selection) {
      var selectedNodes = isTracing() ?
      v.selectedTracingNodes : v.selectedProfilingNodes;

      selection
        .each(function(d) {
          var selected = d3.select(this);
          for (var i = 0, len = selectedNodes.length; i < len; i++) {
            var node = selectedNodes[i];
            if (node.id === d.id) {
              var currentColor = selected.attr('fill');
              selected
                .attr('prev-color', currentColor)
                .attr('fill', 'grey')
                .attr('fill-opacity', 0.8);
            }
          }
        });
    }

    function drawRectSvg(selection, nodes) {
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
          if (v.showLoop && isTracing()) { y += (d.loopAdjust - v.adjustLevel) * v.rectHeight; }
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

    function drawRectSvgZoom(selection) {
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
          if (v.showLoop && isTracing()) { y += (d.loopAdjust - v.adjustLevel) * v.rectHeight; }
          return y;
        });
    }

    function drawTextSvg(selection, nodes, loopText) {
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
          if (v.showLoop && isTracing()) { 
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

    function drawTextSvgZoom(selection, loopText) {
      selection
        .transition()
        .duration(v.transTime)
        .ease(v.transType)
        .attr('fill-opacity', 1)
        .attr('y', function(d) {
          var y = v.rectHeight * (d.level - v.adjustLevel) - v.rectHeight;
          if (v.showLoop && isTracing()) { 
            y += (d.loopAdjust - v.adjustLevel) * v.rectHeight; 
            if (loopText) {
              y+= v.rectHeight;
            }
          }
          return y + v.textPadY;
        });
    }

    function zoom(d) {
      // clicking on current top level node
      // zoom to previous parent level
      if (v.zoomId === d.id) {
        v.zoomHistory.pop();

        if (v.zoomHistory.length > 0) {
          zoomToLevel(v.zoomHistory[v.zoomHistory.length - 1], false);
        } else {
          zoomToTop();
        }
        return;
      }

      // zoom to new child level
      zoomToLevel(d, true);

      // save parent level (previous location) to zoom history
      v.zoomHistory.push({
        level: d.level,
        id: d.id,
        duration: d.duration,
        name: d.name
      });
    }

    function zoomToLevel(d, loadNodeChildren) {
      v.adjustLevel = d.level - 1;
      v.zoomId = d.id;
      setRuntimeThreshold(d.duration);
      displayView();

      if (loadNodeChildren) {
        loadChildren(d.id, d.level);
      }
    }

    function zoomToTop() {
      v.adjustLevel = 0;
      v.zoomId = isTracing() ? v.mainCallId : v.mainCallGroupId;
      v.zoomHistory = [];
      v.maxLevel = 1;
      setRuntimeThreshold(v.mainDuration);
      displayView();
    }

    window.setTimeout(function() {
      // add click handler to zoom view to top
      document.getElementById('profiler-reset')
      .addEventListener('click', function() {
        zoomToTop();
      });

      // add click handler to toggle view modes
      document.getElementById('profiler-view-toggle')
      .addEventListener('click', function() {
        toggleViewMode();
      });

      // add click handler to show/hide loops
      document.getElementById('profiler-loop')
      .addEventListener('click', function() {
        toggleLoop();
      });
      showHideLoopBtn();

      // add click handler to re-render view on window resize
      window.addEventListener('resize', function() {
        displayView();
      });
    }, 1000);

    // start the view
    init();
  };
}
