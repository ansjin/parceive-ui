/* global setTimeout */

var run;

var cache = {};

var getOneTemplate = _.template('<%= type %>/<%= id %>');
var getManyTemplate = _.template('<%= type %>/many/<%= ids %>');
var getAllTemplate = _.template('<%= type %>');
var getRelationshipTemplate =
  _.template('<%= type %>/<%= id %>/<%= relationship %>');

function setCache(type, id, value) {
  if (!cache[type]) {
    cache[type] = {};
  }

  cache[type][id] = value;
}

function getCache(type, id) {
  if (!cache[type]) {
    cache[type] = {};
  }

  return cache[type][id];
}

function wrap(data, type, mapper) {
  if (getCache(type.typeName, data.id)) {
    return getCache(type.typeName, data.id);
  }

  var obj = Object.create(type);

  obj._mapper = mapper;
  obj._type = type;

  obj.id = data.id;

  for (var i = 0; i < type.properties.length; i++) {
    obj[type.properties[i]] = data[type.properties[i]];
  }

  _.bindAll(obj);

  setCache(type.typeName, data.id, obj);

  return obj;
}

function httpGet(http, url) {
  url = '/run/' + run + '/' + url;

  return new RSVP.Promise(function(resolve, reject) {
    http.get(url)
      .success(resolve)
      .error(reject);
  });
}

function getOneURL(http, mapper, url, type) {
  var promise = httpGet(http, url)
    .then(function(data) {
      return wrap(data, type, mapper);
    });

  return promise;
}

function getManyURL(http, mapper, url, type) {
  var promise =  httpGet(http, url)
    .then(function(datas) {
      return _.map(datas, function(data) {
        return wrap(data, type, mapper);
      });
    });

  return promise;
}

var pipeline = {};
var pipelineTimeout = false;
var pipelineRestart = false;

function getSpecificReal(http, manager, type, id, many) {
  var cached = getCache(type.typeName, id);

  if (cached) {
    return RSVP.Promise.resolve(cached);
  }

  if (many) {
    return getManyURL(http, manager, getManyTemplate(
      {type: type.plural, ids: id}), type);
  } else {
    return getOneURL(http, manager, getOneTemplate(
      {type: type.plural, id: id}), type);
  }
}

function timeoutFct(http, manager, type) {
  var name = type.typeName;

  pipelineRestart = false;

  _.forEach(pipeline, function(todos, typeName) {
    var type = mapper.types[typeName];
    var ids = _.map(todos, function(val, key) {
      return key;
    });

    if (ids.length === 0) {
      return;
    }

    getSpecificReal(http, manager, type, JSON.stringify(ids), true)
      .then(function(data) {
        _.forEach(todos, function(deffered, id) {
          var result = _.find(data, function(elem) {
            /* jshint -W116 */
            /* id is always a string, but elem.id may be a number */
            return elem.id == id;
            /* jshint +W116 */
          });

          if (result) {
            delete pipeline[name][id];

            deffered.resolve(result);
          }
        });
      }).catch(function(err) {
        _.forEach(todos, function(deffered) {
          deffered.reject(err);
        });
      }).finally(function() {
        pipelineTimeout = false;

        if (pipelineRestart) {
          timeoutFct(http, manager, type);
        }
      });
  });
}

function getSpecific(http, manager, type, id) {
  var cached = getCache(type.typeName, id);

  if (cached) {
    return RSVP.Promise.resolve(cached);
  }

  var name = type.typeName;

  if (!pipeline[name]) {
    pipeline[name] = {};
  }

  var deferred = RSVP.defer();

  pipeline[name][id] = deferred;

  pipelineRestart = true;
  if (pipelineTimeout === false) {
    pipelineTimeout =
      setTimeout(_.partial(timeoutFct, http, manager, type), 10);
  }

  setCache(type, id, deferred.promise);
  return deferred.promise;
}

function getRelationship(http, mapper, instance, type, relationship, many) {
  if (_.isObject(instance[relationship])) {
    return RSVP.Promise.resolve(instance[relationship]);
  }

  var promise;

  if (many) {
    promise = getManyURL(http, mapper, getRelationshipTemplate(
      {type: instance.plural, id: instance.id, relationship: relationship}),
      type);
  } else {
    promise = getSpecific(http, mapper, type, instance[relationship]);
  }

  return promise.then(function(data) {
    instance[relationship] = data;

    return data;
  });
}

function getAll(http, manager, type) {
  return getManyURL(http, manager, getAllTemplate(
    {type: type.plural}), type);
}

