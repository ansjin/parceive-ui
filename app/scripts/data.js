/* global setTimeout */

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
          delete pipeline[type.typeName].specific[id];

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
    var relationType = mapper.types[relationMeta.type];
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
          var instance = getCache(type.typeName, element[inverse]);

          instance[relationship].push(element);
        });

        _.forEach(waiting, function(deffered, id) {
          var instance = getCache(type.typeName, id);

          delete pipeline[type.typeName].relationship[id];

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
        type: mapper.types[key],
        specific: val.specific,
        relationship: val.relationship
      };
    });

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

  setCache(type, id, deferred.promise);
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

  getInstruction: function() {
    return this._mapper.getRelationship(this, 'instruction');
  },

  getReference: function() {
    return this._mapper.getRelationship(this, 'reference');
  }
};

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

  getFunction: function() {
    return this._mapper.getRelationship(this, 'function');
  },

  getThread: function() {
    return this._mapper.getRelationship(this, 'thread');
  },

  getSegments: function() {
    return this._mapper.getRelationship(this, 'segments');
  },

  getCalls: function() {
    return this._mapper.getRelationship(this, 'calls');
  },

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

mapper.getAccesss = function() {
  return mapper.getAll(Access);
};

mapper.getCall = function(id) {
  return mapper.getSpecific(Call, id);
};

mapper.getCalls = function() {
  return mapper.getAll(Call);
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

mapper.getInstructions = function() {
  return mapper.getAll(Instruction);
};

mapper.getReference = function(id) {
  return mapper.getSpecific(Reference, id);
};

mapper.getReferences = function() {
  return mapper.getAll(Reference);
};

mapper.getSegment = function(id) {
  return mapper.getSpecific(Segment, id);
};

mapper.getSegments = function() {
  return mapper.getAll(Segment);
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
