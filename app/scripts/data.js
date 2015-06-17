/* global setTimeout */

/**
 * Module responsible with loading the data from the server
 * @module loader
 */

var run;

var cache = {};

var getOneTemplate = _.template('<%= type %>/<%= id %>');
var getManyTemplate = _.template('<%= type %>/many/<%= ids %>');
var getAllTemplate = _.template('<%= type %>');
var getRelationshipTemplate =
  _.template('<%= type %>/<%= id %>/<%= relationship %>');
var getManyRelationshipTemplate =
  _.template('<%= type %>/many/<%= ids %>/<%= relationship %>');

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
  var cached = getCache(type.typeName, data.id);
  if (cached && !(cached instanceof RSVP.Promise)) {
    return getCache(type.typeName, data.id);
  }

  var obj = Object.create(type);

  obj._mapper = mapper;
  obj._type = type;

  obj.id = data.id;

  for (var i = 0; i < type.properties.length; i++) {
    obj[type.properties[i]] = data[type.properties[i]];
  }

  for (var relationshipName in type.relationships) {
    var relationshipMeta = type.relationships[relationshipName];

    if (!relationshipMeta.many && !relationshipMeta.manyToMany) {
      obj[relationshipName + 'ID'] = data[relationshipName];
    }
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
  if (many) {
    return getManyURL(http, manager, getManyTemplate(
      {type: type.plural, ids: id}), type);
  } else {
    return getOneURL(http, manager, getOneTemplate(
      {type: type.plural, id: id}), type);
  }
}

function getManySpecific(http, manager, expecting, type) {
  var ids = _.map(expecting, function(val, key) {
    return key;
  });

  return getSpecificReal(http, manager, type, JSON.stringify(ids), true)
    .then(function(data) {
      _.forEach(expecting, function(deffered, id) {
        var result = _.find(data, function(elem) {
          /* jshint -W116 */
          /* id is always a string, but elem.id may be a number */
          return elem.id == id;
          /* jshint +W116 */
        });

        if (result) {
          deffered.resolve(result);
        }
      });
    }).catch(function(err) {
      _.forEach(expecting, function(deffered) {
        deffered.reject(err);
      });
    });
}

function getManyManyRelationship(http, manager, expecting, type) {
  return _.map(expecting, function(waiting, relationship) {
    var ids = _.map(waiting, function(val, key) {
      return key;
    });

    var relationMeta = type.relationships[relationship];
    var relationType = manager.types[relationMeta.type];
    var inverse = relationMeta.inverse;

    _.forEach(ids, function(id) {
      var instance = getCache(type.typeName, id);

      instance[relationship] = [];
    });

    return getManyURL(http, manager, getManyRelationshipTemplate(
      {type: type.plural, ids: JSON.stringify(ids),
      relationship: relationship}), relationType)

      .then(function(data) {
        _.forEach(data, function(element) {
          var instance = getCache(type.typeName, element[inverse  + 'ID']);

          instance[relationship].push(element);
        });

        _.forEach(waiting, function(deffered, id) {
          var instance = getCache(type.typeName, id);

          deffered.resolve(instance[relationship]);
        });
      }).catch(function(err) {
        _.forEach(waiting, function(deffered) {
          deffered.reject(err);
        });
      });
  });
}

function timeoutFct(http, manager) {
  pipelineRestart = false;

  var arr = _.map(pipeline, function(val, key) {
      return {
        type: manager.types[key],
        specific: val.specific,
        relationship: val.relationship
      };
    });

  pipeline = {};

  var specific = _.filter(arr, function(expected) {
    return expected.specific && _.size(expected.specific) > 0;
  });

  var relationships = _.filter(arr, function(expected) {
    return expected.relationship && _.size(expected.relationship) > 0;
  });

  var specificPA = RSVP.all(_.map(specific, function(expected) {
    return getManySpecific(http, manager, expected.specific, expected.type);
  }));

  var relationshipPA = RSVP.all(_.map(relationships,
    function(expected) {
      return getManyManyRelationship(http, manager, expected.relationship,
        expected.type);
    }));

  RSVP.hash({
    specific: specificPA,
    relationship: relationshipPA
  }).finally(function() {
    pipelineTimeout = false;

    if (pipelineRestart) {
      timeoutFct(http, manager);
    }
  });
}

function startPipelineTimeout(http, manager) {
  pipelineRestart = true;
  if (pipelineTimeout === false) {
    pipelineTimeout =
      setTimeout(_.partial(timeoutFct, http, manager), 10);
  }
}

function addToPipeline(type, id, deferred, relationship) {
  if (!pipeline[type.typeName]) {
    pipeline[type.typeName] = {
      specific: {},
      relationship: {}
    };
  }

  if (relationship) {
    if (!pipeline[type.typeName].relationship[relationship]) {
      pipeline[type.typeName].relationship[relationship] = {};
    }

    pipeline[type.typeName].relationship[relationship][id] = deferred;
  } else {
    pipeline[type.typeName].specific[id] = deferred;
  }
}

