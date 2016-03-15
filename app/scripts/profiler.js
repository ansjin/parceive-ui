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
  'profilerSvgHelper',
  'SizeService',
  'GradientService',
  'LoaderService'
];

// render the view
function render(d3, pdh, pvh, pvar, psh, size, grad, ld) {
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

    function isTracing() { return v.viewMode === 'T'; }

    function showHideLoopBtn() {
      var text = isTracing() ? '' : 'hide';
      document.getElementById('profiler-loop').className = text;
    }

    function toggleLoop() {
      // change loop visibility
      v.showLoop = v.showLoop ? false : true;

      pvar.initZoomVars(v, isTracing());
      reload();

      // update loop button
      var text = v.showLoop ? 'Hide' : 'Show';
      $('#profiler-loop').text(text + ' Loops');
    }

    function updateTimer() {
      var value = document.getElementById('profiler-thresh').value;
      v.thresholdFactor = value;
      reload();
    }

    function toggleViewMode() {
      pvar.initZoomVars(v, isTracing());

      // change view mode
      v.viewMode = v.viewMode === 'T' ? 'P' : 'T';

      reload();

      // update toggle button
      var state = !isTracing() ? 'Tracing' : 'Profiling';
      $('#profiler-view-toggle').text('Switch to ' + state);

      // show/hide loop button
      showHideLoopBtn();
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
          pvh.buildViewData(data, v, isTracing());
          loadChildren(id, level);
        });
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
            if (pvh.checkCallHistory(d.id, v, isTracing())) {
              pvh.buildViewData(d, v, isTracing());
              pvh.addCallHistory(d.id, v, isTracing());
            }
          });

          // update the display
          displayView();
        }, function(err) { console.log(err); });
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
      psh.drawRectSvg(svg.selectAll('rect'), nodes, v, isTracing());
      psh.drawTextSvg(svg.selectAll('text.title'), nodes, false, v, isTracing());

      if (v.showLoop && isTracing()) {
        psh.drawLoopLineSvg(svg.selectAll('line.loopline'), nodes, v);
        psh.drawLoopCircle(svg.selectAll('circle.end'), nodes, v);
        psh.drawTextSvg(svg.selectAll('text.loop'), nodes, true, v, isTracing());
      }

      // if we are zooming a node to top
      if (v.zoomId !== null) {
        psh.drawRectSvgZoom(svg.selectAll('rect'), v, isTracing());
        psh.drawTextSvgZoom(svg.selectAll('text.title'), false, v, isTracing());
        if (v.showLoop && isTracing()) {
          psh.drawTextSvgZoom(svg.selectAll('text.loop'), true, v, isTracing());
        }
      }

      // set event handlers for elements
      svgClickHander(svg.selectAll('rect, text.title'));
      loopClickHander(svg.selectAll('line.loopline, text.loop'));

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

    function loopClickHander(selection) {
      selection
        .on('click', selectLoop)
        .on('mouseenter', loopTooltip)
        .on('mouseleave', removeLoopTooltip);
    }

    function selectLoop(d) {
      console.log('send select event to CCT view');
    }

    function loopMenu(d) {
      console.log('loop menu');
    }

    function loopTooltip(d) {
      d3.select('#loopline_'+d.id).attr('stroke-opacity', 0.5);
      d3.select('.c1'+d.id).attr('fill-opacity', 0.5);
      d3.select('.c2'+d.id).attr('fill-opacity', 0.5);
      var duration = (d.loopDuration / v.mainDuration * 100).toFixed(2) + ' %';
      var name = 'Loop iterations: ' + d.loopIterationCount;
      addTooltip(name, duration);
    }

    function removeLoopTooltip(d) {
      d3.select('#loopline_' + d.id).attr('stroke-opacity', 1);
      d3.select('.c1'+d.id).attr('fill-opacity', 1);
      d3.select('.c2'+d.id).attr('fill-opacity', 1);
      d3.select('#tooltip').classed('hidden', true);
    }

    function addTooltip(name, duration) {
      var x = d3.event.pageX;
      var y = d3.event.pageY;
      var svgWidthPixels = size.svgSizeById(v.profileId).width;
      var tooltipPadding = 20;
      var tooltipWidth = _.max([
        v.minTooltipWidth,
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

    function highlightNode(d) {
      // reduce opacity of selected call
      d3.select(this).attr('fill-opacity', 0.5);

      var duration = (d.duration / v.mainDuration * 100).toFixed(2) + ' %';
      var name = d.name;
      addTooltip(name, duration);

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

      document.getElementById('profiler-thresh')
      .addEventListener('change', function() {
        updateTimer();
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
