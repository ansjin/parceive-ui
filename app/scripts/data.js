/* global setTimeout */

/** @interface Type
  * @tutorial browser-loading */

/** @member {string} typeName
  * @memberof Type
  * @abstract
  * @summary Name used for lookups */

/** @member {string} singular
  * @memberof Type
  * @private
  * @summary Name in singular (used for generating URLs)
  * @abstract */

/** @member {string} plural
  * @memberof Type
  * @private
  * @summary Name in plural (used for generating URLs)
  * @abstract */

/** @member {string[]} properties
  * @memberof Type
  * @private
  * @summary List of properties that get loaded from the server
  * @abstract */

/** @member {Object} relationships
  * @memberof Type
  * @private
  * @summary All relationships of an object. It has the form
  *          <`relationshipName`>: 'properties', where properties contains
  *          'type', 'inverse' and 'many'.
  * @abstract */

/** @interface Instance
  * @tutorial browser-loading
  * @augments Type
  * @augments SpecificType */

/** @member {int|string} id
  * @memberof Instance
  * @summary the id of the instance
  * @instance */

/** @member {Service} _mapper
  * @memberof Instance
  * @summary Reference to the Service.
  * @instance
  * @private */

/** @external Promise
  * @see https://github.com/tildeio/rsvp.js/ */

/** @external http
  * @see https://docs.angularjs.org/api/ng/service/$http */

/** @namespace client.data */

/** @private
  * @type {string}
  * @summary The currently used database
  * @memberof client.data */
var run;

/** @private
  * @type {Object}
  * @summary The cache
  * @memberof client.data */
var cache = {};

var getOneTemplate = _.template('<%= type %>/<%= id %>');
var getManyTemplate = _.template('<%= type %>/many/<%= ids %>');
var getAllTemplate = _.template('<%= type %>');
var getManyRelationshipTemplate =
  _.template('<%= type %>/many/<%= ids %>/<%= relationship %>');
var getFileContentTemplate = _.template('files/<%= id %>/content');

/** @private
  * @summary Add element to cache
  * @param {string} type The name of the type
  * @param {int|string} id The id
  * @param {external:Promise|Instance} value The cached value
  * @memberof client.data */
function setCache(type, id, value) {
  if (!cache[type]) {
    cache[type] = {};
  }

  cache[type][id] = value;
}

/** @private
  * @summary Get element from cache
  * @param {string} type The name of the type
  * @param {int|string} id The id
  * @return {external:Promise|Instance} value The cached value
  * @memberof client.data */
function getCache(type, id) {
  if (!cache[type]) {
    cache[type] = {};
  }

  return cache[type][id];
}

/** @private
  * @summary Create a Instance from data coming from the server.
  *           Also eliminates duplicate instances.
  * @param {Object} data The data coming from the server
  * @param {Type} type The expected type of the object
  * @param {loader} mapper
  * @return {Instance} The created instance
  * @memberof client.data */
function wrap(data, type, mapper) {
  var cached = getCache(type.typeName, data.id);
  if (cached && !(cached instanceof RSVP.Promise)) {
    return getCache(type.typeName, data.id);
  }

  var obj = Object.create(type);

  obj._mapper = mapper;

  obj.id = data.id;

  for (var i = 0; i < type.properties.length; i++) {
    obj[type.properties[i]] = data[type.properties[i]];
  }

  for (var relationshipName in type.relationships) {
    var relationshipMeta = type.relationships[relationshipName];

    if (!relationshipMeta.many) {
      obj[relationshipName + 'ID'] = data[relationshipName];
    }
  }

  setCache(type.typeName, data.id, obj);

  return obj;
}

/** @private
  * @summary HTTP request that returns a promise
  * @param {string} url The url to call. The run is prepended here.
  * @param {external:http} http
  * @return {external:Promise} The result
  * @memberof client.data */
function httpGet(http, url) {
  url = '/run/' + run + '/' + url;

  return new RSVP.Promise(function(resolve, reject) {
    http.get(url)
      .success(resolve)
      .error(reject);
  });
}

/** @private
  * @see loader#getOneURL
  * @memberof client.data */
function getOneURL(http, mapper, url, type) {
  var promise = httpGet(http, url)
    .then(function(data) {
      return wrap(data, type, mapper);
    });

  return promise;
}

/** @private
  * @see loader#getManyURL
  * @memberof client.data */
function getManyURL(http, mapper, url, type) {
  var promise =  httpGet(http, url)
    .then(function(datas) {
      return _.map(datas, function(data) {
        return wrap(data, type, mapper);
      });
    });

  return promise;
}

/** @private
  * @type {Object}
  * @summary Requests are stored here until they are sent to the server
  * @memberof client.data */
var pipeline = {};

