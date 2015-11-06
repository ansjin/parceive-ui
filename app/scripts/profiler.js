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
    var profileId = Date.now(); // random ID to differentiate profiling views on DOM
    var mainDuration = null; // runtime of main function
    var mainCallId = null; // ID of main function
    var mainCallGroupId = null; 
    var runtimeThreshold = null; // minimum runtime required for children to load
    var thresholdFactor = 1; // % of runtime required for children to load
    var tracingData = {}; // data object for tracing view
    var profilingData = {}; // data object for profiling view
    var callHistory = []; // stores id's of calls that have been retrieved
    var callGroupHistory = []; // stores id's of call groups that have been retrieved
    var callQueue = []; // stores id's of calls currently being made
    var callGroupQueue = []; // stores id's of call group calls currently being made

    // return runtime data property as partition value
    var partition = d3.layout.partition()
      .value(function(d) {
        return d.duration;
      });

    // load view depending on current view mode
    function loadView() {
      var ids = (isTracing()) ? [mainCallId] : [mainCallGroupId];
      var ancestor = 'null';
      var level = 1;
      getViewData(ids, ancestor, level);
    }

    // build up the data object for tracing view
    function getViewData(ids, ancestor, level) {
      // add call ids' to callQueue
      _.map(ids, function(i) { 
        if (isTracing()) {
          callQueue.push(i);
        } else {
          callGroupQueue.push(i);
        }
      });

      var history = (isTracing()) ? callHistory : callGroupHistory;

      pdh.getViewData(ids, ancestor, level, history, viewMode)
        .then(function(data) {
          for (var i = 0, len = data.length; i < len; i++) {
            var obj = data[i];

            // skip calls that have a runtime lesser than the runtime threshold
            if (obj.duration < runtimeThreshold) {
              continue;
            }

            // build view data object
            buildViewData(obj);

            // add ID to history
            if (isTracing()) {
              callHistory.push(obj.id);
            } else {
              callGroupHistory.push(obj.id);
            }

            // call getViewData on children of obj
            if (obj.calls.length > 0) {
              getViewData(obj.calls, obj.id, level + 1);
            }

            // remove call id or call group id from queue
            if (isTracing()) {
              callQueue.splice(callQueue.indexOf(obj.id), 1);
            } else {
              callGroupQueue.splice(callGroupQueue.indexOf(obj.id), 1);
            }
          }

          // display the view when the call queue is empty
          // the call queue is empty when all data has finished loading
          if ((isTracing() && callQueue.length === 0) ||
            (!isTracing() && callGroupQueue.length === 0)) {
            displayView();
          }
        });
    }

    // add an object to the children element of tracing or profiling data
    // obj parameter can either be call or callGroup data
    function buildViewData(obj) {
      if (obj.ancestor === 'null') {
        if (isTracing()) {
          tracingData = obj;
        } else {
          // set start and end value for obj
          obj.start = 0;
          obj.end = obj.duration;

          profilingData = obj;
        }
      } else {
        if (isTracing()) {
          appendDeep(tracingData, obj);
        } else {
          appendDeep(profilingData, obj);
        }
      }
    }

    // build the profiling or tracing svg, and display it
    function displayView() {
      if (isTracing()) {
        console.log('TRACING', tracingData);
      } else {
        console.log('PROFILING', profilingData);
      }
    }

    function appendDeep(finalObj, obj) {
      var recurse = function(children, obj) {
        for (var i = 0, len = children.length; i < len; i++) {
          if (obj.ancestor === children[i].id) {
            appendData(children[i], obj);
            break;
          } else {
            // if object isn't direct child of first object
            // then recurse children till you find its parent
            recurse(children[i].children, obj);
          }
        }
      };

      var appendData = function(child, obj) {
        // if data already has the children property, then push item to array
        // otherwise create children property and add as first item
        if (child.hasOwnProperty('children') === true) {
          if (!isTracing()) {
            // update start and end value for obj
            obj.start = child.children[child.children.length - 1].start;
            obj.end = obj.start + obj.duration;
          }

          child.children.push(obj);
        } else {
          if (!isTracing()) {
            // update start and end value for obj
            obj.start = child.start;
            obj.end = obj.start + obj.duration;
          }

          child.children = [obj];
        }
      };

      // if object is direct child of first object
      if (obj.ancestor === finalObj.id) {
        appendData(finalObj, obj);
      } else {
        recurse(finalObj.children, obj);
      }
    }

    function setRuntimeThreshold(runtime) {
      runtimeThreshold = Math.ceil(runtime * (thresholdFactor / 100));
    }

    function isTracing() {
      return viewMode === 'T';
    }

    /* SETUP THE VIEW FOR LOADING */

    // give this specific view svg element an ID
    svg.attr('id', profileId);

    // get "main" function data
    pdh.getMain()
      .then(function(call) {
        mainDuration = call.duration;
        mainCallId = call.id;
        mainCallGroupId = call.callGroupID;

        // set runtime threshold
        setRuntimeThreshold(mainDuration);

        // get data for view mode and display
        loadView();
      });
  };
}
