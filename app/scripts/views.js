angular.module('app')
  .directive('d3Visualization', ['StateService', 'd3',
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

          _.delay(function() {
            view.type.unsaved.render(svg, bound);
          }, 10);
        }
      };
    }])
  .controller('viewsController', ['$scope', 'views', 'viewProperties',
                                  'StateService', 'LoaderService',
                                  '$templateCache',
    function($scope, getViews, viewProperties, stateManager, loader,
              $templateCache) {
      function initView(id) {
        var bound = stateManager.bindId(id);
        var view = bound.getData();

        view._views = {
          unsaved: {
            htmlHeader: 'views/' + view.type.id + '-header.html',
            htmlFooter: 'views/' + view.type.id + '-footer.html',
            htmlTitle: 'views/' + view.type.id + '-title.html',
            htmlMenu: 'views/' + view.type.id + '-menu.html'
          }
        };

        /* this is to avoid loading templates using http */
        _.forEach(view._views.unsaved, function(template) {
          if (_.isUndefined($templateCache.get(template))) {
            $templateCache.put(template, '');
          }
        });

        var data = viewProperties(view.type.id);

        view.type.unsaved = _.pick(data, _.isFunction);

        bound.setFocusCallback(data.focusCb);
        bound.setMarkedCallback(data.markedCb);
        bound.setHoverCallback(data.hoverCb);

        $scope.views.push(view);
      }

      function initViews() {
        $scope.views = [];
        _.forEach(stateManager.getList(), initView);
      }

      loader.getRuns().then(function(runs) {
        stateManager.loadRun();
        $scope.allruns = runs;

        if (loader.getRun()) {
          $scope.selectedRun = loader.getRun();
        }

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
          group: data.group,
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

        initView(newView.id);

        stateManager.save();
      };

      $scope.removeView = function(id) {
        stateManager.remove(id);
        $scope.views = _.filter($scope.views, function(view) {
          return view.id !== id;
        });
      };
    }]);
