var run;

function wrap(data, type, mapper) {
  var obj = Object.create(type);

  obj._mapper = mapper;
  obj._type = type;

  obj.id = data.id;

  for (var i = 0; i < type.properties.length; i++) {
    obj[type.properties[i]] = data[type.properties[i]];
  }

  _.bindAll(obj);

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
  return httpGet(http, url).then(function(data) {
    return wrap(data, type, mapper);
  });
}

function getMany(http, mapper, url, type) {
  return httpGet(http, url).then(function(datas) {
    return _.map(datas, function(data) {
      return wrap(data, type, mapper);
    });
  });
}

var Access = {
  properties: ['instruction', 'position', 'reference', 'type', 'state'],

  getInstruction: function() {
    return this._mapper.getInstruction(this.instruction);
  },

  getReference: function() {
    return this._mapper.getReference(this.reference);
  }
};

var Call = {
  properties: ['process', 'thread', 'function', 'instruction', 'start', 'end'],

  getFunction: function() {
    return this._mapper.getFunction(this['function']);
  },

  getThread: function() {
    return this._mapper.getThread(this.thread);
  },

  getSegments: function() {
    return this._mapper.getMany(
      'calls/' + this.id + '/segments',
      this._mapper.types.Segment
    );
  },

  getInstructions: function() {
    return this.getSegments().then(function(segments) {
      return RSVP.all(
        _.map(segments, function(segment) {
          return segment.getInstructions();
        })
      ).then(function(instructions) {
        return _.flatten(instructions);
      });
    });
  }
};

var File = {
  properties: ['name', 'path'],

  getFunctions: function() {
    return this._mapper.getMany(
      'files/' + this.id + '/functions',
      this._mapper.types.Function
    );
  }
};

var FunctionType = {
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
  properties: ['segment', 'type', 'lineNumber'],

  getSegment: function() {
    return this._mapper.getSegment(this.segment);
  },

  getAccesses: function() {
    return this._mapper.getMany(
      'instructions/' + this.id + '/accesses',
      this._mapper.types.Access
    );
  },

  getCall: function() {
    return this.getSegment().then(function(segment) {
      return segment.getCall();
    });
  },

  getReferences: function() {
    return this.getAccesses().then(function(accesses) {
      return RSVP.all(
        _.map(accesses, function(access) {
          return access.getReference();
        })
      );
    });
  }
};

var Reference = {
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
  return this.getOne('accesses/' + id, Access);
};

mapper.getCall = function(id) {
  return this.getOne('calls/' + id, Call);
};

mapper.getFile = function(id) {
  return this.getOne('files/' + id, File);
};

mapper.getFiles = function() {
  return this.getMany('files', File);
};

mapper.getFunction = function(id) {
  return this.getOne('functions/' + id, FunctionType);
};

mapper.getFunctionBySignature = function(sig) {
  return this.getOne('functions/signature/' + sig, FunctionType);
};

mapper.getFunctions = function() {
  return this.getMany('functions', File);
};

mapper.getInstruction = function(id) {
  return this.getOne('instructions/' + id, Instruction);
};

mapper.getReference = function(id) {
  return this.getOne('references/' + id, Reference);
};

mapper.getSegment = function(id) {
  return this.getOne('segments/' + id, Segment);
};

mapper.getThread = function(id) {
  return this.getOne('threads/' + id, Thread);
};

mapper.getThreads = function() {
  return this.getMany('threads', File);
};

mapper.getRun = function() {
  return run;
};

mapper.setRun = function(nrun) {
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
