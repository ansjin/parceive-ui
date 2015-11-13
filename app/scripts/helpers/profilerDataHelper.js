
angular
  .module('app')
  .factory('profilerDataHelper', profilerDataHelper);

// inject dependencies
profilerDataHelper.$inject = ['LoaderService'];

function profilerDataHelper(LoaderService) {
  var factory = {
    getMain: getMain,
    getViewData: getViewData
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
        temp.duration = call.duration;
        temp.ancestor = ancestor;
        temp.level = level;
        temp.id = call.id;

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

  function getCallGroup(id, ancestor, level) {
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

        return callGroup.getFunction();
      })
      .then(function(func) {
        temp.name = func.signature;

        return self.getCallGroups();
      })
      .then(function(callGroups) {
        temp.calls = [];

        // append callees for this call
        for (var i = 0, len = callGroups.length; i < len; i++) {
          temp.calls.push(callGroups[i].id);
        }

        return new RSVP.resolve(temp);
      }, function(err) {
        // error handler
        console.log(err);
      });

    return promise;
  }

  function getViewData(ids, ancestor, level, viewMode) {
    var promises = [];
    var func = (viewMode === 'T') ? getCall : getCallGroup;
    for (var i = 0, len = ids.length; i < len; i++) {
      var promise = func(ids[i], ancestor, level);
      promises.push(promise);
    }

    return RSVP.all(promises);
  }
}
