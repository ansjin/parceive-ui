angular.module('app', ['module-interceptor'])
  .directive('d3Visualization', ['viewProperties', 'd3',
  function(viewProperties, d3) {
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
    $scope.views = _.map(views(), function(view) {
      return {
        name: view,
        htmlHeader: 'views/' + view + '-header.html',
        htmlfooter: 'views/' + view + '-footer.html'
      };
    });
  }]);
