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

mod.service('viewProperties', function() {
  return function(view) {
    var $injector = angular.injector([view]);

    return {
      name: $injector.get('name'),
      render: $injector.get('render')
    };
  };
});
