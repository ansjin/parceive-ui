/* global $, window, document, console */

angular
  .module('profile-view', ['app'])
  .value('name', 'Profile view')
  .value('group', 'Profile views')
  .value('focusCb', focusCb)
  .value('markedCb', markedCb)
  .value('hoverCb', hoverCb)
  .value('spotCb', spotCb)
  .service('render', render);

// handle focus event
function focusCb(stateManager, data) {
  if (data.length < 1) { return; }
  
  var svg = stateManager.getData().unsaved.svg;
  var pv = stateManager.getData().unsaved.pv;
  var po = stateManager.getData().unsaved.po;
  var initDisplay = stateManager.getData().unsaved.initDisplay;
  
  for (var i = 0, len = data.length; i < len; i++) {
    // var obj = data[i];
    // var id = obj.id;
    // var type = obj.type;
    // var _svg = obj.data || {};
    // var d = pv.findDeep(_svg.viewData, id);
    // var isNeighbour = obj.neighbour;

    // if (isNeighbour) {
    //   continue;
    // }

    // // item not loaded in the profiler viewData
    // // probably a child node with duration too small
    // // or is in viewData but not on svg
    // if (!d.hasOwnProperty('id') && pv.isVisible(d, type, _svg, svg)) { 
    //   continue; 
    // }

    
  }
}

// handle marked event
function markedCb(stateManager, data) {
  if (data.length < 1) { return; }
  
  var svg = stateManager.getData().unsaved.svg;
  var pv = stateManager.getData().unsaved.pv;
  var viewData = stateManager.getData().unsaved.viewData;
  
  for (var i = 0, len = data.length; i < len; i++) {
    var obj = data[i];
    var id = obj.id;
    var type = obj.type;
    var isMarked = obj.isMarked;
    var isNeighbour = obj.neighbour;
    var _svg = obj.data || viewData;

    if (isNeighbour) {
      continue;
    }

    // check if marked type is Thread
    if (type === 'Thread') {
      console.log(pv.findDeepThread(_svg, id));
      continue;
    }

    var d = pv.findDeep(_svg.viewData, id);

    // item not loaded in the profiler viewData
    // probably a child node with duration too small
    // or is in viewData but not on svg
    if (!d.hasOwnProperty('id') && pv.isVisible(d, type, _svg, svg)) { 
      continue; 
    }

    if (_svg.selectedNodes.indexOf(id) < 0) {
      // select node
      _svg.selectedNodes.push(id);
      pv.setSelectedNodes(_svg, svg);
    } else {
      // deselect node
      _svg.selectedNodes.splice(_svg.selectedNodes.indexOf(id), 1);
      pv.resetSelectedNode(id, _svg, svg);
    }
  }
}

// handle hover event
function hoverCb(stateManager, data) {
  if (data.length < 1) { return; }

  var svg = stateManager.getData().unsaved.svg;
  var pv = stateManager.getData().unsaved.pv;

  for (var i = 0, len = data.length; i < len; i++) {
    var obj = data[i];
    var id = obj.id;
    var type = obj.type;
    var isNeighbour = obj.neighbour;

    // if (isNeighbour) {
    //   continue;
    // }

    // var _svg = obj.data || {};
    
  }
}