/** @private
  * @type {int|false}
  * @summary Stores the value got from setTimeout or false if no requests are
  *           pending
  * @memberof client.data */
var pipelineTimeout = false;

/** @private
  * @type {bool}
  * @summary Were any requests made during the execution of the current
              requests
  * @memberof client.data */
var pipelineRestart = false;

/** @private
  * @summary Request one or many instances by id
  * @param {external:http} http
  * @param {loader} manager
  * @param {Type} type the type of the instances
  * @param {int|string|int[]|string[]} The id or ids of the instances
  * @param {bool} many Request one or many
  * @return {Instance|Instance[]}
  * @memberof client.data */
function getSpecificReal(http, manager, type, id, many) {
  if (many) {
    return getManyURL(http, manager, getManyTemplate(
      {type: type.plural, ids: id}), type);
  } else {
    return getOneURL(http, manager, getOneTemplate(
      {type: type.plural, id: id}), type);
  }
}

/** @private
  * @summary Request from the server all requested instances of a specific type.
              Promises pending for requests are resolved here.
  * @param {external:http} http
  * @param {loader} manager
  * @param {Object} expecting The postponed requests
  * @param {Type} type the type of the instances
  * @return {external:Promise}
  * @memberof client.data */
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

/** @private
  * @summary Request from the server all requested relationships
              of a specific type. There can be multiple requests per type
  * @param {external:http} http
  * @param {loader} manager
  * @param {Object} expecting The postponed requests for one relationship.
  * @param {Type} type the type of the instance
  * @return {external:Promise}
  * @memberof client.data */
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

/** @private
  * @summary This function gets all posponed requests. Offloads much of the
              work to {@link getManyManyRelationship} and
              {@link getManySpecific}. If {@link timeoutRestart} is true
              then the function calls itself again.
  * @param {external:http} http
  * @param {loader} manager
  * @memberof client.data */
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
    if (pipelineRestart) {
      timeoutFct(http, manager);
    } else {
      pipelineTimeout = false;
    }
  });
}

/** @private
  * @summary This function starts {@link timeoutFct} after 10ms.
  * @param {external:http} http
  * @param {loader} manager
  * @memberof client.data */
function startPipelineTimeout(http, manager) {
  pipelineRestart = true;
  if (pipelineTimeout === false) {
    pipelineTimeout =
      setTimeout(_.partial(timeoutFct, http, manager), 10);
  }
}

/** @private
  * @summary Postpones a request
  * @param {Type} type The type of the instance
  * @param {int|string} it the id of the instance
  * @param {Deffered} deffered The functions to call when the request
                      completes
  * @param {string|undefined} relationship If undefined this postpones a request
                              to get the specific instance, otherwise gets the
                              relationship for this instance
  * @memberof client.data */
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

/** @private
  * @see loader#getSpecific
  * @memberof client.data */
function getSpecific(http, manager, type, id) {
  if (_.isNull(id)) {
    return RSVP.reject('Relationship undefined');
  }

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

/** @private
  * @see loader#getRelationship
  * @memberof client.data */
function getRelationship(http, manager, instance, relationship) {
  if (_.isObject(instance[relationship])) {
    return RSVP.Promise.resolve(instance[relationship]);
  }

  var type = Object.getPrototypeOf(instance);

  var promise;

  var relationMeta = type.relationships[relationship];
  if (relationMeta.many) {
    var deferred = RSVP.defer();

    addToPipeline(type, instance.id, deferred, relationship);
    startPipelineTimeout(http, manager);

    promise = deferred.promise;
  } else {
    if (_.isUndefined(instance[relationship])) {
      return RSVP.Promise.resolve(instance[relationship]);
    }

    var relationType = manager.types[relationMeta.type];

    promise = getSpecific(http, manager, relationType, instance[relationship]);
  }

  instance[relationship] = promise;

  return promise.then(function(data) {
    instance[relationship] = data;

    return data;
  });
}

/** @private
  * @see loader#getAll
  * @memberof client.data */
function getAll(http, manager, type) {
  return getManyURL(http, manager, getAllTemplate(
    {type: type.plural}), type);
}

/** @class
  * @implements Type */
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

  /** @instance
    * @return {external:Promise.<Instruction>} The instruction that executes the
    *                                           access */
  getInstruction: function() {
    return this._mapper.getRelationship(this, 'instruction');
  },

  /** @instance
    * @return {external:Promise.<Reference>} The accessed reference */
  getReference: function() {
    return this._mapper.getRelationship(this, 'reference');
  }
};

/** @class
  * @implements Type */
