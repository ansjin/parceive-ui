
angular
  .module('app')
  .factory('profilerDataHelper', profilerDataHelper);

// inject dependencies
profilerDataHelper.$inject = ['LoaderService'];

function profilerDataHelper(LoaderService) {
  var factory = {
    getMain: getMain,
    getTracingData: getTracingData
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

  function getCall(id, ancestor, level) {
    var self;
    var temp = {};

    var promise = LoaderService.getCall(id)
      .then(function(call) {
        // store call object for later
        self = call;

        temp.start = Number(call.start);
        temp.end = Number(call.end);
        temp.runtime = temp.end - temp.start;
        temp.ancestor = ancestor;
        temp.level = level;
        temp.callId = call.id;

        return call.getFunction();
      })
      .then(function(func) {
        temp.name = func.signature;

        return self.getCalls();
      })
      .then(function(calls) {
        temp.calls = [];

        // append callees for this call
        for (var i = 0, len = calls.length; i < len; i++) {
          temp.calls.push(calls[i].id);
        }

        return new RSVP.resolve(temp);
      });

    return promise;
  }

  function getTracingData(ids, ancestor, level, callHistory) {
    var promises = [];
    for (var i = 0, len = ids.length; i < len; i++) {
      // make sure you don't call getCall for calls in callHistory
      if (callHistory.indexOf(ids[i]) === -1) {
        var promise = getCall(ids[i], ancestor, level);
        promises.push(promise);
      }
    }

    return RSVP.all(promises);
  }
}