function getSpecific(http, manager, type, id) {
  var cached = getCache(type.typeName, id);

  if (cached) {
    return RSVP.Promise.resolve(cached);
  }

  var deferred = RSVP.defer();

  addToPipeline(type, id, deferred);
  startPipelineTimeout(http, manager);

  setCache(type.typeName, id, deferred.promise);
  return deferred.promise;
}

function getRelationship(http, manager, instance, relationship) {
  if (_.isObject(instance[relationship])) {
    return RSVP.Promise.resolve(instance[relationship]);
  }

  var type = instance._type;

  var promise;

  var relationMeta = type.relationships[relationship];
  if (relationMeta.manyToMany) {
    promise =  getManyURL(http, manager, getRelationshipTemplate(
      {type: type.plural, id: instance.id,
      relationship: relationship}), manager.types[relationMeta.type]);
  } else if (relationMeta.many) {
    var deferred = RSVP.defer();

    addToPipeline(type, instance.id, deferred, relationship);
    startPipelineTimeout(http, manager);

    promise = deferred.promise;
  } else {
    var relationType = manager.types[relationMeta.type];

    promise = getSpecific(http, manager, relationType, instance[relationship]);
  }

  instance[relationship] = promise;

  return promise.then(function(data) {
    instance[relationship] = data;

    return data;
  });
}

function getAll(http, manager, type) {
  return getManyURL(http, manager, getAllTemplate(
    {type: type.plural}), type);
}

/** @class */
var Access = {
  typeName: 'Access',
  singular: 'access',
  plural: 'accesses',
  properties: ['instruction', 'position', 'reference', 'type', 'state'],
  relationships: {
    'reference': {
      type: 'Reference'
    },
    'instruction': {
      type: 'Instruction'
    }
  },

  /** Get the instruction that this instance belongs to */
  getInstruction: function() {
    return this._mapper.getRelationship(this, 'instruction');
  },

  /** Get the reference that this intance uses */
  getReference: function() {
    return this._mapper.getRelationship(this, 'reference');
  }
};

/** @class */
var Call = {
  typeName: 'Call',
  singular: 'call',
  plural: 'calls',
  properties: ['process', 'thread', 'function', 'instruction', 'start', 'end'],
  relationships: {
    'thread': {
      type: 'Thread'
    },
    'function': {
      type: 'Function'
    },
    'segments': {
      type: 'Segment',
      many: true,
      inverse: 'call'
    },
    'calls': {
      type: 'Call',
      manyToMany: true
    }
  },

  /** Get the function that this instance belongs to */
  getFunction: function() {
    return this._mapper.getRelationship(this, 'function');
  },

  /** Get the function that this instance belongs to */
  getThread: function() {
    return this._mapper.getRelationship(this, 'thread');
  },

  /** Get the segments that are part of this instance */
  getSegments: function() {
    return this._mapper.getRelationship(this, 'segments');
  },

  /** Get the calls that are made by this instance. This method is optimized */
  getCalls: function() {
    return this._mapper.getRelationship(this, 'calls');
  },

  /** Get the instructions that are part of this instance.
   * Internally loads through segments */
  getInstructions: function() {
    return this.getSegments()
      .then(function(segments) {
        return RSVP.all(_.map(segments, function(segment) {
          return segment.getInstructions();
        })).then(function(data) {
          return _.flatten(data);
        });
      });
  }
};

var File = {
  typeName: 'File',
  singular: 'file',
  plural: 'files',
  properties: ['name', 'path'],
  relationships: {
    'functions': {
      type: 'Function',
      many: true,
      inverse: 'file'
    }
  },

  getFunctions: function() {
    return this._mapper.getRelationship(this, 'functions');
  }
};

var FunctionType = {
  typeName: 'Function',
  singular: 'function',
  plural: 'functions',
  properties: ['signature', 'type', 'file', 'startLine'],
  relationships: {
    'file': {
      type: 'File'
    },
    'calls': {
      type: 'Call',
      many: true,
      inverse: 'function'
    }
  },

  getFile: function() {
    return this._mapper.getRelationship(this, 'file');
  },

  getCalls: function() {
    return this._mapper.getRelationship(this, 'calls');
  }
};

var Instruction = {
  typeName: 'Instruction',
  singular: 'instruction',
  plural: 'instructions',
  properties: ['segment', 'type', 'lineNumber'],
  relationships: {
    'segment': {
      type: 'Segment'
    },
    'accesses': {
      type: 'Access',
      many: true,
      inverse: 'instruction'
    },
    'calls': {
      type: 'Call',
      many: true,
      inverse: 'instruction'
    }
  },

  getSegment: function() {
    return this._mapper.getRelationship(this, 'segment');
  },

  getAccesses: function() {
    return this._mapper.getRelationship(this, 'accesses');
  },

  getCalls: function() {
    return this._mapper.getRelationship(this, 'calls');
  },

  getCall: function() {
    return this.getSegment().then(function(segment) {
      return segment.getCall();
    });
  },

  getReferences: function() {
    return this.getAccesses().then(function(access) {
      return access.getReference();
    });
  }
};