var Call = {
  typeName: 'Call',
  singular: 'call',
  plural: 'calls',
  properties: ['thread', 'function', 'instruction', 'callGroup',
                'start', 'end', 'caller', 'callsOthers', 'duration',
                'callerexecution', 'calleriteration'],
  relationships: {
    'thread': {
      type: 'Thread'
    },
    'function': {
      type: 'Function'
    },
    'caller': {
      type: 'Call'
    },
    'callGroup': {
      type: 'CallGroup'
    },
    'callerexecution': {
      type: 'LoopExecution'
    },
    'calleriteration': {
      type: 'LoopIteration'
    },
    'segments': {
      type: 'Segment',
      many: true,
      inverse: 'call'
    },
    'calls': {
      type: 'Call',
      many: true,
      inverse: 'caller'
    },
    'loopexecutions': {
      type: 'LoopExecution',
      many: true,
      inverse: 'call'
    },
    'callgroups': {
      type: 'CallGroup',
      many: true,
      inverse: 'caller'
    },
    'instruction': {
      type: 'Instruction'
    },
    'directloopexecutions': {
      type: 'LoopExecution',
      many: true,
      inverse: 'call'
    },
    'directcalls': {
      type: 'Call',
      many: true,
      inverse: 'caller'
    },
    'callreferences': {
      type: 'CallReference',
      many: true,
      inverse: 'call'
    }
  },

  /** @instance
    * @return {external:Promise.<Call>} The parent call */
  getCaller: function() {
    return this._mapper.getRelationship(this, 'caller');
  },

  /** @instance
    * @return {external:Promise.<Function>} The function that this call calls */
  getFunction: function() {
    return this._mapper.getRelationship(this, 'function');
  },

  /** @instance
    * @return {external:Promise.<Thread>} The thread that this call belongs to
    */
  getThread: function() {
    return this._mapper.getRelationship(this, 'thread');
  },

  /** @instance
    * @return {external:Promise.<Segment[]>} The list of segments that
    *                                         this call executes */
  getSegments: function() {
    return this._mapper.getRelationship(this, 'segments');
  },

  /** @instance
    * This is faster than going through segments and instructions
    * @return {external:Promise.<Call[]>} the list of calls that this call makes
    */
  getCalls: function() {
    return this._mapper.getRelationship(this, 'calls');
  },

  /** @instance
    * @return {external:Promise.<Call[]>} the loops executed as part of this
    *                                     call
    */
  getLoopExecutions: function() {
    return this._mapper.getRelationship(this, 'loopexecutions');
  },

  /** @instance
    * @return {external:Promise.<CallGroup>} The call group of this call */
  getCallGroup: function() {
    return this._mapper.getRelationship(this, 'callGroup');
  },

  /** @instance
    * @return {external:Promise.<CallGroup[]>} The CallGroups called by this
    *         call */
  getCallGroups: function() {
    return this._mapper.getRelationship(this, 'callgroups');
  },

  /** @instance
    * @return {external:Promise.<Call[]>} The calls made by this call outside
    *         any loops */
  getDirectCalls: function() {
    return this._mapper.getRelationship(this, 'directcalls');
  },

  /** @instance
    * @return {external:Promise.<LoopExecution[]>} Get the loopexecutions made
    *         directly by the call (not inside another loop) */
  getDirectLoopExecutions: function() {
    return this._mapper.getRelationship(this, 'directloopexecutions');
  },

  /** @instance
    * @summary Internally this goes trough segments
    * @return {external:Promise.<Instruction[]>} the list of instructions that
    *                                             the call executes */
  getInstructions: function() {
    return this.getSegments()
      .then(function(segments) {
        return RSVP.all(_.map(segments, function(segment) {
          return segment.getInstructions();
        })).then(function(data) {
          return _.flatten(data);
        });
      });
  },

  /** @instance
    * @summary Internally this goes trough segments, instructions
    * @return {external:Promise.<Access[]>} the list of accesses performed
    *                                       by this call */
  getAccesses: function() {
    return this.getInstructions()
      .then(function(instrs) {
        return RSVP.all(_.map(instrs, function(instr) {
          return instr.getAccesses();
        })).then(function(data) {
          return _.flatten(data);
        });
      });
  },

  /** @instance
    * @return {external:Promise.<CallReference[]>} */
  getCallReferences: function() {
    return this._mapper.getRelationship(this, 'callreferences');
  },

  /** @instance
    * @return {external:Promise.<Reference[]>} the list of references that
    *                                          the call accesses */
  getReferences: function() {
    return this.getCallReferences()
      .then(function(callreferences) {
        return RSVP.all(_.map(callreferences, function(callreference) {
          return callreference.getReference();
        }));
      });
  },

  /**
    * The result of a recursive query
    * @typedef {Object} Call.RecursiveCallResult
    * @property {number} depth the depth
    * @property {Call} call The Call at this depth
    */

  /** @instance
    * @param {int} minDuration Optional. Returns only those functions with a duration longer than this.
    * @return {external:Promise.<Call.RecursiveCallResult[]>} */
  getRecursiveCalls: function(minDuration) {
    var self = this;

    minDuration = minDuration ? minDuration : 0;

    return self._mapper.httpGet('calls/' + self.id + '/recursivecalls?duration=' + minDuration)
      .then(function(datas) {
        return _.map(datas, function(data) {
            return {
              depth: data.depth,
              call: wrap(data, Call, self._mapper)
            };
          });
      });
  },
};

