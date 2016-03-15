
angular
  .module('app')
  .factory('profilerViewHelper', profilerViewHelper);

// inject dependencies
profilerViewHelper.$inject = [];

function profilerViewHelper() {
  var factory = {
    appendDeep: appendDeep,
    findDeep: findDeep,
    addLoopProperties: addLoopProperties,
    checkCallHistory: checkCallHistory,
    addCallHistory: addCallHistory,
    buildViewData: buildViewData
  };

  return factory;

  function appendDeep(finalObj, obj, isTracing) {
    var recurse = function(children, obj) {
      for (var i = 0, len = children.length || 0; i < len; i++) {
        if (obj.ancestor === children[i].id) {
          appendData(children[i], obj);
          break;
        } else {
          // if object isn't direct child of first object
          // then recurse children till you find its parent
          if (children[i].hasOwnProperty('children') === true) {
            recurse(children[i].children, obj);
          }
        }
      }
    };

    var appendData = function(child, obj) {
      // if data already has the children property, then push item to array
      // otherwise create children property and add as first item
      if (child.hasOwnProperty('children') === true) {
        if (!isTracing) {
          var end = _.sortBy(child.children, 'end');
          obj.start = end[child.children.length - 1].end;
          obj.end = obj.start + obj.duration;
        }
        child.children.push(obj);
      } else {
        if (!isTracing) {
          obj.start = child.start;
          obj.end = obj.start + obj.duration;
        }
        child.children = [obj];
      }
    };

    // if object is direct child of main object
    if (obj.ancestor === finalObj.id) {
      appendData(finalObj, obj);
    } else {
      recurse(finalObj.children, obj);
    }
  }

  function findDeep(obj, id) {
    var val = {};

    function recurse(children, id) {
      for (var i = children.length - 1; i >= 0; i--) {
        if (children[i].id === id) {
          val = children[i];
        }
        if (children[i].hasOwnProperty('children') === true) {
          recurse(children[i].children, id);
        }
      }
    }

    if (obj.id === id) {
      val = obj;
    } else {
      recurse(obj.children, id);
    }

    return val;
  }

  function addLoopProperties(data) {
    var queue = [data];
    var loops = [];
    var levels = {};

    while(queue.length > 0) {
      var item = queue.shift();

      if (levels.hasOwnProperty(item.level) === false) {
        levels[item.level] = loops.length;
      } 

      item.loopAdjust = levels[item.level];

      if (item.hasOwnProperty('children') === true) {
        _.forEach(item.children, function(c) {
          queue.push(c);
        });
      }

      if (item.hasLoops && loops.indexOf(item.level + 1) == -1) {
        loops.push(item.level + 1);
      }
    }
  }

  function checkCallHistory(id, v, isTracing) {
    // return true if call id is not in call history
    var history = isTracing ? v.callHistory : v.callGroupHistory;
    return history.indexOf(id) === -1;
  }

  function addCallHistory(id, v, isTracing) {
    if (isTracing) {
      v.callHistory.push(id);
    } else {
      v.callGroupHistory.push(id);
    }
  }

  // add an object to the children element of tracing or profiling data
  // obj parameter can either be call or callGroup data
  function buildViewData(obj, v, isTracing) {
    if (obj.ancestor === 'null') {
      if (isTracing) {
        v.tracingData = obj;
      } else {
        obj.start = 0;
        obj.end = obj.duration;
        v.profilingData = obj;
      }
    } else {
      if (isTracing) {
        appendDeep(v.tracingData, obj, isTracing);
      } else {
        appendDeep(v.profilingData, obj, isTracing);
      }
    }
  }
}
