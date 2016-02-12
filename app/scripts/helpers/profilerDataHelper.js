
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
    var type = isTracing ? 'call' : 'callgroup';
    var ancestor = isTracing ? 'callerID' : 'parentID';
    var func = isTracing
      ? obj.getRecursiveCalls(runtimeThreshold)
      : obj.getRecursiveCallGroups(runtimeThreshold);
    
    var promise = func
    .then(function(data) {
      for (var i = 0, len = data.length; i < len; i++) {
        children.push({
          start: isTracing ? Number(data[i][type].start) : null,
          end: isTracing ? Number(data[i][type].end) : null,
          duration: Number(data[i][type].duration),
          ancestor: data[i][type][ancestor],
          level: data[i].depth + level,
          id: data[i][type].id,
          loopCount: (type === 'call') ? data[i][type].loopCount : 0
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

    var promise = LoaderService.getCall(id)
      .then(function(call) {
        // store call object for later
        self = call;

        temp.start = Number(call.start);
        temp.end = Number(call.end);
        temp.duration = call.duration;
        temp.ancestor = ancestor;
        temp.level = level;
        temp.id = call.id;
        temp.loopCount = call.loopCount;

        return call.getFunction();
      })
      .then(function(func) {
        temp.name = func.signature;

        return new RSVP.resolve(temp);
      });
    return promise;
  }

  function getCallGroupObj(id, ancestor, level) {
    var self;
    var temp = {};

    var promise = LoaderService.getCallGroup(id)
      .then(function(callGroup) {
        // store call object for later
        self = callGroup;

        temp.start = null;
        temp.end = null;
        temp.duration = callGroup.duration;
        temp.ancestor = ancestor;
        temp.level = level;
        temp.id = callGroup.id;
        temp.loopCount = 0;

        return callGroup.getFunction();
      })
      .then(function(func) {
        temp.name = func.signature;

        return new RSVP.resolve(temp);
      });
    return promise;
  }
}