// handle spot event
function spotCb(stateManager, data) {
  
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
      // console.log('init', _svg);
    }, function(err) { console.log(err); });

    function initDisplay() {
      return new Promise(function(resolve, reject) {
        
        // if (_svg.isTracing) {
        //   _svg.viewData = pv.findDeepThread(_svg.viewData, 0);
        // }
        
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
            var elementType = _svg.isTracing ? 'Call' : 'CallGroup';

            // call elements
            svg.selectAll('rect.rect, text.rect')
              .on('click', function(d) { 
                 pv.clickType(_svg).then(function(data) {
                  // handle single click
                  if (data === 'single') {
                    // broadcast mark
                    var isSelected = pv.isSelected(d, svg);
                    stateManager.mark([{type: elementType, id: d.id, isMarked: isSelected, data:_svg}]);
                  }

                  // handle double click
                  if (data === 'double') {
                    // broadcast focus
                    // stateManager.focus([{type: elementType, id: d.id, data:_svg}]);
                    focus(d.id);
                  }
                 });
              })
              .on('mouseenter', function(d) {
                // broadcast hover
                // stateManager.hover([{type: elementType, id: d.id, data:_svg}]);
                hover(d.id, elementType);
              })
              .on('mouseleave', function(d) {
                // broadcast hover
                // stateManager.hover([{type: elementType, id: d.id, data:_svg}]);
                hover(d.id, elementType);
              });

            // loop elements
            svg.selectAll('line.loop, circle.loop, circle.small, text.line')
              .on('mouseenter', function(d) {
                // broadcast hover
                // stateManager.hover([{type: 'Loop', id: d.id, data:_svg}]); 
                hover(d.id, 'Loop');
              })
              .on('mouseleave', function(d) {
                // broadcast hover
                // stateManager.hover([{type: 'Loop', id: d.id, data:_svg}]); 
                hover(d.id, 'Loop');
              });

            resolve(true);
          });
        })
        .then(function() {
          pv.updateDurationSlider(_svg);
          pv.setSelectedNodes(_svg, svg);

          // save data objects to stateManager so external functions like hoverCb, 
          // markCb can access the same object (its data and functions). 
          stateManager.getData().unsaved.svg = svg;
          stateManager.getData().unsaved.pv = pv;
          stateManager.getData().unsaved.po = po;
          stateManager.getData().unsaved.initDisplay = initDisplay;
          stateManager.getData().unsaved.viewData = _svg.viewData;

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
        // document.getElementById('profiler-reset')
        // .addEventListener('click', function() {
        //   resetZoom();
        // });

        // // add click handler to toggle view modes
        // document.getElementById('profiler-view-toggle')
        // .addEventListener('click', function() {
        //   toggleViewMode();
        // });

        // // add on-change handler to update duration slider
        // document.getElementById('profiler-thresh')
        // .addEventListener('change', function() {
        //   updateDuration();
        // });

        // // add click handler to show/hide loops
        // document.getElementById('profiler-loop')
        // .addEventListener('click', function() {
        //   showHideLoops();
        // });

        // add click handler to re-render view on window resize
        window.addEventListener('resize', function() {
          initDisplay();
        });
      }, 1000);
    }

    function hover(id, type) {
      var d = pv.findDeep(_svg.viewData, id);

      if (type === 'Loop') {
        // hover for loops
        if (pv.isHovered(d, 'Loop', _svg, svg)) {
          pv.loopHighlightRemove(d, svg);
          pv.removeTooltip();
        } else {
          pv.loopHighlight(d, svg);
          pv.loopTooltip(d, _svg, svg);
        }
      } else {
        // hover for calls and callgroups
        if (pv.isHovered(d, 'Call', _svg, svg)) {
          pv.callHighlightRemove(d, svg);
          pv.removeTooltip();
        } else {
          pv.callHighlight(d, svg);
          pv.callTooltip(d, _svg, svg);
        }
      }
    }

    function focus(id) {
      var d = pv.findDeep(_svg.viewData, id);
      if (id === _svg.currentTop.id) {
        // zoom out
        if ((id === _svg.mainCallId && type === 'Call') ||
           (id === _svg.mainCallGroupId && type === 'CallGroup') ||
           _svg.zoomHistory.length < 1) {
          // already zoomed out to the max
          return;
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

    // toggle view mode
    function toggleViewMode() {
      _svg = _svg.isTracing ? _p : _t;
      pv.toggleViewMode(_svg);
      initDisplay();
    }

    // show/hide loops
    function showHideLoops() {
      pv.toggleLoop(_svg);
      initDisplay();
    }

    // update duration with slider value
    function updateDuration() {
      pv.updateDurationSlider(_svg);
      po.setRuntimeThreshold(_svg);
      initDisplay();
    }

    // reset zoom to main
    function resetZoom() {
      var elementType = _svg.isTracing ? 'Call' : 'CallGroup';
      var id = _svg.isTracing ? _svg.mainCallId : _svg.mainCallGroupId;
      // stateManager.focus([{type: elementType, id: id}]);
      focus(id);
    }

    // spot selected calls/callgroups
    function spotData(d) {
       var elementType = _svg.isTracing ? 'Call' : 'CallGroup';
       stateManager.spot([{type: elementType, id: d.id, data:_svg.selectedNodes}]);
    }

    // setup the context menu
    $(function() {
      $.contextMenu({
        selector: 'rect.rect, text.rect, line.loop, circle.loop, circle.small, text.line',
        build: function(menu, e) {
          var elementType = _svg.isTracing ? 'Call' : 'CallGroup';
          var d = menu[0].__data__;
          var isSelected = pv.isSelected(d, svg);
          var menuWidth = 200;
          var svgWidthPixels = pv.getSvgWidth(_svg);

          var contextMenu = {
            position: function(opt) {
              var x = e.clientX;
              var y = e.clientY;

              // show tooltip to the left of the mouse if there is not
              // enough space for it to appear on the right
              if (menuWidth > svgWidthPixels - x) {
                x = x - menuWidth;
              }

              opt.$menu.css({
                top: y + 'px' ,
                left: x + 'px'
              });
            },

            items: {
              // mark or unmark element
              'mark_unmark': {
                name: isSelected ? 'UnMark' : 'Mark',
                callback: function() {
                  stateManager.mark([{type: elementType, id: d.id, isMarked: isSelected, data:_svg}]);
                }
              },

              // switch to profiling or tracing mode
              'switch_view_mode': {
                name: _svg.isTracing ? 'Show Profiling' : 'Show Tracing',
                callback: function() {
                  toggleViewMode();
                }
              }
            }
          };

          var zoomInOut = {
            // zoom in or out of element
            name: _svg.currentTop.id === d.id ? 'Zoom out' : 'Zoom in',
            callback: function() {
              // stateManager.focus([{type: elementType, id: d.id, data:_svg}]);
              focus(d.id);
            }
          };

          var zoomToTop = {
            // reset zoom to 'main' call
            name: 'Reset Zoom',
            callback: function() {
              resetZoom();
            }
          };

          var showLoops = {
            // show or hide loops on svg
            name: _svg.showLoop ? 'Hide Loops' : 'Show Loops',
            callback: function() {
              showHideLoops();
            }
          };

          var spotting = {
            // spot selected calls/callgroups
            name: (_svg.isTracing) ? 'Spot Calls' : 'Spot Callgroups',
            callback: function() {
              spotData(d);
            }
          };

          // add reset zoom if 'main' is not currently the
          // top level element
          if (_svg.currentTop.id !== _svg.mainCallId
            && _svg.currentTop.id !== _svg.mainCallGroupId) {
            contextMenu.items.reset_zoom = zoomToTop;
          }

          // add zoom in or out if the current element is not
          // top level (ie. main)
          if (d.id !== _svg.mainCallId && d.id !== _svg.mainCallGroupId) {
            contextMenu.items.zoom_in_out = zoomInOut;
          }

          // add show/hide loops to context menu if in tracing mode
          if (_svg.isTracing) {
            contextMenu.items.show_hide_loops = showLoops;
          }

          // enable call/callgroup spotting if there is more than 
          // 1 selected item
          if (_svg.selectedNodes.length > 1) {
            contextMenu.items.spot_data = spotting;
          }

          return contextMenu;
        }
      })
    });

  };
}
