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
function render(d3, profilerDataHelper, profilerViewHelper) {
  return function(svg, stateManager) {

    var viewMode = 'T'; // valid values T = tracing, P = profiling
    var profileId = Date.now(); // random ID to differentiate profiling views on DOM
    var mainRuntime = null; // runtime of main function
    var mainId = null; // ID of main function
    var runtimeThreshold = null; // minimum runtime required for children to load
    var thresholdFactor = 1; // % of runtime required for children to load
    var tracingData = {}; // data object for tracing view
    var profilingData = {}; // data object for profiling view
    var callHistory = []; // stores id's of calls that have been retrieved
    var CallGroupHistory = []; // stores id's of call groups that have been retrieved

    // return runtime data property as partition value
    var partition = d3.layout.partition()
      .value(function(d) {
        return d.runtime;
      });

    // load view depending on current view mode
    function loadView() {
      var ids = [mainId];
      var ancestor = 'null';
      var level = 1;

      if (viewMode === 'T') {
        loadTracingView(ids, ancestor, level);
      } else {
        loadProfilingView(ids, ancestor, level);
      }
    }

    // build up the data object for tracing view
    function loadTracingView(ids, ancestor, level) {
      profilerDataHelper.getTracingData(ids, ancestor, level, callHistory)
        .then(function(data) {
          // add call ID to call history
          for (var i = 0, len = ids.length; i < len; i++) {
            callHistory.push(ids[i]);
          }

          for (var i = 0, len = data.length; i < len; i++) {
            var call = data[i];

            // skip calls that have a runtime lesser than the runtime threshold
            if (call.runtime < runtimeThreshold) {
              continue;
            }

            // use call to build tracing data object
            buildDataObject(call);

            // call loadTracingView on children of this call
            if (call.calls.length > 0) {
              loadTracingView(call.calls, call.callId, level + 1, callHistory);
            }
          }
        });
    }

    // build up the data object for profiling view
    function loadProfilingView(ids, ancestor, level) {

    }

    // add an object to the children element of tracing or profiling data
    function buildDataObject(obj) {
      // obj can either be call or callGroup data

      if (viewMode === 'T') {
        // add the call to tracingData

        // if the object is first object
        if (obj.ancestor === 'null') {
          tracingData = obj;
          return;
        }

        appendDeep(tracingData, obj);

        console.log('TRACING DATA', tracingData);
      } else {
        // add the call to profilingData

        if (obj.ancestor === 'null') {
          profilingData = obj;
          return;
        }

        appendDeep(profilingData, obj);
      }
    }

    function appendDeep(finalObj, obj) {
      var recurse = function(children, obj) {
        for (var i = 0, len = children.length; i < len; i++) {
          var id = children[i].callId;

          if (viewMode !== 'T') {
            id = children[i].callGroupId;
          }

          if (obj.ancestor === id) {
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
          child.children.push(obj);
        } else {
          child.children = [obj];
        }
      };

      // if object is direct child of first object
      var id = (viewMode === 'T') ? finalObj.callId : finalObj.callGroupId;
      if (obj.ancestor === finalObj.callId) {
        appendData(finalObj, obj);
      } else {
        recurse(finalObj.children, obj);
      }
    }

    function setRuntimeThreshold(runtime) {
      runtimeThreshold = Math.ceil(runtime * (thresholdFactor / 100));
    }

    /* SETUP THE VIEW FOR LOADING */

    // give this specific view svg element an ID
    svg.attr('id', profileId);

    // get "main" function data
    profilerDataHelper.getMain()
      .then(function(call) {
        mainRuntime = Number(call.end) - Number(call.start);
        mainId = call.id;

        // set runtime threshold
        setRuntimeThreshold(mainRuntime);

        // get data for view mode and display
        loadView();
      });
  };
}
