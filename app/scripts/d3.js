angular.module('d3', ['module-interceptor'])
  .directive('d3Visualization', ['view_properties', function(view_properties) {
    return {
      restrict: 'E',
      scope: {
        data: '='
      },
      link: function(scope, element, attrs) {
        var svg = d3.select(element[0])
            .append("svg")
            .style('width', '100%');

        var prop = view_properties(attrs.view);
        
        prop.render(svg);
      }};
  }])
  .controller('viewsController', ['$scope', 'views', function($scope, views) {
    $scope.views = views();
  }]);
  