/** @class
  * @implements Type */
var CallGroup = {
  typeName: 'CallGroup',
  singular: 'callgroup',
  plural: 'callgroups',
  properties: ['function', 'caller', 'count', 'parent', 'end', 'start',
                'duration'],

  relationships: {
    'caller': {
      type: 'Call'
    },
    'parent': {
      type: 'CallGroup'
    },
    'function': {
      type: 'Function'
    },
    'calls': {
      type: 'Call',
      many: true,
      inverse: 'callGroup'
    },
    'callgroups': {
      type: 'CallGroup',
      many: true,
      inverse: 'parent'
    },
    'callgroupreferences': {
      type: 'CallGroupReference',
      many: true,
      inverse: 'callgroup'
    }
  },

  /** @instance
    * @return {external:Promise.<Function>} The function that this call calls */
  getParent: function() {
    return this._mapper.getRelationship(this, 'parent');
  },

  /** @instance
    * @return {external:Promise.<Function>} The function that this call calls */
  getCaller: function() {
    return this._mapper.getRelationship(this, 'caller');
  },

  /** @instance
    * @return {external:Promise.<Function>} The function that this call calls */
  getFunction: function() {
    return this._mapper.getRelationship(this, 'function');
  },

  /** @instance
    * @return {external:Promise.<Call[]>} the list of calls that this call makes
    */
  getCalls: function() {
    return this._mapper.getRelationship(this, 'calls');
  },

  /** @instance
    * @return {external:Promise.<CallGroup[]>} the list of callgroups that this callgroup calls
    */
  getCallGroups: function() {
    return this._mapper.getRelationship(this, 'callgroups');
  },

  /** @instance
    * @return {external:Promise.<CallGroupReferences[]>} */
  getCallGroupReferences: function() {
    return this._mapper.getRelationship(this, 'callgroupreferences');
  },

  /** @instance
    * @return {external:Promise.<Reference[]>} the list of references that
    *                                          the CallGroup accesses */
  getReferences: function() {
    return this.getCallGroupReferences()
      .then(function(callgroupreferences) {
        return RSVP.all(_.map(callgroupreferences,
          function(callgroupreference) {
            return callgroupreference.getReference();
          }));
      });
  },

  /**
    * The result of a recursive query
    * @typedef {Object} CallGroup.RecursiveCallGroupResult
    * @property {number} depth the depth
    * @property {CallGroup} callgroup The CallGroup at this depth
    */

  /** @instance
    * @param {int} minDuration Optional. Returns only those functions with a duration longer than this.
    * @return {external:Promise.<CallGroup.RecursiveCallGroupResult[]>} */
  getRecursiveCallGroups: function(minDuration) {
    var self = this;

    minDuration = minDuration ? minDuration : 0;

    return self._mapper.httpGet
      ('callgroups/' + self.id + '/recursivecallgroups?duration=' + minDuration)
      .then(function(datas) {
        return _.map(datas, function(data) {
            return {
              depth: data.depth,
              callgroup: wrap(data, CallGroup, self._mapper)
            };
          });
      });
  },
};

/** @class
  * @implements Type */
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

  /** @instance
    * @return {external:Promise.<Function[]>} the list of functions that this
    *                                          file contains */
  getFunctions: function() {
    return this._mapper.getRelationship(this, 'functions');
  },

  /** @instance
    * @return {external:Promise.<string>} The content of the file */
  getContent: function() {
    return this._mapper.httpGet(getFileContentTemplate({id: this.id}));
  }
};

/** @class
  * @alias Function
  * @implements Type */
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

  /** @instance
    * @return {external:Promise.<File>} the file that this function is a part
    *                                   of */
  getFile: function() {
    return this._mapper.getRelationship(this, 'file');
  },

  /** @instance
    * @return {external:Promise.<Call[]>} The calls made to this function */
  getCalls: function() {
    return this._mapper.getRelationship(this, 'calls');
  }
};