var Reference = {
  typeName: 'Reference',
  singular: 'reference',
  plural: 'references',
  properties: ['reference', 'size', 'type', 'name', 'allocator'],
  relationships: {
    'allocator': {
      type: 'Instruction'
    },
    'accesses': {
      type: 'Access',
      many: true,
      inverse: 'reference'
    }
  },

  getAllocator: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Instruction, 'allocator');
  },

  getAccesses: function() {
    return this._mapper.getRelationship(this, 'accesses');
  }
};

var Segment = {
  typeName: 'Segment',
  singular: 'segment',
  plural: 'segments',
  properties: ['call', 'segmentNumber', 'type', 'loopPointer'],
  relationships: {
    'call': {
      type: 'Call'
    },
    'instructions': {
      type: 'Instruction',
      many: true,
      inverse: 'segment'
    }
  },

  getCall: function() {
    return this._mapper.getRelationship(this, 'call');
  },

  getInstructions: function() {
    return this._mapper.getRelationship(this, 'instructions');
  }
};

var Thread = {
  typeName: 'Thread',
  singular: 'thread',
  plural: 'threads',
  properties: ['instruction', 'parent', 'child'],
  relationships: {
    'instruction': {
      type: 'Instruction'
    },
    'parent': {
      type: 'Thread'
    },
    'child': {
      type: 'Thread'
    },
    'calls': {
      type: 'Call',
      many: true,
      inverse: 'thread'
    }
  },

  getInstruction: function() {
    return this._mapper.getRelationship(this, 'instruction');
  },

  getParent: function() {
    return this._mapper.getRelationship(this, 'parent');
  },

  getChild: function() {
    return this._mapper.getRelationship(this, 'child');
  },

  getCalls: function() {
    return this._mapper.getRelationship(this, 'calls');
  }
};

/** @class */
var loader = {
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

/** load one Access */
loader.getAccess = function(id) {
  return loader.getSpecific(Access, id);
};

/** load all Accesses */
loader.getAccesses = function() {
  return loader.getAll(Access);
};

/** load one Call */
loader.getCall = function(id) {
  return loader.getSpecific(Call, id);
};

loader.getCalls = function() {
  return loader.getAll(Call);
};

loader.getFile = function(id) {
  return loader.getSpecific(File, id);
};

loader.getFiles = function() {
  return loader.getAll(File);
};

loader.getFunction = function(id) {
  return loader.getSpecific(FunctionType, id);
};

loader.getFunctions = function() {
  return loader.getAll(FunctionType);
};

loader.getInstruction = function(id) {
  return loader.getSpecific(Instruction, id);
};

loader.getInstructions = function() {
  return loader.getAll(Instruction);
};

loader.getReference = function(id) {
  return loader.getSpecific(Reference, id);
};

loader.getReferences = function() {
  return loader.getAll(Reference);
};

loader.getSegment = function(id) {
  return loader.getSpecific(Segment, id);
};

loader.getSegments = function() {
  return loader.getAll(Segment);
};

loader.getThread = function(id) {
  return loader.getSpecific(Thread, id);
};

loader.getThreads = function() {
  return loader.getAll(Thread);
};

// fiter functions

var functionSignatureCache = {};

loader.getFunctionBySignature = function(sig) {
  if (functionSignatureCache[sig]) {
    return RSVP.Promise.resolve(functionSignatureCache[sig]);
  }

  var promise = this.getOneURL('functions/signature/' + sig, FunctionType);

  functionSignatureCache[sig] = promise;

  promise.then(function(fct) {
    functionSignatureCache[sig] = fct;
  });

  return promise;
};

// run management

loader.getRun = function() {
  return run;
};

loader.setRun = function(nrun) {
  //clear the cache when changing runs to avoid data leaking
  cache = {};
  functionSignatureCache = {};

  run = nrun;
};

_.bindAll(loader);

angular.module('app')
  .service('loader', ['$http', function(http) {

    loader.getRuns = function() {
      return new RSVP.Promise(function(resolve, reject) {
        http.get('/run')
          .success(resolve)
          .error(reject);
      });
    };

    loader.getOneURL = _.partial(getOneURL, http, loader);
    loader.getManyURL = _.partial(getManyURL, http, loader);
    loader.getSpecific = _.partial(getSpecific, http, loader);
    loader.getAll = _.partial(getAll, http, loader);
    loader.getRelationship = _.partial(getRelationship, http, loader);

    return loader;
  }]);
