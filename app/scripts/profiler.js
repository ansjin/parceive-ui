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
    var obj = data[i];
    var id = obj.id;
    var type = obj.type;
    var _svg = obj.data || {};
    var d = pv.findDeep(_svg.viewData, id);
    var isNeighbour = obj.neighbour;

    if (isNeighbour) {
      continue;
    }

    // item not loaded in the profiler viewData
    // probably a child node with duration too small
    // or is in viewData but not on svg
    if (!d.hasOwnProperty('id') && pv.isVisible(d, type, _svg, svg)) { 
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

    if (isNeighbour) {
      continue;
    }

    var _svg = obj.data || {};
    var d = pv.findDeep(_svg.viewData, id);

    // item not loaded in the profiler viewData
    // probably a child node with duration too small
    // or is in viewData but not on svg
    if (!d.hasOwnProperty('id') && pv.isVisible(d, type, _svg, svg)) { 
      continue; 
    }

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
    var isTracing = true;

    // start view in trace mode. this var basically just switches between
    // pointing to _t and _p depending on the current view mode
    var _svg;

    // set main call properties
    po.setMainData(_t, _p).then(function() {
      // initialize view data
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

        var i, len = _t.threads.length;
        for (i = 0; i < len; i++) {
          if (_t.threads[i].threadName === 'Thread ' + id) {
            _t.threads.splice(i, 1);
            break;
          }
        }
        _t.threads.push(data);
        po.setRuntimeThreshold(_t);
        return po.loadChildren(data, data.traceData.id, 1, true, _t.runtimeThreshold, id);
      });

      return promise;
    }

    function getCallGroup(id) {
      var promise = po.getThreadData(id, false)
      .then(function(data) {
        if (_p.currentTop === null) {
          _p.currentTop = data.profileData;
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
        return po.loadChildren(data, data.profileData.id, 1, false, _p.runtimeThreshold, id);
      });

      return promise;
    }

    function loadData() {
      var promises =[];

      _.forEach(_t.activeThreads, function(d) {
        if (isTracing) {
          promises.push(getCallThread(d));
        } else {
          promises.push(getCallGroup(d));
        }
      });

      return RSVP.all(promises);
    }

    function initDisplay() {
      return new Promise(function(resolve, reject){
        svg.selectAll('*').remove();
        _svg.viewHeight = 0;

        var promises =[];
        var sort = isTracing ? 'traceData.threadID' : 'profileData.threadID';
        _svg.threads = _.sortByOrder(_svg.threads, [sort], [true]);
        _.forEach(_svg.threads, function(d, i) {
          if (isTracing) {
            promises.push(ps.doTrace(svg, _svg, d, i));
          } else {
            promises.push(ps.doProfile(svg, _svg, d, i));
          }
        });

        RSVP.all(promises).then(function(data) {
          // set event handlers for svg elements


          // update duration slider and set selected nodes


          // save data objects to stateManager
          stateManager.getData().unsaved.svg = svg;
          stateManager.getData().unsaved._svg = _svg;
          stateManager.getData().unsaved._t = _t;
          stateManager.getData().unsaved._p = _p;
          stateManager.getData().unsaved.pv = pv;
          stateManager.getData().unsaved.po = po;
          stateManager.getData().unsaved.initDisplay = initDisplay;
        });

        resolve(true);
      });
    }

    function focusItem() {
      // set runtimethreshold
      // set current top
      loadData().then(function() {
        initDisplay();
      });
    }

    function selectItem() {

    }

    function hoverItem() {

    }

    function updateDuration() {
      pv.updateDurationSlider(_svg);
      po.setRuntimeThreshold(_svg);
      initDisplay();
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

  };
}
