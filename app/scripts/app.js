angular.module('myApp', ['test-view'])
.controller('valueController', ['$scope', 'magic', function($scope, magic) {
  $scope.val = magic;
}]);
