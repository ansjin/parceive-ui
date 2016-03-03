
angular
  .module('app')
  .factory('profilerDataHelper', profilerDataHelper);

// inject dependencies
profilerDataHelper.$inject = ['LoaderService'];

function profilerDataHelper(LoaderService) {
  var factory = {
    getMain: getMain,
    getRecursive: getRecursive,
    getCall: getCall,
    getCallGroup: getCallGroup,
    getCallObj: getCallObj,
    getCallGroupObj: getCallGroupObj
  };

  return factory;

  function getMain() {
    var promise = LoaderService.getFunctionBySignature('main')
      .then(function(func) {
        return func.getCalls();
      })
      .then(function(call) {
        return new RSVP.resolve(call[0]);
      });
    return promise;
  }

  function getRecursive(obj, isTracing, runtimeThreshold, level) {
    var promises = [];
    var children = [];
    var calls;
    var type = isTracing ? 'call' : 'callgroup';
    var ancestor = isTracing ? 'callerID' : 'parentID';
    var func = isTracing
      ? obj.getRecursiveCalls(runtimeThreshold)
      : obj.getRecursiveCallGroups(runtimeThreshold);
    
    var promise = func
    .then(function(data) {
      calls = data;
      for (var i = 0, len = data.length; i < len; i++) {
        children.push({
          start: isTracing ? Number(data[i][type].start) : null,
          end: isTracing ? Number(data[i][type].end) : null,
          duration: Number(data[i][type].duration),
          ancestor: data[i][type][ancestor],
          level: data[i].depth + level,
          id: data[i][type].id,
          hasLoops: (type === 'call') ? (data[i][type].loopCount > 0 ? true : false) : false,
          loopAdjust: 0
        });
      }

      var promises = data.map(function(o){
        return o[type].getFunction();
      });
      return RSVP.all(promises);
    })
    .then(function(data) {
      for (var i = 0, len = children.length; i < len; i++) {
        children[i].name = data[i].signature;
      }
      
      if (type === 'call') {
        var promises = calls.map(function(o){
          return o[type].getDirectLoopExecutions();
        });
        return RSVP.all(promises);
      } else {
        return new RSVP.resolve(children);
      }
    })
    .then(function(data) {
      for (var i = 0, len = children.length; i < len; i++) {
        var icount = data[i].length > 0 ? data[i][0].iterationsCount : 0;
        var iduration = data[i].length > 0 ? data[i][0].duration : 0;
        children[i].loopIterationCount = icount;
        children[i].loopDuration = iduration;
      }

      // sort for callgroup case
      if (!isTracing) {
        children = _.sortByOrder(children, ['level', 'duration'], [true, false]);
      }
      return new RSVP.resolve(children);
    });
    return promise;
  }

  function getCall(id) {
    return LoaderService.getCall(id);
  }

  function getCallGroup(id) {
    return LoaderService.getCallGroup(id);
  }

  function getCallObj(id, ancestor, level) {
    var self;
    var temp = {};
    var directloopexecutions;

    var promise = LoaderService.getCall(id)
      .then(function(call) {
        // store call object for later
        self = call;
        directloopexecutions = call.directloopexecutions;

        temp.start = Number(call.start);
        temp.end = Number(call.end);
        temp.duration = call.duration;
        temp.ancestor = ancestor;
        temp.level = level;
        temp.id = call.id;
        temp.hasLoops = call.loopCount > 0 ? true : false;
        temp.loopAdjust = 0;
        temp.loopIterationCount = 0;
        temp.loopDuration = 0;
        temp.loopStart = undefined;
        temp.loopEnd = undefined;
        temp.loopIterationCalls = [];

        if (call.directloopexecutions.length > 0) {
          temp.loopIterationCount = call.directloopexecutions[0].iterationsCount;
          temp.loopDuration = call.directloopexecutions[0].duration;
          temp.loopStart = call.directloopexecutions[0].start;
          temp.loopEnd = call.directloopexecutions[0].end;

          var iterations = call.directloopexecutions[0].loopiterations;
          _.forEach(iterations, function(i) {
            
          });
        }

        return call.getFunction();
      })
      .then(function(func) {
        temp.name = func.signature;
        return self.getDirectLoopExecutions();
      })
      .then(function(data) {
        temp.loopIterationCount = data.length > 0 ? data[0].iterationsCount : 0;
        temp.loopDuration = data.length > 0 ? data[0].duration : 0;
        return new RSVP.resolve(temp);
      });
    return promise;
  }

  function getCallGroupObj(id, ancestor, level) {
    var temp = {};
    var promise = LoaderService.getCallGroup(id)
      .then(function(callGroup) {
        temp.start = null;
        temp.end = null;
        temp.duration = callGroup.duration;
        temp.ancestor = ancestor;
        temp.level = level;
        temp.id = callGroup.id;
        temp.hasLoops = false;
        temp.loopAdjust = 0;

        return callGroup.getFunction();
      })
      .then(function(func) {
        temp.name = func.signature;

        return new RSVP.resolve(temp);
      });
    return promise;
  }
}
