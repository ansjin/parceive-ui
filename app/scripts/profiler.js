/* global $ */
/* global window */
/* global document */
/* global console */

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
render.$inject = ['d3', 'profilerDataHelper', 'profilerViewHelper'];

// render the view
function render(d3, pdh, pvh) {
  return function(svg, stateManager) {
    var viewMode = 'P'; // valid values T = tracing, P = profiling
    var mainDuration = null; // runtime of main function
    var mainCallId = null; // ID of main function
    var mainCallGroupId = null; // callGroup ID of main
    var runtimeThreshold = null; // minimum runtime required for children to load
    var thresholdFactor = 1; // % of runtime required for children to load
    var tracingData = {}; // data object for tracing view
    var profilingData = {}; // data object for profiling view
    var callHistory = []; // stores id's of calls that have been retrieved
    var callGroupHistory = []; // stores id's of call groups that have been retrieved
    var rectHeight = 22; // height of the bars in the profiler
    var textPadY = 15; // top padding for the text svg
    var textPadX = 0.5; // left padding for the text svg
    var adjustLevel = 0; // stores level -1 of bar at the top position of the profiler
    var transTime = 600; // transition time for appending a bar to profiler
    var transType = 'elastic'; // type of append transition
    var maxLevel = 1; // current highest level of bars on the profiler
    var svgElem = null; // reference to svg element
    var svgParentElem = null; // reference to svg's parent element
    var profileId = null; // random ID to differentiate profiling views on DOM
    var initView = false; // flag to check if view has been initialized before
    var partition = d3.layout.partition().value(function(d) {
      return d.duration; // return duration data property as partition value
    });

    function init() {
      // get "main" function data
      pdh.getMain().then(function(call) {
        mainDuration = call.duration;
        mainCallId = call.id;
        mainCallGroupId = call.callGroupID;
        setRuntimeThreshold(mainDuration);
        loadView();
      });
    }

    // load view depending on current view mode
    function loadView() {
      var ids = (isTracing()) ? [mainCallId] : [mainCallGroupId];
      var ancestor = 'null';
      var level = 1;
      getViewData(ids, ancestor, level);
    }

    function getViewData(ids, ancestor, level) {
      // add call ids' to history
      if (isTracing()) {
        callHistory = _.union(callHistory, ids);
      } else {
        callGroupHistory = _.union(callGroupHistory, ids);
      }

      // get remote data
      pdh.getViewData(ids, ancestor, level, viewMode)
        .then(function(data) {
          for (var i = 0, len = data.length; i < len; i++) {
            var obj = data[i];

            // skip calls with runtime lesser than runtimeThreshold
            if (obj.duration < runtimeThreshold) {
              continue;
            }

            buildViewData(obj);

            // call getViewData on children of obj
            var children = [];
            var history = isTracing() ? callHistory : callGroupHistory;
            _.map(obj.calls, function(x) {
              if (history.indexOf(x) === -1) {
                children.push(x);
              }
            });

            if (children.length > 0) {
              getViewData(children, obj.id, level + 1);
            }      
          }
          
          displayView();
        });
    }

    // add an object to the children element of tracing or profiling data
    // obj parameter can either be call or callGroup data
    function buildViewData(obj) {
      if (obj.ancestor === 'null') {
        if (isTracing()) {
          tracingData = obj;
        } else {
          obj.start = 0;
          obj.end = obj.duration;
          profilingData = obj;
        }
      } else {
        if (isTracing()) {
          pvh.appendDeep(tracingData, obj, isTracing());
        } else {
          pvh.appendDeep(profilingData, obj, isTracing());
        }
      }
    }

    // build the profiling or tracing svg, and display it
    function displayView() {
      // make a deep copy of tracing or profiling data
      var viewData = isTracing() 
        ? $.extend(true, {}, tracingData) 
        : $.extend(true, {}, profilingData);
      var nodes = partition.nodes(viewData);

      // initialize some view variables
      if (initView === false) {
        initView = true;
        profileId = Date.now();
        svg.attr('id', profileId);
        svgElem = document.getElementById(profileId);
        svgParentElem = document.getElementById(profileId).parentNode;
      }

      if (svgElem.scrollHeight > svgParentElem.clientHeight) {
        width = '98%';
      }

      console.log(viewData);
    }

    function setRuntimeThreshold(runtime) {
      runtimeThreshold = Math.ceil(runtime * (thresholdFactor / 100));
    }

    function isTracing() {
      return viewMode === 'T';
    }

    init();
  };
}