var Access = {
  typeName: 'Access',
  singular: 'access',
  plural: 'accesses',
  properties: ['instruction', 'position', 'reference', 'type', 'state'],

  getInstruction: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Instruction, 'instruction');
  },

  getReference: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Reference, 'reference');
  }
};

var Call = {
  typeName: 'Call',
  singular: 'call',
  plural: 'calls',
  properties: ['process', 'thread', 'function', 'instruction', 'start', 'end'],

  getFunction: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Function, 'function');
  },

  getThread: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Thread, 'thread');
  },

  getSegments: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Segments, 'segments', true);
  },

  getInstructions: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Instruction, 'instructions', true);
  }
};

var File = {
  typeName: 'File',
  singular: 'file',
  plural: 'files',
  properties: ['name', 'path'],

  getFunctions: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Function, 'functions', true);
  }
};

var FunctionType = {
  typeName: 'Function',
  singular: 'function',
  plural: 'functions',
  properties: ['signature', 'type', 'file', 'startLine'],

  getFile: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.File, 'file');
  },

  getCalls: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Call, 'calls', true);
  }
};

var Instruction = {
  typeName: 'Instruction',
  singular: 'instruction',
  plural: 'instructions',
  properties: ['segment', 'type', 'lineNumber'],

  getSegment: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Segment, 'segment');
  },

  getAccesses: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Access, 'accesses', true);
  },

  getCall: function() {
    return this.getSegment().then(function(segment) {
      return segment.getCall();
    });
  },

  getReferences: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Reference, 'references', true);
  }
};

var Reference = {
  typeName: 'Reference',
  singular: 'reference',
  plural: 'references',
  properties: ['reference', 'size', 'type', 'name', 'allocator'],

  getAllocator: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Instruction, 'allocator');
  },

  getAccesses: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Access, 'accesses', true);
  }
};

var Segment = {
  typeName: 'Segment',
  singular: 'segment',
  plural: 'segments',
  properties: ['call', 'segmentNumber', 'type', 'loopPointer'],

  getCall: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Call, 'call');
  },

  getInstructions: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Instruction, 'instructions');
  }
};

var Thread = {
  typeName: 'Thread',
  singular: 'thread',
  plural: 'threads',
  properties: ['instruction', 'parent', 'child'],

  getInstruction: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Instruction, 'instruction');
  },

  getParent: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Thread, 'parent');
  },

  getChild: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Thread, 'child');
  },

  getCalls: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Call, 'calls');
  }
};

var mapper = {
  types: {
    Access: Access,
    Call: Call,
    File: File,
    Function: FunctionType,
    Instruction: Instruction,
    Reference: Reference,
    Segment: Segment,
    Thread: Thread
  }
};

mapper.getAccess = function(id) {
  return mapper.getSpecific(Access, id);
};

mapper.getCall = function(id) {
  return mapper.getSpecific(Call, id);
};

mapper.getFile = function(id) {
  return mapper.getSpecific(File, id);
};

mapper.getFiles = function() {
  return mapper.getAll(File);
};

mapper.getFunction = function(id) {
  return mapper.getSpecific(FunctionType, id);
};

mapper.getFunctionBySignature = function(sig) {
  return this.getOneURL('functions/signature/' + sig, FunctionType);
};

mapper.getFunctions = function() {
  return mapper.getAll(FunctionType);
};

mapper.getInstruction = function(id) {
  return mapper.getSpecific(Instruction, id);
};

mapper.getReference = function(id) {
  return mapper.getSpecific(Reference, id);
};

mapper.getSegment = function(id) {
  return mapper.getSpecific(Segment, id);
};

mapper.getThread = function(id) {
  return mapper.getSpecific(Thread, id);
};

mapper.getThreads = function() {
  return mapper.getAll(Thread);
};

// run management

mapper.getRun = function() {
  return run;
};

mapper.setRun = function(nrun) {
  //clear the cache when changing runs to avoid data leaking
  cache = {};

  run = nrun;
};

_.bindAll(mapper);

angular.module('app')
  .service('loader', ['$http', function(http) {

    mapper.getRuns = function() {
      return new RSVP.Promise(function(resolve, reject) {
        http.get('/run')
          .success(resolve)
          .error(reject);
      });
    };

    mapper.getOneURL = _.partial(getOneURL, http, mapper);
    mapper.getManyURL = _.partial(getManyURL, http, mapper);
    mapper.getSpecific = _.partial(getSpecific, http, mapper);
    mapper.getAll = _.partial(getAll, http, mapper);
    mapper.getRelationship = _.partial(getRelationship, http, mapper);

    return mapper;
  }]);
