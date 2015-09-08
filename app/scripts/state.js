/* global localStorage */

var state = {};
var marked = {
  'Default': []
};

var getRun;
var setRun;

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

function callCb(group, type) {
  var params = [].slice.call(arguments, 2);
  [].splice.call(params, 0, 0, '');

  _.chain(_.values(state))
    .filter(function(val) {
      return val.group === group;
    })
    .map(function(val) {
      return [manager.bindId(val.id), val._cb.unsaved[type]];
    })
    .forEach(function(cb) {
      [].splice.call(params, 0, 1, cb[0]);
      cb[1].apply(null, params);
    })
    .value();
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

    var str = JSON.stringify(obj);
    if (isMarked) {
      marked[group].push(str);
    } else {
      marked[group].splice(marked[group].indexOf(str), 1);
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

  setMarkedCallback: function(id, cb) {
    state[id]._cb.unsaved.marked = cb;
  },

  setFocusCallback: function(id, cb) {
    state[id]._cb.unsaved.focus = cb;
  },

  setHoverCallback: function(id, cb) {
    state[id]._cb.unsaved.hover = cb;
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

  clearCallbacks: function(id) {
    delete state[id]._cb.unsaved.focus;
    delete state[id]._cb.unsaved.marked;
    delete state[id]._cb.unsaved.focus;
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
   'removeHoverCallback', 'clearCallbacks'];

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
  .service('StateService', ['LoaderService', function(loader) {
    getRun = loader.getRun;
    setRun = loader.setRun;

    return manager;
  }]);
