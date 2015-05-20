angular.module('app')
  .directive('d3Visualization', ['stateManager', 'd3',
    function(stateManager, d3) {
      return {
        restrict: 'E',
        scope: {
          data: '='
        },
        link: function(scope, element, attrs) {
          var svg = d3.select(element[0])
              .append('svg')
              .style('width', '100%');

          var view = stateManager.getData(attrs.view);

          view.type.unsaved.render(svg);

          element.on('$destroy', function() {

          });
        }
      };
    }])
  .controller('viewsController', ['$scope', 'views', 'viewProperties',
                                  'stateManager',
    function($scope, getViews, viewProperties, stateManager) {
      var views = _.map(getViews(), function(view) {

        var data = viewProperties(view);

        return {
          name: data.name,
          group:data.group,
          id: view,
          data: data
        };
      });

      $scope.views = [];
      $scope.allviews = views;

      $scope.addView = function() {
        if (_.isUndefined($scope.selectedView)) {
          return;
        }

        var selected = $scope.selectedView;
        var newView = stateManager.create();

        newView.type = _.omit(selected, 'data');
        newView.type.unsaved = _.pick(selected.data, _.isFunction);

        newView._views = {
          unsaved: {
            htmlHeader: 'views/' + newView.type.id + '-header.html',
            htmlFooter: 'views/' + newView.type.id + '-footer.html'
          }
        };

        stateManager.save();

        $scope.views.push(newView);
      };

      stateManager.load();

      _.forEach(stateManager.getList(), function(id) {
        var view = stateManager.getData(id);

        view._views = {
          unsaved: {
            htmlHeader: 'views/' + view.type.id + '-header.html',
            htmlFooter: 'views/' + view.type.id + '-footer.html'
          }
        };

        var data = viewProperties(view.type.id);

        view.type.unsaved = _.pick(data, _.isFunction);

        $scope.views.push(view);
      });
    }]);