/** @class
  * @implements Type */
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

  /** @instance
    * @return {external:Promise.<Segment>} The segment that this instruction is
    *                                       a part of */
  getSegment: function() {
    return this._mapper.getRelationship(this, 'segment');
  },

  /** @instance
    * @return {external:Promise.<Access[]>} The list of accesses done by this
    *                                        instruction */
  getAccesses: function() {
    return this._mapper.getRelationship(this, 'accesses');
  },

  /** @instance
    * @return {external:Promise.<Call[]>} The list of calls made by this
    *                                      instruction */
  getCalls: function() {
    return this._mapper.getRelationship(this, 'calls');
  },

  /** @instance
    * @summary Internally goes trough Segment
    * @return {external:Promise.<Call>} The call that this instruction is a part
    *                                    of. */
  getCall: function() {
    return this.getSegment().then(function(segment) {
      return segment.getCall();
    });
  },

  /** @instance
    * @summary Internally goes trough accesses
    * @return {external:Promise.<Reference[]>} The list of references accessed
    *                       by this instruction */
  getReferences: function() {
    return this.getAccesses().then(function(access) {
      return access.getReference();
    });
  }
};

/** @class
  * @implements Type */
var Loop = {
  typeName: 'Loop',
  singular: 'loop',
  plural: 'loops',
  properties: ['line', 'function'],
  relationships: {
    'function': {
      type: 'Functon'
    },
    'loopexecutions': {
      type: 'LoopExecution',
      many: true,
      inverse: 'loop'
    }
  },

  /** @instance
    * @return {external:Promise.<LoopExecution[]>} The executions of the loop */
  getLoopExecutions: function() {
    return this._mapper.getRelationship(this, 'loopexecutions');
  },

  /** @instance
    * @return {external:Promise.<Function>} The function that contains the
    *         loop */
  getFunction: function() {
    return this._mapper.getRelationship(this, 'function');
  },
};

/** @class
  * @implements Type */
var LoopExecution = {
  typeName: 'LoopExecution',
  singular: 'loopexecution',
  plural: 'loopexecutions',
  properties: ['loop', 'parent', 'duration', 'call'],
  relationships: {
    'loop': {
      type: 'Loop'
    },
    'parent': {
      type: 'LoopIteration'
    },
    'call': {
      type: 'Call'
    },
    'children': {
      type: 'LoopExecution',
      many: true,
      inverse: 'parent'
    },
    'loopiterations': {
      type: 'LoopIteration',
      many: true,
      inverse: 'execution'
    },
    'calls': {
      type: 'Call',
      many: true,
      inverse: 'callerexecution'
    },
    'loopexecutionreferences': {
      type: 'LoopExecutionReference',
      many: true,
      inverse: 'loopexecution'
    }
  },

  /** @instance
    * @return {external:Promise.<Loop>} The loop of this execution */
  getLoop: function() {
    return this._mapper.getRelationship(this, 'loop');
  },

  /** @instance
    * @return {external:Promise.<LoopExecution>} The parent of the loop */
  getParent: function() {
    return this._mapper.getRelationship(this, 'parent');
  },

  /** @instance
    * @return {external:Promise.<LoopExecution[]>} The children of the loop */
  getChildren: function() {
    return this._mapper.getRelationship(this, 'children');
  },

  /** @instance
    * @return {external:Promise.<LoopIteration[]>} The iterations of the loop */
  getLoopIterations: function() {
    return this._mapper.getRelationship(this, 'loopiterations');
  },

  /** @instance
    * @return {external:Promise.<Call[]>} The calls that are made as part of
              this execution */
  getCalls: function() {
    return this._mapper.getRelationship(this, 'calls');
  },

  /** @instance
    * @return {external:Promise.<LoopExecutionReference[]>} */
  getLoopExecutionReferences: function() {
    return this._mapper.getRelationship(this, 'loopexecutionreferences');
  },

  /** @instance
    * @return {external:Promise.<Reference>} The references that are accessed by
    *         this execution */
  getReferences: function() {
    return this.getLoopExecutionReferences().then(function(refs) {
      return RSVP.all(_.map(refs, function(ref) {
        return ref.getReference();
      }));
    });
  },
};

/** @class
  * @implements Type */
var LoopIteration = {
  typeName: 'LoopIteration',
  singular: 'loopiteration',
  plural: 'loopiterations',
  properties: ['execution', 'iteration'],
  relationships: {
    'execution': {
      type: 'LoopExecution'
    },
    'calls': {
      type: 'Call',
      many: true,
      inverse: 'calleriteration'
    },
    'loopiterationreferences': {
      type: 'LoopIterationReference',
      many: true,
      inverse: 'loopiteration'
    },
    'segments': {
      type: 'Segment',
      many: true,
      inverse: 'loop'
    },
    'loopexecutions': {
      type: 'LoopExecution',
      many: true,
      inverse: 'parent'
    }
  },

  /** @instance
    * @return {external:Promise.<LoopExecution>} The loop execution of this
    *         iteration */
  getLoopExecution: function() {
    return this._mapper.getRelationship(this, 'execution');
  },

  /** @instance
    * @return {external:Promise.<Call[]>} The calls that are made as part of
              this iteration */
  getCalls: function() {
    return this._mapper.getRelationship(this, 'calls');
  },

  /** @instance
    * @return {external:Promise.<LoopIterationReference[]>} */
  getLoopIterationReferences: function() {
    return this._mapper.getRelationship(this, 'loopiterationreferences');
  },

  /** @instance
    * @return {external:Promise.<LoopExecution[]>} */
  getLoopExecutions: function() {
    return this._mapper.getRelationship(this, 'loopexecutions');
  },

  /** @instance
    * @return {external:Promise.<Reference>} The references that are accessed by
    *         this iteration */
  getReferences: function() {
    return this.getLoopIterationReferences().then(function(refs) {
      return RSVP.all(_.map(refs, function(ref) {
        return ref.getReference();
      }));
    });
  },
};

