var run;

var cache = {};

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

var running = {};

function addRunning(url, promise) {
  running[url] = promise;

  promise.finally(function() {
    delete running[url];
  });
}

function getRunning(url) {
  return running[url];
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

function getOne(http, mapper, url, type) {
  if (getRunning(url)) {
    return getRunning(url);
  }

  var promise = httpGet(http, url)
    .then(function(data) {
      return wrap(data, type, mapper);
    });

  addRunning(url, promise);

  return promise;
}

function getMany(http, mapper, url, type) {
  if (getRunning(url)) {
    return getRunning(url);
  }

  var promise =  httpGet(http, url)
    .then(function(datas) {
      return _.map(datas, function(data) {
        return wrap(data, type, mapper);
      });
    });

  addRunning(url, promise);

  return promise;
}

var Access = {
  typeName: 'Access',
  properties: ['instruction', 'position', 'reference', 'type', 'state'],

  getInstruction: function() {
    return this._mapper.getInstruction(this.instruction);
  },

  getReference: function() {
    return this._mapper.getReference(this.reference);
  }
};

var Call = {
  typeName: 'Call',
  properties: ['process', 'thread', 'function', 'instruction', 'start', 'end'],

  getFunction: function() {
    return this._mapper.getFunction(this['function']);
  },

  getThread: function() {
    return this._mapper.getThread(this.thread);
  },

  getSegments: function() {
    var self = this;

    if (self.segments) {
      return RSVP.Promise.resolve(self.segments);
    }

    return this._mapper.getMany(
      'calls/' + this.id + '/segments',
      this._mapper.types.Segment
    ).then(function(data) {
      self.segments = data;

      return data;
    });
  },

  getInstructions: function() {
    var self = this;

    if (this.instructions) {
      return RSVP.Promise.resolve(self.instructions);
    }

    return this._mapper.getMany(
      'calls/' + this.id + '/instructions',
      this._mapper.types.Instruction
    ).then(function(data) {
      self.instructions = data;

      return data;
    });
  }
};

var File = {
  typeName: 'File',
  properties: ['name', 'path'],

  getFunctions: function() {
    return this._mapper.getMany(
      'files/' + this.id + '/functions',
      this._mapper.types.Function
    );
  }
};

var FunctionType = {
  typeName: 'Function',
  properties: ['signature', 'type', 'file', 'startLine'],

  getFile: function() {
    return this._mapper.getFile(this.file);
  },

  getCalls: function() {
    return this._mapper.getMany(
      'functions/' + this.id + '/calls',
      this._mapper.types.Call
    );
  }
};

var Instruction = {
  typeName: 'Instruction',
  properties: ['segment', 'type', 'lineNumber'],

  getSegment: function() {
    return this._mapper.getSegment(this.segment);
  },

  getAccesses: function() {
    var self = this;

    if (this.accesses) {
      return RSVP.Promise.resolve(this.accesses);
    }

    return this._mapper.getMany(
      'instructions/' + this.id + '/accesses',
      this._mapper.types.Access
    ).then(function(data) {
      self.accesses = data;

      return data;
    });
  },

  getCall: function() {
    return this.getSegment().then(function(segment) {
      return segment.getCall();
    });
  },

  getReferences: function() {
    if (this.references) {
      return RSVP.Promise.resolve(this.references);
    }

    var self = this;
    return this.getAccesses().then(function(accesses) {
      return RSVP.all(
        _.map(accesses, function(access) {
          return access.getReference();
        })
      );
    }).then(function(data) {
      self.references = data;

      return data;
    });
  }
};

var Reference = {
  typeName: 'Reference',
  properties: ['reference', 'size', 'type', 'name', 'allocator'],

  getAllocator: function() {
    return this._mapper.getInstruction(this.allocator);
  },

  getAccesses: function() {
    return this._mapper.getMany(
      'references/' + this.id + '/accesses',
      this._mapper.types.Access
    );
  }
};

var Segment = {
  typeName: 'Segment',
  properties: ['call', 'segmentNumber', 'type', 'loopPointer'],

  getCall: function() {
    return this._mapper.getCall(this.call);
  },

  getInstructions: function() {
    return this._mapper.getMany(
      'segments/' + this.id + '/instructions',
      this._mapper.types.Instruction
    );
  }
};

var Thread = {
  typeName: 'Thread',
  properties: ['instruction', 'parent', 'child'],

  getInstruction: function() {
    return this._mapper.getInstruction(this.instruction);
  },

  getParent: function() {
    return this._mapper.getThread(this.parent);
  },

  getChild: function() {
    return this._mapper.getThread(this.child);
  },

  getCalls: function() {
    return this._mapper.getMany(
      'threads/' + this.id + '/calls',
      this._mapper.types.Call
    );
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
  var cached = getCache('Access', id);

  if (cached) {
    return RSVP.Promise.resolve(cached);
  }

  return this.getOne('accesses/' + id, Access);
};

mapper.getCall = function(id) {
  var cached = getCache('Call', id);

  if (cached) {
    return RSVP.Promise.resolve(cached);
  }

  return this.getOne('calls/' + id, Call);
};

mapper.getFile = function(id) {
  var cached = getCache('File', id);

  if (cached) {
    return RSVP.Promise.resolve(cached);
  }

  return this.getOne('files/' + id, File);
};

mapper.getFiles = function() {
  return this.getMany('files', File);
};

mapper.getFunction = function(id) {
  var cached = getCache('Function', id);

  if (cached) {
    return RSVP.Promise.resolve(cached);
  }

  return this.getOne('functions/' + id, FunctionType);
};

mapper.getFunctionBySignature = function(sig) {
  return this.getOne('functions/signature/' + sig, FunctionType);
};

mapper.getFunctions = function() {
  return this.getMany('functions', File);
};

mapper.getInstruction = function(id) {
  var cached = getCache('Instruction', id);

  if (cached) {
    return RSVP.Promise.resolve(cached);
  }

  return this.getOne('instructions/' + id, Instruction);
};

mapper.getReference = function(id) {
  var cached = getCache('Reference', id);

  if (cached) {
    return RSVP.Promise.resolve(cached);
  }

  return this.getOne('references/' + id, Reference);
};

mapper.getSegment = function(id) {
  var cached = getCache('Segment', id);

  if (cached) {
    return RSVP.Promise.resolve(cached);
  }

  return this.getOne('segments/' + id, Segment);
};

mapper.getThread = function(id) {
  var cached = getCache('Thread', id);

  if (cached) {
    return RSVP.Promise.resolve(cached);
  }

  return this.getOne('threads/' + id, Thread);
};

mapper.getThreads = function() {
  return this.getMany('threads', File);
};

// query optimizations
mapper.getAccessesForInstructions = function(instructions) {
  var ids = _.pluck(instructions, 'id');

  return this.getMany('instructions/many/' +
                      JSON.stringify(ids) + '/accesses', Access)
    .then(function(accesses) {
      _.forEach(instructions, function(instruction) {
        instruction.accesses = [];
      });

      _.forEach(accesses, function(access) {
        var instruction = getCache('Instruction', access.instruction);

        instruction.accesses.push(access);
      });

      return accesses;
    });
};

mapper.getRun = function() {
  return run;
};

mapper.setRun = function(nrun) {
  //clear the cache and running when changing runs to avoid data leaking
  cache = {};
  running = {};

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

    mapper.getOne = _.partial(getOne, http, mapper);
    mapper.getMany = _.partial(getMany, http, mapper);

    return mapper;
  }]);
