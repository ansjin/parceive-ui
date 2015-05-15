/* global localStorage */

angular.module('app')
  .service('stateManager', [function() {
    var state = {};
    var marked = {};
    var markCallbacks = {};
    var focusCallbacks = {};
    var cbs = {};

    var removeUnsaved = function(key, val) {
      if (key === 'unsaved') {
        return undefined;
      }

      return val;
    };

    function saveState() {
      localStorage.setItem('state', JSON.stringify(state, removeUnsaved));
    }

    function loadState() {
      state = JSON.parse(localStorage.getItem('state'));
    }

    function saveMarked() {
      localStorage.setItem('marked', JSON.stringify(marked));
    }

    function loadMarked() {
      marked = JSON.parse(localStorage.getItem('marked'));
    }

    var manager = {
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
        cbs[val.id] = [];

        saveState();

        return val;
      },

      getList: function() {
        return _.keys(state);
      },

      addGroup: function(group) {
        marked[group] = {};
        markCallbacks[group] = {};
        focusCallbacks[group] = {};

        saveMarked();
      },

      removeGroup: function(group) {
        delete marked[group];

        saveMarked();
      },

      getData: function(id) {
        return state[id];
      },

      remove: function(id) {
        delete state[id];

        saveState();
      },

      mark: function(id, what, val) {
        var group = state[id].group;

        var str = JSON.stringify(what);
        if (val) {
          marked[group].push(str);
        } else {
          marked[group].splice(marked[group].indexOf(what), 1);
        }

        _.forEach(markCallbacks[group], function(fct) {
          fct(what, val);
        });

        saveMarked();
      },

      clearMarked: function(id) {
        marked[state[id].group].clear();

        saveMarked();
      },

      getMarked: function(id) {
        return _.map(marked[state[id].group], JSON.parse);
      },

      focus: function(id, val) {
        var group = state[id].group;

        _.forEach(focusCallbacks[group], function(fct) {
          fct(val);
        });
      },

      addMarkedCallback: function(id, cb) {
        markCallbacks[state[id].group].push(cb);
        cbs[id].push(cb);
      },

      addFocusCallback: function(id, cb) {
        focusCallbacks[state[id].group].push(id, cb);
        cbs[id].push(cb);
      },

      removeMarkedCallback: function(id, cb) {
        var group = state[id].group;
        markCallbacks[group].splice(markCallbacks[group].indexOf(cb));
      },

      removeFocusCallback: function(id, cb) {
        var group = state[id].group;
        markCallbacks[group].splice(markCallbacks[group].indexOf(cb));
      },

      clearCallbacks: function(id) {
        var group = state[id].group;
        _.forEeach(cbs[id], function(cb) {
          markCallbacks[group].splice(markCallbacks[group].indexOf(cb));
          markCallbacks[group].splice(markCallbacks[group].indexOf(cb));
        });
        cbs[id] = {};
      }
    };

    manager.bindId = function(id) {
      var functionsToBind = ['mark', 'clearMarked', 'getMarked', 'focus',
        'addMarkedCallback', 'addFocusCallback', 'removeMarkedCallback',
        'removeFocusCallback', 'clearCallbacks'];

      var bound = _.zipObject(
        _.map(functionsToBind, function(fct) {
          return [fct, _.partial(manager[fct], id)];
        })
      );

      bound.save = manager.save;

      return bound;
    };

    return manager;
  }]);