/** @class
  * @implements Type */
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

  /** @instance
    * @return {external:Promise.<Instruction>} The instruction that allocates
    *                                           this reference */
  getAllocator: function() {
    return this._mapper.getRelationship(this,
      this._mapper.types.Instruction, 'allocator');
  },

  /** @instance
    * @return {external:Promise.<Access[]>} The accesses done on this reference
    */
  getAccesses: function() {
    return this._mapper.getRelationship(this, 'accesses');
  }
};

/** @class
  * @implements Type */
var CallReference = {
  typeName: 'CallReference',
  singular: 'callreference',
  plural: 'callreferences',
  properties: ['reference', 'call', 'reads', 'writes'],
  relationships: {
    'reference': {
      type: 'Reference'
    },
    'call': {
      type: 'Call'
    }
  },

  /** @instance
    * @return {external:Promise.<Call>} The Call */
  getCall: function() {
    return this._mapper.getRelationship(this, 'call');
  },

  /** @instance
    * @return {external:Promise.<Call>} The Reference */
  getReference: function() {
    return this._mapper.getRelationship(this, 'reference');
  },
};

/** @class
  * @implements Type */
var CallGroupReference = {
  typeName: 'CallGroupReference',
  singular: 'callgroupreference',
  plural: 'callgroupreferences',
  properties: ['reference', 'callgroup', 'reads', 'writes'],
  relationships: {
    'reference': {
      type: 'Reference'
    },
    'callgroup': {
      type: 'CallGroup'
    }
  },

  /** @instance
    * @return {external:Promise.<Call>} The Call */
  getCallGroup: function() {
    return this._mapper.getRelationship(this, 'callgroup');
  },

  /** @instance
    * @return {external:Promise.<Call>} The Reference */
  getReference: function() {
    return this._mapper.getRelationship(this, 'reference');
  },
};

/** @class
  * @implements Type */
var LoopExecutionReference = {
  typeName: 'LoopExecutionReference',
  singular: 'loopexecutionreference',
  plural: 'loopexecutionreferences',
  properties: ['reference', 'loopexecution', 'reads', 'writes'],
  relationships: {
    'loopexecution': {
      type: 'LoopExecution'
    },
    'call': {
      type: 'CallGroup'
    }
  },

  /** @instance
    * @return {external:Promise.<Call>} The Call */
  getLoopExecution: function() {
    return this._mapper.getRelationship(this, 'loopexecution');
  },

  /** @instance
    * @return {external:Promise.<Call>} The Reference */
  getReference: function() {
    return this._mapper.getRelationship(this, 'reference');
  },
};

/** @class
  * @implements Type */
var LoopIterationReference = {
  typeName: 'LoopIterationReference',
  singular: 'loopiterationreference',
  plural: 'loopiterationreferences',
  properties: ['reference', 'loopiteration', 'reads', 'writes'],
  relationships: {
    'loopiteration': {
      type: 'LoopIteration'
    },
    'call': {
      type: 'CallGroup'
    }
  },

  /** @instance
    * @return {external:Promise.<Call>} The Call */
  getLoopIteration: function() {
    return this._mapper.getRelationship(this, 'loopiteration');
  },

  /** @instance
    * @return {external:Promise.<Call>} The Reference */
  getReference: function() {
    return this._mapper.getRelationship(this, 'reference');
  },
};

/** @class
  * @implements Type */
