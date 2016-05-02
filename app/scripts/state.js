/* global localStorage */

var state = {};
var marked = {
  'Default': []
};

var getRun;
var setRun;

var globalFct = {
  neighbours: null,
};

var manager;

var removeUnsaved = function(key, val) {
  if (key === 'unsaved') {
    return {};
  }

  return val;
};

function saveRun() {
  localStorage.setItem('run', getRun());
}

function loadRun() {
  setRun(localStorage.getItem('run'));
}

function saveState() {
  localStorage.setItem(getRun() + '/state',
                        JSON.stringify(state, removeUnsaved));
}

function loadState() {
  state = JSON.parse(localStorage.getItem(getRun() + '/state'));

  if (_.isNull(state)) {
    state = {};
  }
}

function saveMarked() {
  localStorage.setItem(getRun() + '/marked', JSON.stringify(marked));
}

function loadMarked() {
  marked = JSON.parse(localStorage.getItem(getRun() + '/marked'));

  if (_.isNull(marked)) {
    marked = {
      'Default': []
    };
  }
}

var currentCbId = 0;

function callCb(group, type, elements) {
  var myId = currentCbId++;

  globalFct.neighbours(elements).then(function(fullarray) {
    if (currentCbId !== myId + 1) {
      return;
    }

    elements = fullarray;
    _.chain(_.values(state))
      .filter(function(val) {
        return val.group === group;
      })
      .map(function(val) {
        return [manager.bindId(val.id), val._cb.unsaved[type]];
      })
      .forEach(function(cb) {
        cb[1].apply(null, [cb[0], elements]);
      })
      .value();
  });
}

function mark(id, type, oid, isMarked, doCb, doSave) {
    var group = state[id].group;
    var obj;

    if (_.isArray(type)) {
      _.forEach(type, function(obj) {
        this.mark(id, obj.type, obj.id, obj.isMarked, false, false);
      });

      callCb(group, 'marked', type);

      return;
    }

    if (_.isUndefined(doSave)) {
      doSave = true;
    }

    if (_.isUndefined(doCb)) {
      doCb = true;
    }

    if (_.isUndefined(isMarked)) {
      isMarked = true;
    }

    if (_.isUndefined(oid) && _.isObject(type)) {
      obj = type;

      if (!_.isUndefined(obj.isMarked)) {
        isMarked = obj.isMarked;
      }
    } else {
      obj = {type: type, id: oid};
    }

    obj.isMarked = isMarked;

    var existing = _.findIndex(marked[group], function(element) {
      element = JSON.parse(element);

      return element.id === obj.id;
    });

    if (isMarked && existing === -1) {
      marked[group].push(JSON.stringify(obj));
    } else if (!isMarked) {
      if (existing >= 0) {
        marked[group].splice(existing, 1);
      }
    }

    if (doCb) {
      callCb(group, 'marked', [obj]);
    }

    if (doSave) {
      saveMarked();
    }
  }

manager = {
  loadRun: loadRun,
  saveRun: saveRun,

  load: function() {
    loadState();
    loadMarked();
  },

  save: function() {
    saveState();
    saveMarked();
  },

  create: function() {
    var val = {
      id: _.uuid(),
      group: 'Default'
    };

    state[val.id] = val;
    state[val.id]._cb = {unsaved: {}};

    saveState();

    return val;
  },

  getList: function() {
    return _.keys(state);
  },

  addGroup: function(group) {
    marked[group] = [];

    saveMarked();
  },

  removeGroup: function(group) {
    if (group === 'Default') {
      return;
    }

    delete marked[group];

    _.forEach(state, function(view) {
      if (view.group === group) {
        view.group = 'Default';
      }
    });

    saveState();
    saveMarked();
  },

  getGroups: function() {
    return _.map(marked, function(val, key) {
      return key;
    });
  },

  getData: function(id) {
    return state[id];
  },

  getId: function(id) {
    return id;
  },

  remove: function(id) {
    delete state[id];

    saveState();
  },

  removeType: function(view) {
    _.forEach(state, function(val, id) {
      if (val.type.id === view) {
        delete state[id];
      }
    });

    saveState();
  },

  mark: mark,

  clearMarked: function(id) {
    marked[state[id].group].clear();

    saveMarked();
  },

  getMarked: function(id) {
    return _.map(marked[state[id].group], JSON.parse);
  },

  isMarked: function(id, type, oid) {
    var obj;
    if (_.isUndefined(oid) && _.isObject(type)) {
      obj = type;
    } else {
      obj = {type: type, id: oid};
    }

    obj.isMarked = true;

    var str = JSON.stringify(obj);

    return _.includes(marked[state[id].group], str);
  },

  focus: function(id, val) {
    var group = state[id].group;

    callCb(group, 'focus', val);
  },

  hover: function(id, val) {
    var group = state[id].group;

    callCb(group, 'hover', val);
  },

  spot: function(id, val) {
    var group = state[id].group;

    callCb(group, 'spot', val);
  },

  setMarkedCallback: function(id, cb) {
    state[id]._cb.unsaved.marked = cb;
  },

  setFocusCallback: function(id, cb) {
    state[id]._cb.unsaved.focus = cb;
  },

  setHoverCallback: function(id, cb) {
    state[id]._cb.unsaved.hover = cb;
  },

  setSpotCallback: function(id, cb) {
    state[id]._cb.unsaved.spot = cb;
  },

  removeMarkedCallback: function(id) {
    delete state[id]._cb.unsaved.marked;
  },

  removeFocusCallback: function(id) {
    delete state[id]._cb.unsaved.focus;
  },

  removeHoverCallback: function(id) {
    delete state[id]._cb.unsaved.hover;
  },

  removeSpotCallback: function(id) {
    delete state[id]._cb.unsaved.spot;
  },

  clearCallbacks: function(id) {
    delete state[id]._cb.unsaved.focus;
    delete state[id]._cb.unsaved.marked;
    delete state[id]._cb.unsaved.hover;
    delete state[id]._cb.unsaved.spot;
  },

  checkFocus: function(array, type, id) {
    return !_.isUndefined(_.find(array, function(e) {
      return e.id === id && e.type === type;
    }));
  },

  checkHover: function(array, type, id) {
    return !_.isUndefined(_.find(array, function(e) {
      return e.id === id && e.type === type;
    }));
  }
};

manager.bindId = function(id) {
  if (state[id]._bound && state[id]._bound.unsaved &&
      state[id]._bound.unsaved.getData) {
    return state[id]._bound.unsaved;
  }

  var functionsToBind = ['mark', 'clearMarked', 'getData', 'isMarked', 'getId',
   'getMarked', 'hover', 'focus', 'setMarkedCallback', 'setFocusCallback',
   'setHoverCallback', 'removeMarkedCallback', 'removeFocusCallback',
   'removeHoverCallback', 'clearCallbacks', 'spot', 'removeSpotCallback',
   'setSpotCallback'];

  var bound = _.zipObject(
    _.map(functionsToBind, function(fct) {
      return [fct, _.partial(manager[fct], id)];
    })
  );

  bound.save = manager.save;
  bound.checkFocus = manager.checkFocus;
  bound.checkHover = bound.checkHover;

  state[id]._bound = {
    unsaved: bound
  };

  return bound;
};

angular.module('app')
  .service('StateService', ['LoaderService', 'LoadNeighboursService',
    function(loader, neighbours) {
    getRun = loader.getRun;
    setRun = loader.setRun;
    globalFct.neighbours = neighbours;

    return manager;
  }]);
