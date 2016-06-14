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
  
}

// handle marked event
function markedCb(stateManager, data) {
  if (data.length < 1) { return; }
  
  var addThread = stateManager.getData().unsaved.addThread;
  var handleSelection = stateManager.getData().unsaved.handleSelection;
  
  for (var i = 0, len = data.length; i < len; i++) {
    var obj = data[i];
    var id = obj.id;
    var type = obj.type;
    var isNeighbour = obj.neighbour || false;
    var noShow = obj.noShow || false;

    if (isNeighbour || noShow) {
      continue;
    }

    // check if marked type is Thread
    if (type === 'Thread') {
      addThread(obj.id);
      continue;
    }

    handleSelection(id);
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
    var isNeighbour = obj.neighbour || false;
    var noShow = obj.noShow || false;

    if (isNeighbour || noShow) {
      continue;
    }

    pv.callHighlight({id: id}, svg);
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
  'pSvg',
  'LoaderService'
];

// render the view
function render(d3, po, pd, pv, ps, ld) {
  return function(svg, stateManager) {

    // hold data for tracing and profiling separately
    var _t = po.getObject(true);
    var _p = po.getObject(false);
    var isTracing = true;

    // start view in trace mode. this var basically just switches between
    // pointing to _t and _p depending on the current view mode
    var _svg;

    // set main call properties
    po.setMainData(_t, _p).then(function() {
      // initialize view data
      var promises = []
      promises.push(po.getThreadData(0, true));
      promises.push(po.getThreadData(0, false));
      return RSVP.all(promises);
    })
    .then(function(data) {
      _t.currentTop = data[0].traceData;
      _p.currentTop = data[1].profileData;

      return ld.getFunctions();
    })
    .then(function(data) {
       _.forEach(data, function(d) {
        _t.functions.push(d.id);
        _p.functions.push(d.id);
      });
      return loadData();
    })
    .then(function(data) {
      _svg = isTracing ? _t : _p;
      svg.attr('id', _svg.profileId);

      return initDisplay();
    })
    .then(function() {
      $('#thresh-lbl').attr('title', 'Showing calls with >= ' + _svg.thresholdFactor + '% duration of ' + _svg.currentTop.name); 
      $('#thresh-lbl').text(_svg.thresholdFactor + '%');
      setEventHandlers();
    });

    function getCallThread(id) {
      var promise = po.getThreadData(id, true)
      .then(function(data) {
        if (_t.currentTop === null) {
          _t.currentTop = data.traceData;
        }

        if (_t['threadData_' + id] === undefined) {
          _t['threadData_' + id] = {
            threadTop: data.traceData,
            zoomHistory: []
          };
        }

        var i, len = _t.threads.length;
        for (i = 0; i < len; i++) {
          if (_t.threads[i].threadName === 'Thread ' + id) {
            _t.threads.splice(i, 1);
            break;
          }
        }
        _t.threads.push(data);
        po.setRuntimeThreshold(_t);
        return po.loadChildren(data, data.traceData.id, 1, true, _t, id);
      });

      return promise;
    }

    function getCallGroup(id) {
      var promise = po.getThreadData(id, false)
      .then(function(data) {
        if (_p.currentTop === null) {
          _p.currentTop = data.profileData;
        }

        if (_p['threadData_' + id] === undefined) {
          _p['threadData_' + id] = {
            threadTop: data.profileData,
            zoomHistory: []
          };
        }

        var i, len = _p.threads.length;
        for (i = 0; i < len; i++) {
          if (_p.threads[i].threadName === 'Thread ' + id) {
            _p.threads.splice(i, 1);
            break;
          }
        }
        _p.threads.push(data);
        po.setRuntimeThreshold(_p);
        return po.loadChildren(data, data.profileData.id, 1, false, _p, id);
      });

      return promise;
    }

    function loadData() {
      var promises =[];

      _.forEach(_t.activeThreads, function(d) {
        promises.push(getCallThread(d));
        promises.push(getCallGroup(d));
      });

      return RSVP.all(promises);
    }

    function initDisplay() {
      return new Promise(function(resolve, reject){
        svg.selectAll('*').remove();
        _svg.viewHeight = 0;
        var promises =[];

        // some stuff to be removed later...
        var svgThreads = [];
        var threads = _svg.activeThreads.sort(function(a, b){return a-b});
        console.log(threads)
        for (var i = 0, len = threads.length; i < len; i++) {
          var obj = _.find(_svg.threads, {'threadName': 'Thread ' + threads[i]});
          svgThreads.push(obj);
        }

        _.forEach(svgThreads, function(d, i) {
          if (isTracing) {
            promises.push(ps.doTrace(svg, _svg, d, i));
          } else {
            promises.push(ps.doProfile(svg, _svg, d, i));
          }
        });

        promises.push(ps.doThreadLine(svg, _svg, 1));

        RSVP.all(promises).then(function(data) {
          // set event handlers for svg elements
          var elementType = _svg.isTracing ? 'Call' : 'CallGroup';

          svg.selectAll('text.rect_header_btn')
            .on('click', function(d) {
              removeThread(d.id);
            });

          svg
            .on('mousemove', function() {
              ps.doThreadLine(svg, _svg, event.clientX);
            });

          svg.selectAll("rect[class^='rect.call_thread_']")
            .on('mouseenter', function(d) {
              pv.callHighlight(d, svg);
              stateManager.hover([{type: elementType, id: d.id, noShow:true}]);
            })
            .on('mouseleave', function(d) {
              pv.callHighlightRemove(d, svg);
              stateManager.hover([{type: elementType, id: d.id, noShow:true}]);
            })
            .on('click', function(d) {
              pv.clickType(_svg).then(function(data) {
                if (data === 'single') {
                  handleSelection(d.id);
                  stateManager.mark([{type: elementType, id: d.id, noShow:true}]);
                } else if (data === 'double') {
                  handleZooming(d);
                }
              });
            });


          // update duration slider and set selected nodes
          pv.setSelectedNodes(_svg, svg);


          // save data objects to stateManager
          stateManager.getData().unsaved.svg = svg;
          stateManager.getData().unsaved._svg = _svg;
          stateManager.getData().unsaved._t = _t;
          stateManager.getData().unsaved._p = _p;
          stateManager.getData().unsaved.pv = pv;
          stateManager.getData().unsaved.po = po;
          stateManager.getData().unsaved.initDisplay = initDisplay;
          stateManager.getData().unsaved.addThread = addThread;
          stateManager.getData().unsaved.handleSelection = handleSelection;
        });

        resolve(true);
      });
    }

    function handleSelection(id) {
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

    function handleZooming(d) {
      var history = _svg['threadData_' + d.threadID].zoomHistory;
      var zoomOut = false;
      if (d.id === _svg.currentTop.id && _svg.mainCallId === d.id && isTracing) return;
      if (d.id === _svg.currentTop.id && _svg.mainCallGroupId === d.id && !isTracing) return;
      if (d.id === _svg.currentTop.id && history.length > 0) {
        // zoom out
        d = history.pop();
        zoomOut = true;
      }

      if (!zoomOut) {
        _svg['threadData_' + d.threadID].zoomHistory.push(_svg.currentTop);
      }

      var func = isTracing
        ? pd.getCallObj(d.id, d.ancestor, d.level, _svg.functions)
        : pd.getCallGroupObj(d.id, d.ancestor, d.level, _svg.functions);
      var promise = func
      .then(function(data) {
        _svg.currentTop = data;
        return loadData().then(function() { initDisplay(); });
      });
    }

    function updateDuration() {
      pv.updateDurationSlider(_svg);
      po.setRuntimeThreshold(_svg);
      initDisplay();
    }

    function showHideLoops() {
      pv.toggleLoop(_svg);
      initDisplay();
    }

    function toggleViewMode() {
      _svg = _svg.isTracing ? _p : _t;
      isTracing = _svg.isTracing;
      pv.toggleViewMode(_svg);
      initDisplay();
    }

    function addThread(id) {
      if (_svg.activeThreads.indexOf(id) < 0) {
        _t.activeThreads.push(id);
        _p.activeThreads.push(id);
        loadData().then(function() { initDisplay(); });
      }
    }

    function removeThread(id) {
      if (_svg.activeThreads.indexOf(id) > -1) {
        _t.activeThreads.splice(_t.activeThreads.indexOf(id), 1);
        _p.activeThreads.splice(_p.activeThreads.indexOf(id), 1);
        resetZoom();
      }
    }

    function resetZoom() {
      var func = isTracing
        ? pd.getCallObj(_svg.mainCallId, null, 1, _svg.functions)
        : pd.getCallGroupObj(_svg.mainCallGroupId, null, 1, _svg.functions);
      var promise = func
      .then(function(data) {
        _svg.currentTop = data;
        return loadData().then(function() { initDisplay(); });
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
          resetZoom();
        });

        // add click handler to toggle view modes
        document.getElementById('profiler-view-toggle')
        .addEventListener('click', function() {
          toggleViewMode();
        });

        // add on-change handler to update duration slider
        document.getElementById('profiler-thresh')
        .addEventListener('change', function() {
          updateDuration();
        });

        // add click handler to show/hide loops
        document.getElementById('profiler-loop')
        .addEventListener('click', function() {
          showHideLoops();
        });

        // add click handler to re-render view on window resize
        window.addEventListener('resize', function() {
          initDisplay();
        });
      }, 1000);
    }


    // setup the context menu
    $(function() {
      $.contextMenu({
        selector: "rect[class^='rect.call_thread_']",
        build: function(menu, e) {
          var elementType = isTracing ? 'Call' : 'CallGroup';
          var d = menu[0].__data__;
          var isSelected = _svg.selectedNodes.indexOf(d.id) > -1;
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
                  handleSelection(d.id);
                  stateManager.mark([{type: elementType, id: d.id, noShow:true}]);
                }
              }
            }
          };

          var zoomInOut = {
            // zoom in or out of element
            name: _svg.currentTop.id === d.id ? 'Zoom out' : 'Zoom in',
            callback: function() {
              handleZooming(d);
            }
          };

          var zoomToTop = {
            // reset zoom to 'main' call
            name: 'Reset Zoom',
            callback: function() {
              resetZoom();
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

          return contextMenu;
        }
      })
    });

  };
}
