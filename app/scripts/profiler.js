/* global $, window, document, console */

angular
  .module('profile-view', ['app'])
  .value('name', 'Profile view')
  .value('group', 'Profile views')
  .value('focusCb', focusCb)
  .value('markedCb', markedCb)
  .value('hoverCb', hoverCb)
  .service('render', render);

// handle focus event
function focusCb(stateManager, data) {
  if (data.length < 1) { return; }
  
  var _svg = stateManager.getData().unsaved._svg;
  var pv = stateManager.getData().unsaved.pv;
  var po = stateManager.getData().unsaved.po;
  var initDisplay = stateManager.getData().unsaved.initDisplay;
  
  for (var i = 0, len = data.length; i < len; i++) {
    var obj = data[i];
    var id = obj.id;
    var type = obj.type;
    var d = pv.findDeep(_svg.viewData, id);

    // item not loaded in the profiler viewData
    // probably a child node with duration too small
    // or is in viewData but not on svg
    if (!d.hasOwnProperty('id') && pv.isVisible(d, type, _svg)) { 
      continue; 
    }

    if (id === _svg.currentTop.id) {
      // zoom out
      if ((id === _svg.mainCallId && type === 'Call') ||
         (id === _svg.mainCallGroupId && type === 'CallGroup') ||
         _svg.zoomHistory.length < 1) {
        // already zoomed out to the max
        continue;
      }

      // get last item in history stack
      var prev = _svg.zoomHistory.pop();
      _svg.currentTop = prev;
      d = prev;
    } else {
      // zoom in
      _svg.zoomHistory.push(_svg.currentTop);
      _svg.currentTop = d;
    }

    po.setRuntimeThreshold(_svg);
    po.loadChildren(_svg, d.id, d.level)
    .then(function() {
      initDisplay();
    });
  }
}

// handle marked event
function markedCb(stateManager, data) {
  if (data.length < 1) { return; }
  
  var _svg = stateManager.getData().unsaved._svg;
  var pv = stateManager.getData().unsaved.pv;
  
  for (var i = 0, len = data.length; i < len; i++) {
    var obj = data[i];
    var id = obj.id;
    var type = obj.type;
    var isMarked = obj.isMarked;
    var d = pv.findDeep(_svg.viewData, id);

    // item not loaded in the profiler viewData
    // probably a child node with duration too small
    // or is in viewData but not on svg
    if (!d.hasOwnProperty('id') && pv.isVisible(d, type, _svg)) { 
      continue; 
    }

    if (_svg.selectedNodes.indexOf(id) < 0) {
      // select node
      _svg.selectedNodes.push(id);
      pv.setSelectedNodes(_svg);
    } else {
      // deselect node
      _svg.selectedNodes.splice(_svg.selectedNodes.indexOf(id), 1);
      pv.resetSelectedNode(id, _svg);
    }
  }
}

// handle hover event
function hoverCb(stateManager, data) {
  if (data.length < 1) { return; }

  var _svg = stateManager.getData().unsaved._svg;
  var pv = stateManager.getData().unsaved.pv;

  for (var i = 0, len = data.length; i < len; i++) {
    var obj = data[i];
    var id = obj.id;
    var type = obj.type;
    var d = pv.findDeep(_svg.viewData, id);

    // item not loaded in the profiler viewData
    // probably a child node with duration too small
    // or is in viewData but not on svg
    if (!d.hasOwnProperty('id') && pv.isVisible(d, type, _svg)) { 
      continue; 
    }

    if (type === 'Loop') {
      // hover for loops
      if (pv.isHovered(d, 'Loop', _svg)) {
        pv.loopHighlightRemove(d);
        pv.removeTooltip(d);
      } else {
        pv.loopHighlight(d);
        pv.loopTooltip(d, _svg);
      }
    } else {
      // hover for calls and callgroups
      if (pv.isHovered(d, 'Call', _svg)) {
        pv.callHighlightRemove(d);
        pv.removeTooltip(d);
      } else {
        pv.callHighlight(d);
        pv.callTooltip(d, _svg);
      }
    }
  }
}

// inject view dependencies
render.$inject = [
  'd3',
  'pObject',
  'pData',
  'pView',
  'pSvg'
];

