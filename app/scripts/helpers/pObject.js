// everything that has to do with the profiler data object and related functions.
// This data object contains all the active variables used in the profiler view

angular
  .module('app')
  .factory('pObject', pObject);

// inject dependencies
pObject.$inject = ['d3', 'pData', 'GradientService'];

function pObject(d3, pd, grad) {
  var factory = {
    getObject: getObject,
    setMainData: setMainData,
    initViewData: initViewData,
    loadChildren: loadChildren,
    setRuntimeThreshold: setRuntimeThreshold
  };

  return factory;

  function getObject(isTracing) {
    return {
      isTracing: isTracing, // set whether tracing or profiling
      mainDuration: null, // runtime of main function
      mainCallId: null, // ID of main function
      mainCallGroupId: null, // callGroup ID of main
      currentTop: null, // call that is at the top level of the view
      runtimeThreshold: null, // minimum runtime required for children to load
      thresholdFactor: 0.5, // % of top level duration children must have to be shown
      viewData: {}, // store the current data used to display profiler
      viewLevels: {}, // the loop adjustment values for each level
      nodes: null, // nodes to use in the d3 partition view layout
      history: [], // stores id's that have been retrieved
      rectHeight: 22, // height of the bars in the profiler
      textPadY: 15, // top padding for the text svg
      textPadX: 0.5, // left padding for the text svg
      adjustLevel: 0, // stores level -1 of bar at the top position of the profiler
      adjustLoopLevel: 0, // stores amount of loop adjustments above current level
      transTime: 600, // transition time for appending a bar to profiler
      transType: 'elastic', // type of append transition
      maxLevel: 1, // current highest level of bars on the profiler
      svgWidth: '100%', // width of the svg
      profileId: null, // random ID to differentiate profiling views on DOM
      initView: false, // flag to check if view has been initialized before
      partition: null, // holds modified d3 partition value function
      zoomId: null, // id of call or callGroup that is currently zoomed to top
      zoomHistory: [], // stores previously zoomed nodes
      selectedNodes: [], // stores selected nodes
      minTooltipWidth: 150, // minimun width of the tooltip
      gradient: null, // holds gradient function
      gradientBright: null, // holds gradientBright function
      widthScale: null, // holds function to calculate width of call
      xScale: null, // holds function to calculate x position of call
      clickCount: 0, // click counter for determining double or single click
      showLoop: false, // show loops in visualization
      threads: [0] // id's of threads to be shown in visualization
    };
  }

  // set main properties on tracing and profiling view objects. "main"
  // properties are just duration, call id and callgroup id
  function setMainData(_t, _p) {
    return new Promise(function(resolve, reject) {
      pd.getMain()
      .then(function(call) {
        // console.log(call);
        _t.mainDuration = _p.mainDuration = call.duration;
        _t.mainCallId = _p.mainCallId = call.id;
        _t.mainCallGroupId = _p.mainCallGroupId = call.callGroupID;

        var profileId = Date.now();
        _t.profileId = _p.profileId = profileId;

        resolve(true);
      });
    });
  }

  // set the value for the least duration allowed to be loaded from db.
  // this is useful for knowing when to stop loading children of a call. if the
  // current item doesn't have a duration >= runtimeThreshold, don't load its children
  function setRuntimeThreshold(obj) {
    obj.runtimeThreshold = Math.ceil(obj.currentTop.duration * (obj.thresholdFactor / 100));
  }

  function initViewData(_t, _p) {
    return new Promise(function(resolve, reject) {
      var ancestor = 'null';
      var level = 1;

      pd.getCallObj(_t.mainCallId, ancestor, level)
      .then(function(data) {
        _t.viewData = data;
        _t.currentTop = data;

        return pd.getCallGroupObj(_p.mainCallGroupId, ancestor, level);
      })
      .then(function(data) {
        _p.viewData = data;
        _p.currentTop = data;

        setRuntimeThreshold(_t);
        setRuntimeThreshold(_p);

        _t.gradient = _p.gradient = grad.gradient(0, _t.mainDuration);
        _t.gradientBright = _p.gradientBright = grad.gradientBright(0, _t.mainDuration);
        _t.partition = _p.partition = d3.layout.partition().value(function(d) {
          return d.duration;
        });

        resolve(true);
      });
    });
  }

  // load children of the call or callgroup with the specified id, and
  // append the them to the viewData
  function loadChildren(obj, id, level) {
    return new Promise(function(resolve, reject) {
      var func = obj.isTracing
        ? pd.getCall(id)
        : pd.getCallGroup(id);

      func.then(function(call) {
        return pd.getRecursive(call, obj.isTracing, obj.runtimeThreshold, level);
      })
      .then(function(data) {
        _.forEach(data, function(d) {
          if (obj.history.indexOf(d.id) === -1) {
            appendDeep(obj.viewData, d, obj.isTracing);
            obj.history.push(d.id);
          }
        });

        // if this is tracing data object, add values for the loop adjustments
        if (obj.isTracing) {
          obj.viewLevels = addLoopAdjustment(obj.viewData);
        }

        resolve(true);
      });
    });
  }

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

  // specify a loopAdjust value such that we know how many vertical adjustments
  // we need to make such that in "show loop" mode, the loops above a specific
  // level can be shown without overlapping
  function addLoopAdjustment(data) {
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

    return levels;
  }
}