var Segment = {
  typeName: 'Segment',
  singular: 'segment',
  plural: 'segments',
  properties: ['call', 'segmentNumber', 'type', 'loop'],
  relationships: {
    'call': {
      type: 'Call'
    },
    'loop': {
      type: 'LoopIteration'
    },
    'instructions': {
      type: 'Instruction',
      many: true,
      inverse: 'segment'
    }
  },

  /** @return {external:Promise.<Call>} The call that this segment is a part of
    * @instance */
  getCall: function() {
    return this._mapper.getRelationship(this, 'call');
  },

  /** @return {external:Promise.<LoopIteration>} The coresponding loop itration
    * @instance */
  getLoopIteration: function() {
    return this._mapper.getRelationship(this, 'loop');
  },

  /** @return {external:Promise.<Instruction[]>} The instructions that are part
    *                                            of this segment
    * @instance */
  getInstructions: function() {
    return this._mapper.getRelationship(this, 'instructions');
  },

  /** @instance
    * @return {external:Promise.<Call[]>} The calls made by this segment */
  getCalls: function() {
    return this.getInstructions().then(function(instructions) {
      return RSVP.all(_.map(instructions, function(instruction) {
        return instruction.getCalls();
      }));
    }).then(function(array) {
      return _.unique(_.flatten(array));
    });
  },

  /** @instance
    * @return {external:Promise.<Reference[]>} The references accessed by this
              segment */
  getReferences: function() {
    return this.getInstructions().then(function(instructions) {
      return RSVP.all(_.map(instructions, function(instruction) {
        return instruction.getReferences();
      }));
    }).then(function(array) {
      return _.unique(_.flatten(array));
    });
  }
};

/** @class
  * @implements Type */
var Thread = {
  typeName: 'Thread',
  singular: 'thread',
  plural: 'threads',
  properties: ['instruction', 'process'],
  relationships: {
    'instruction': {
      type: 'Instruction'
    },
    'calls': {
      type: 'Call',
      many: true,
      inverse: 'thread'
    }
  },

  /** @return {external:Promise.<Instruction>} The instruction that started this
    *                                          thread
    * @instance */
  getInstruction: function() {
    return this._mapper.getRelationship(this, 'instruction');
  },

  /** @return {external:Promise.<Thread>} The parent thread
    * @instance */
  getParent: function ThreadGetParent() {
    return this.getInstruction().then(function(instruction) {
      return instruction.getCall();
    }).then(function(call) {
      return call.getThread();
    });
  },

  /** @return {external:Promise.<Call[]>} Calls made by this thread
    * @instance */
  getCalls: function() {
    return this._mapper.getRelationship(this, 'calls');
  }
};

/** @class
  * @summary Angular service
  * @tutorial browser-loading */
var loader = {
  /** Contains all defined types
  * @instance */
  types: {
    Access: Access,
    Call: Call,
    CallGroup: CallGroup,
    File: File,
    Function: FunctionType,
    Instruction: Instruction,
    Loop: Loop,
    LoopExecution: LoopExecution,
    LoopIteration: LoopIteration,
    Reference: Reference,
    CallReference: CallReference,
    CallGroupReference: CallGroupReference,
    LoopExecutionReference: LoopExecutionReference,
    LoopIterationReference: LoopIterationReference,
    Segment: Segment,
    Thread: Thread
  }
};

/** @return {external:Promise.<Access>}
  * @param {int|string} id The id of the element
  * @method
  * @instance */
loader.getAccess = function(id) {
  return loader.getSpecific(Access, id);
};

/** @return {external:Promise.<Access[]>}
  * @instance */
loader.getAccesses = function() {
  return loader.getAll(Access);
};

/** @return {external:Promise.<Call>}
  * @param {int|string} id The id of the element
  * @instance */
loader.getCall = function(id) {
  return loader.getSpecific(Call, id);
};

/** @return {external:Promise.<Call[]>}
  * @instance */
loader.getCalls = function() {
  return loader.getAll(Call);
};

/** @return {external:Promise.<CallGroup>}
  * @param {int|string} id The id of the element
  * @instance */
loader.getCallGroup = function(id) {
  return loader.getSpecific(CallGroup, id);
};

/** @return {external:Promise.<CallGroup[]>}
  * @instance */
loader.getCallGroups = function() {
  return loader.getAll(CallGroup);
};

/** @return {external:Promise.<File>}
  * @param {int|string} id The id of the element
  * @instance */
loader.getFile = function(id) {
  return loader.getSpecific(File, id);
};

/** @return {external:Promise.<File[]>}
  * @instance */
loader.getFiles = function() {
  return loader.getAll(File);
};

/** @return {external:Promise.<Function>}
  * @param {int|string} id The id of the element
  * @instance */
loader.getFunction = function(id) {
  return loader.getSpecific(FunctionType, id);
};

/** @return {external:Promise.<Function[]>}
  * @instance */
loader.getFunctions = function() {
  return loader.getAll(FunctionType);
};

/** @return {external:Promise.<Instruction>}
  * @param {int|string} id The id of the element
  * @instance */
loader.getInstruction = function(id) {
  return loader.getSpecific(Instruction, id);
};

/** @return {external:Promise.<Instruction[]>}
  * @instance */
