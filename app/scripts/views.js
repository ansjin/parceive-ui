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
              .append('svg');

          var bound = stateManager.bindId(attrs.view);
          var view = bound.getData();

          view.unsaved = {svg: svg};
          view.type.unsaved.render(svg, bound);
        }
      };
    }])
  .controller('viewsController', ['$scope', 'views', 'viewProperties',
                                  'stateManager', 'loader',
    function($scope, getViews, viewProperties, stateManager, loader) {
      function initViews() {
        $scope.views = [];
        _.forEach(stateManager.getList(), function(id) {
          var bound = stateManager.bindId(id);
          var view = bound.getData();

          view._views = {
            unsaved: {
              htmlHeader: 'views/' + view.type.id + '-header.html',
              htmlFooter: 'views/' + view.type.id + '-footer.html'
            }
          };

          var data = viewProperties(view.type.id);

          view.type.unsaved = _.pick(data, _.isFunction);

          bound.setFocusCallback(data.focus);
          bound.setMarkedCallback(data.markedChanged);

          $scope.views.push(view);
        });
      }

      loader.getRuns().then(function(runs) {
        stateManager.loadRun();
        $scope.allruns = runs;
        $scope.$apply();
      });

      function runsUpdate(newVal, oldVal) {
        if (newVal === oldVal) {
          return;
        }

        var ok = _.includes($scope.allruns, $scope.selectedRun);

        if (ok) {
          loader.setRun($scope.selectedRun);
          stateManager.saveRun();
          stateManager.load();
          initViews();
        }

        $scope.hasRun = ok;
      }

      $scope.$watch('allruns', runsUpdate);
      $scope.$watch('selectedRun', runsUpdate);

      $scope.$watch(function() {
        stateManager.save();
      });

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
      $scope.allgroups = stateManager.getGroups();

      $scope.addGroup = function() {
        stateManager.addGroup($scope.addGroupInput);
        $scope.allgroups = stateManager.getGroups();
      };

      $scope.removeGroup = function() {
        if (_.isUndefined($scope.removeGroupInput)) {
          return;
        }

        stateManager.removeGroup($scope.removeGroupInput);
        $scope.allgroups = stateManager.getGroups();
      };

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

        stateManager.setFocusCallback(newView.id, selected.data.focus);
        stateManager.setMarkedCallback(newView.id, selected.data.markedChanged);

        stateManager.save();

        $scope.views.push(newView);
      };

      $scope.removeView = function(id) {
        stateManager.remove(id);
        $scope.views = _.filter($scope.views, function(view) {
          return view.id !== id;
        });
      };
    }]);
