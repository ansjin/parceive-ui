angular.module('d3', ['module-interceptor'])
  .directive('d3Visualization', ['viewProperties', function(viewProperties) {
    return {
      restrict: 'E',
      scope: {
        data: '='
      },
      link: function(scope, element, attrs) {
        var svg = d3.select(element[0])
            .append('svg')
            .style('width', '100%');

        var prop = viewProperties(attrs.view);

        prop.render(svg);
      }};
  }])
  .controller('viewsController', ['$scope', 'views', function($scope, views) {
    $scope.views = views();
  }]);
