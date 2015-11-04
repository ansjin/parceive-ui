
angular
  .module('app')
  .factory('profilerViewHelper', profilerViewHelper);

// inject dependencies
profilerViewHelper.$inject = ['SizeService', 'GradientService'];

function profilerViewHelper(SizeService, GradientService) {
  var factory = {};

  return factory;
}
