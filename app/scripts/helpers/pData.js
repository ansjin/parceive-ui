// everything that has to do with loading data from the database

angular
  .module('app')
  .factory('pData', pData);

// inject dependencies
pData.$inject = ['LoaderService'];

function pData(LoaderService) {
  var factory = {
    getMain: getMain,
    getRecursive: getRecursive,
    getCall: getCall,
    getCallGroup: getCallGroup,
    getCallObj: getCallObj,
    getCallGroupObj: getCallGroupObj,
    getThreads: getThreads,
    getThreadsFirstCalls: getThreadsFirstCalls,
    getThreadFirstCall: getThreadFirstCall,
    getThreadFirstCallGroup: getThreadFirstCallGroup
  };

  return factory;

  // get all threads in active db
  function getThreads() {
    var promise = LoaderService.getThreads();
    return promise;
  }

  // get first call made by specific thread
  function getThreadFirstCall(id) {
    if (id === 0) {
      return getMain();
    }

    var promise = LoaderService.getThread(id)
    .then(function(data) {
      return data.getCall();
    })
    .then(function(data) {
      return new RSVP.resolve(data);
    }, function(err){console.log(err)});

    return promise;
  }

  // get first callgroup in thread
  function getThreadFirstCallGroup(id) {
    var promise = getThreadFirstCall(id)
    .then(function(data) {
      return getCallGroup(data.callGroupID);
    });

    return promise;
  }

  // get all first calls made by all threads
  function getThreadsFirstCalls() {
    var main;

    var promise = getMain()
    .then(function(data) {
      main = data;
      return getThreads();
    })
    .then(function(data) {
      var promises = data.map(function(d) {
        if (d.id === 0) {
          return new RSVP.resolve(main);
        } else {
          return d.getCall();
        }
      });
      return RSVP.all(promises);
    })
    .then(function(data) {
      return new RSVP.resolve(data);
    }, function(err) {console.log(err)});

    return promise;
  }

  // get call data for "main"
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

  // recursively get all children of an object that have duration
  // >= a certain threshold
  function getRecursive(obj, isTracing, runtimeThreshold, level, threadID) {
    var type = isTracing ? 'call' : 'callgroup';
    var ancestor = isTracing ? 'callerID' : 'parentID';
    var functions = [];
    var func = isTracing
      ? obj.getRecursiveCalls(runtimeThreshold)
      : obj.getRecursiveCallGroups(runtimeThreshold);

    var promise = LoaderService.getFunctions()
    .then(function(data) {
      // sometimes calls reference function ids' that don't exist in
      // the db. store a list of all function ids' that exist in db
      // and then check against this array to know whether to call
      // getFunction(). This is not the most efficient way to do this
      // but the framework doesn't provide any better option, AFAIK.
      _.forEach(data, function(d) {
        functions.push(d.id);
      });
      return func;
    })
    .then(function(data) {   
      var threadData = [];
      
      if (isTracing) {
        _.forEach(data, function(d) {
          if (d[type].threadID === threadID) {
            threadData.push(d);
          }
        });
      } else {
        threadData = data;
      }
      
      var promises = threadData.map(function(d) {
        var _id = d[type].id;
        var _ancestor = d[type][ancestor];
        var _level = d.depth + level;

        var dataFunc = isTracing
          ? getCallObj(_id, _ancestor, _level, functions)
          : getCallGroupObj(_id, _ancestor, _level, functions);

        return dataFunc;
      });

      return RSVP.all(promises);
    })
    .then(function(children) {
      if (!isTracing) {
        // sort for callgroup case. callgroup should be ordered in ascending 
        // order of level, and descending order of duration
        children = _.sortByOrder(children, ['level', 'duration'], [true, false]);
      } 

      return new RSVP.resolve(children);
    });
    return promise;
  }

  // get an call data by call id
  function getCall(id) {
    return LoaderService.getCall(id);
  }

  // get callgroup data by callgroup id
  function getCallGroup(id) {
    return LoaderService.getCallGroup(id);
  }

  // get a call id custom call object. the object that is returned has 
  // selected properties of the related call, function, and loop data (if any)
  function getCallObj(id, ancestor, level, functions) {
    var self;
    var temp = {};

    var promise = LoaderService.getCall(id)
      .then(function(call) {
        self = call;
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
        temp.threadID = call.threadID;

        if (functions.indexOf(call.functionID) < 0) {
          return new RSVP.resolve({
            signature: 'Untracked Function'
          });
        } else {
          return call.getFunction();
        }
      })
      .then(function(func) {
        temp.name = func.signature;

        return self.getDirectLoopExecutions();
      })
      .then(function(execution) {
        if (execution.length > 0) {
          temp.loopIterationCount = execution[0].iterationsCount;
          temp.loopDuration = execution[0].duration;
          temp.loopStart = execution[0].start;
          temp.loopEnd = execution[0].end;
          return execution[0].getLoopIterations();
        }        
      })
      .then(function(iteration) {
        if (iteration !== undefined) {
          var promises = iteration.map(function(i){ 
            return i.getCalls(); 
          });
          return RSVP.all(promises);
        }
      })
      .then(function(calls) {
        _.forEach(calls, function(c) {
          // some calls being pushed here are empty objects
          // because the iteration did not make any call
          temp.loopIterationCalls.push(c[0]);
        });

        return new RSVP.resolve(temp);
      }, function(err) { console.log(err) });
    return promise;
  }

  // get a callgroup id custom callgroup object
  function getCallGroupObj(id, ancestor, level, functions) {
    var temp = {};
    var promise = LoaderService.getCallGroup(id)
      .then(function(callGroup) {
        temp.start = 0;
        temp.end = callGroup.duration;
        temp.duration = callGroup.duration;
        temp.ancestor = ancestor;
        temp.level = level;
        temp.id = callGroup.id;

        if (functions.indexOf(callGroup.functionID) < 0) {
          return new RSVP.resolve({
            signature: 'Untracked Function'
          });
        } else {
          return callGroup.getFunction();
        }
      })
      .then(function(func) {
        temp.name = func.signature;

        return new RSVP.resolve(temp);
      }, function(err) { console.log(err) });
    return promise;
  }
}
