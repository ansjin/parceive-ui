/* global window */

/*
  Entities (ordered):

  Access (Many-to-Many for Instruction-Reference)
  Call
  File
  Function
  Instruction
  Reference
  Thread
*/

var $q;

var wrap = function(data, type, mapper) {
  var obj = Object.create(type);

  obj._mapper = mapper;
  obj._type = type;

  obj.id = data.id;

  for (var i = 0; i < type.properties.length; i++) {
    obj[type.properties[i]] = data[type.properties[i]];
  }

  _.bindAll(obj);

  return obj;
};

var FIX = {
  accesses: {
    '1': {
      id: '1',
      type: 'write',
      ref: '1'
    }
  },
  calls: {
    '1': {
      id: '1',
      fct: '2',
      runtime: '150',
      instrs: ['1', '2', '3', '4']
    }
  },
  files: {
    '1': {
      id: '1',
      name: 'text.cpp',
      path: '/text.cpp',
      fcts: [1, 2]
    }
  },
  fcts: {
    '1': {
      id: '1',
      name: 'test1(int)'
    },

    '2': {
      id: '2',
      name: 'test2(char*)',
      calls: 1
    }
  },
  instrs: {
    '1': {
      id: '1',
      type: 'alloc',
      accesses: []
    },

    '2': {
      id: '2',
      type: 'writeInstr',
      accesses: [1]
    },

    '3': {
      id: '3',
      type: 'banana',
      accesses: []
    },

    '4': {
      id: '4',
      type: 'banana',
      accesses: []
    }
  },
  refs: {
    '1': {
      id: '1',
      size: '5',
      address: '0xdeadbeef',
      name: '???',
      alloc: '1'
    }
  },
  threads: {}
};

var retLater = function(data, type, mapper) {
  if (_.isUndefined(data)) {debugger; }

  return $q(function(resolve) {
    window.setTimeout(function() {
      resolve(wrap(data, type, mapper));
    }, 1000);
  });
};

var getAll = function(fct, ids) {
  return $q.all(_.map(ids, fct));
};

angular.module('d3')
  .service('loader', ['$q', function(q) {
    $q = q;

    var Call = {
      properties: ['fct', 'instrs'],

      getFunction: function() {
        return this._mapper.getFunction(this.fct);
      },

      getInstructions: function() {
        return getAll(this._mapper.getInstruction, this.instrs);
      }
    };

    var File = {
      properties: ['name', 'fcts'],

      getFunctions: function() {
        return getAll(this._mapper.getFunction, this.fcts);
      }
    };

    var Function = {
      properties: ['file', 'name'],

      getFile: function() {
        return this._mapper.getFile(this.file);
      }
    };

    var Instruction = {
      properties: ['accesses', 'type'],

      getReferences: function() {
        var self = this;
        return getAll(self._mapper._getAccess, self.accesses)
          .then(function(data) {
            var future = getAll(self._mapper.getReference,
              _.map(data, function(el) { return el.ref;}));

            return future.then(function(references) {
              for (var i = 0; i < references.length; i++) {
                references[i].accessType = data[i].type;
              }

              return references;
            });
          });
      }
    };

    var Reference = {
      properties: ['name', 'alloc', 'size', 'address'],

      getAllocationInstruction: function() {
        return this._mapper.getInstruction(this.alloc);
      }
    };

    var Thread = {
      properties: ['start'],

      getStartInstruction: function() {
        return this._mapper.getInstruction(this.start);
      }
    };

    var mapper = {
      _getAccess: function(id) {
        return FIX.accesses[id];
      },

      getFunction: function(id) {
        return retLater(FIX.fcts[id], Function, this);
      },

      getCall: function(id) {
        return retLater(FIX.calls[id], Call, this);
      },

      getFile: function(id) {
        return retLater(FIX.files[id], File, this);
      },

      getInstruction: function(id) {
        return retLater(FIX.instrs[id], Instruction, this);
      },

      getThread: function(id) {
        return retLater(FIX.threads[id], Thread, this);
      },

      getReference: function(id) {
        return retLater(FIX.refs[id], Reference, this);
      }
    };

    _.bindAll(mapper);

    return mapper;
  }]);
