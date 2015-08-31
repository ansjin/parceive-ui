/* global confirm */
/* global location */

var orig = angular.module;
var modules = [];

angular.module = function() {
  var args = Array.prototype.slice.call(arguments);
  if (arguments.length > 1) {
    modules.push(arguments[0]);
  }
  return orig.apply(null, args);
};

var mod = angular.module('module-interceptor', []);

mod.value('modules', function() {
  return modules;
});

mod.value('views', function() {
  return _.filter(modules, function(module) {
    return _.endsWith(module, '-view');
  });
});

mod.service('viewProperties', ['StateService',  function(StateService) {
  return function(view) {
    var $injector;
    try {
      $injector = angular.injector(['ng', view]);
    }
    catch (e) {
      if (confirm('View removed from code. Remove from local storage?')) {
        StateService.removeType(view);
        location.reload();
      }
    }

    return {
      name: $injector.get('name'),
      group: $injector.get('group'),
      render: $injector.get('render'),
      markedCb: $injector.get('markedCb'),
      focusCb: $injector.get('focusCb'),
      hoverCb: $injector.get('hoverCb')
    };
  };
}]);