loader.getInstructions = function() {
  return loader.getAll(Instruction);
};

/** @return {external:Promise.<Loop>}
  * @param {int|string} id The id of the element
  * @instance */
loader.getLoop = function(id) {
  return loader.getSpecific(Loop, id);
};

/** @return {external:Promise.<Loop[]>}
  * @instance */
loader.getLoops = function() {
  return loader.getAll(Loop);
};

/** @return {external:Promise.<LoopExecution>}
  * @param {int|string} id The id of the element
  * @instance */
loader.getLoopEcecution = function(id) {
  return loader.getSpecific(LoopExecution, id);
};

/** @return {external:Promise.<LoopExecution[]>}
  * @instance */
loader.getLoopExecution = function() {
  return loader.getAll(LoopExecution);
};

/** @return {external:Promise.<LoopIteration>}
  * @param {int|string} id The id of the element
  * @instance */
loader.getLoopIteration = function(id) {
  return loader.getSpecific(LoopIteration, id);
};

/** @return {external:Promise.<LoopIteration[]>}
  * @instance */
loader.getLoopIteration = function() {
  return loader.getAll(LoopIteration);
};

/** @return {external:Promise.<Reference>}
  * @param {int|string} id The id of the element
  * @instance */
loader.getReference = function(id) {
  return loader.getSpecific(Reference, id);
};

/** @return {external:Promise.<Reference[]>}
  * @instance */
loader.getReferences = function() {
  return loader.getAll(Reference);
};

/** @return {external:Promise.<Segment>}
  * @instance
  * @param {int|string} id The id of the element */
loader.getSegment = function(id) {
  return loader.getSpecific(Segment, id);
};

/** @return {external:Promise.<Segment[]>}
  * @instance */
loader.getSegments = function() {
  return loader.getAll(Segment);
};

/** @return {external:Promise.<Thread>}
  * @instance
  * @param {int|string} id The id of the element */
loader.getThread = function(id) {
  return loader.getSpecific(Thread, id);
};

/** @return {external:Promise.<Thread[]>}
  * @instance */
loader.getThreads = function() {
  return loader.getAll(Thread);
};

// fiter functions

var functionSignatureCache = {};

/** @param {string} sig The signature
  * @return {external:Promise.<Function>} The function with the specified signature
  * @instance*/
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

/** Get name of the currently used database
  * @return {string} the name of the database
  * @instance */
loader.getRun = function() {
  return run;
};

/** Set the name of the currently used database
  * @param {string} nrun the name of the database
  * @instance */
loader.setRun = function(nrun) {
  //clear the cache when changing runs to avoid data leaking
  cache = {};
  functionSignatureCache = {};

  run = nrun;
};

_.bindAll(loader);

angular.module('app')
  .service('LoaderService', ['$http', function(http) {

    /** @return {external:Promise.<string[]>} All available databases
      * @instance */
    loader.getRuns = function() {
      return new RSVP.Promise(function(resolve, reject) {
        http.get('/run')
          .success(resolve)
          .error(reject);
      });
    };

    /** @method
      * @instance
      * @private
      * @summary Load data from a URL
      * @param {string} url the url to use
      * @return {external:Promise.<string>} the coantent */
    loader.httpGet = _.partial(httpGet, http);

    /** @method
      * @instance
      * @private
      * @summary Load an instance from an URL. This bypasses the cache,
      *          but the run is still prepended.
      * @param {string} url the url to use
      * @param {Type} type The type to use
      * @return {external:Promise.<Instance>} the instance */
    loader.getOneURL = _.partial(getOneURL, http, loader);

    /** @method
      * @instance
      * @private
      * @summary Load many instances from an URL. This bypasses the cache,
      *          but the run is still prepended.
      * @param {string} url the url to use
      * @param {Type} type The type to use
      * @return {external:Promise.<Instance[]>} the instances */
    loader.getManyURL = _.partial(getManyURL, http, loader);

    /** @method
      * @instance
      * @summary Load a specific instance with a specified type
      * @param {Type} type The type to use
      * @param {int|string} id the id of the instance
      * @return {external:Promise.<Instance>} the instance */
    loader.getSpecific = _.partial(getSpecific, http, loader);

    /** @method
      * @instance
      * @summary Load all instances with a specified type
      * @param {Type} type The type to use
      * @return {external:Promise.<Instance[]>} the instances */
    loader.getAll = _.partial(getAll, http, loader);

    /** @method
      * @instance
      * @summary Load a relationship
      * @param {Instance} instance The instance for which the relationship
      *                            is loaded
      * @param {string} relationship The relationship to load
      * @return {external:Promise.<Instance>|external:Promise.<Instance[]>}
                The relationship */
    loader.getRelationship = _.partial(getRelationship, http, loader);

    return loader;
  }]);