// render the view
function render(d3, po, pd, pv, ps) {
  return function(svg, stateManager) {

    // hold data for tracing and profiling separately
    var _t = po.getObject(true);
    var _p = po.getObject(false);

    // start view in trace mode. this var basically just switches between
    // pointing to the _trace object and the _profile object depending on the 
    // current view mode
    var _svg = _t;

    // set main call properties
    po.setMainData(_t, _p)
    .then(function() {
      // set svg id
      svg.attr('id', _svg.profileId);

      // initialize view data for calls and callgroups
      return po.initViewData(_t, _p);
    })
    .then(function(data) {
      // load children for calls that meet the duration criteria
      return po.loadChildren(_t, _t.mainCallId, 1);
    })
    .then(function() {
      // load children for callgroups that meet the duration criteria
      return po.loadChildren(_p, _p.mainCallGroupId, 1);
    })
    .then(function() {
      return initDisplay();
    })
    .then(function() {
      setEventHandlers();
      console.log('init', _svg);
    });

    function initDisplay() {
      return new Promise(function(resolve, reject) {
        // partition the viewData so it can be used by D3 partition layout
        // and set the scale function for x and width
        pv.setNodes(_svg, svg.selectAll('*'))
        .then(function() {
          // draw the call boxes on the svg
          return ps.drawRect(_svg, svg.selectAll('rect.rect'));
        })
        .then(function() {
          // draw the call text (title) on the svg
          return ps.drawRectText(_svg, svg.selectAll('text.rect'));
        })
        .then(function() {
          // draw the call loop lines on the svg
          return ps.drawLoop(_svg, svg.selectAll('line.loop'));
        })
        .then(function() {
          // draw the call loop line rounded ends
          return ps.drawLoopEnd(_svg, svg.selectAll('circle.loop'));
        })
        .then(function() {
          // draw the call loop text (loop execution count)
          return ps.drawLoopText(_svg, svg.selectAll('text.line'));
        })
        .then(function() {
          // draw a small circle for loop executions that are too small
          // compared to runtime, that showing a line for them would
          // not be appropriate. We signify them with a small dot.
          return ps.drawLoopTooSmall(_svg, svg.selectAll('circle.small'));
        })
        .then(function() {
          // set event handlers for svg elements
          return new Promise(function(resolve, reject) {
            var hoverType = _svg.isTracing ? 'Call' : 'CallGroup';

            // call elements
            svg.selectAll('rect.rect, text.rect')
              .on('click', function(d) { 
                 pv.clickType(_svg).then(function(data) {
                  // handle single click
                  if (data === 'single') {
                    // broadcast mark
                    var isSelected = pv.isSelected(d);
                    stateManager.mark([{type: hoverType, id: d.id, isMarked: isSelected}]);
                  }

                  // handle double click
                  if (data === 'double') {
                    // broadcast focus
                    stateManager.focus([{type: hoverType, id: d.id}]);
                  }
                 });
              })
              .on('mouseenter', function(d) {
                // broadcast hover
                stateManager.hover([{type: hoverType, id: d.id}]);
              })
              .on('mouseleave', function(d) {
                // broadcast hover
                stateManager.hover([{type: hoverType, id: d.id}]);
              });

            // loop elements
            svg.selectAll('line.loop, circle.loop, circle.small, text.line')
              .on('mouseenter', function(d) {
                // broadcast hover
                stateManager.hover([{type: 'Loop', id: d.id}]); 
              })
              .on('mouseleave', function(d) {
                // broadcast hover
                stateManager.hover([{type: 'Loop', id: d.id}]); 
              });

            resolve(true);
          });
        })
        .then(function() {
          // set selected nodes if any
          pv.setSelectedNodes(_svg);
          resolve(true);
        });
      });
    }

    // set input elements (buttons, sliders) to carry out specific
    // view related functions. since the DOM is not ready immediately,
    // set a 1 second delay before attaching the event handlers
    function setEventHandlers() {
      window.setTimeout(function() {
        // add click handler to zoom view to top
        document.getElementById('profiler-reset')
        .addEventListener('click', function() {
          
        });

        // add click handler to toggle view modes
        document.getElementById('profiler-view-toggle')
        .addEventListener('click', function() {
          _svg = _svg.isTracing ? _p : _t;
          pv.toggleViewMode(_svg);
          initDisplay();
        });

        // add on-change handler to update duration slider
        document.getElementById('profiler-thresh')
        .addEventListener('change', function() {
          pv.updateDurationSlider(_svg);
          po.setRuntimeThreshold(_svg);
          initDisplay();
        });

        // add click handler to show/hide loops
        document.getElementById('profiler-loop')
        .addEventListener('click', function() {
          pv.toggleLoop(_svg);
          initDisplay();
        });

        // add click handler to re-render view on window resize
        window.addEventListener('resize', function() {
          initDisplay();
        });
      }, 1000);
    }

    // save data objects to stateManager so external functions like hoverCb, 
    // markCb can access the same object (its data and functions). 
    stateManager.getData().unsaved._svg = _svg;
    stateManager.getData().unsaved.pv = pv;
    stateManager.getData().unsaved.po = po;
    stateManager.getData().unsaved.initDisplay = initDisplay;

  };
}