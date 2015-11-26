angular.module('app')

  .directive('d3Visualization', ['StateService', 'd3',
    function(stateManager, d3) {
      return {

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
  
  .directive('mypanel',function(){
    console.log('mypanel directive');
    var uniqueId = 1;
    return {
      templateUrl: 'emptypanel.html',
      scope: false,
      link: function(scope, elem, attrs) {
            scope.uniqueId = "panel"+uniqueId++;
            scope[scope.uniqueId] = {};
            scope[scope.uniqueId].viewLoaded = false;
            console.log('linking scope.uniqueId',scope.uniqueId);

        }
       // scope = attrs.data;

        /*scope.splitRight = function() {
          scope.template = "horisontal.html";
          scope.data1 = scope;
          scope.data2 = {
            template: "emptypanel.html"
          }
        }

        scope.splitLeft = function() {
          scope.template = "horisontal.html";
          scope.data2 = scope;
          scope.data1 = {
            template: "empty.html"
          }
        }*/
      };
  })
  
  .controller('viewsController', ['$scope', 'views', 'viewProperties',
                                  'StateService', 'LoaderService',
                                  '$templateCache',
    function($scope, getViews, viewProperties, stateManager, loader,
              $templateCache) {
      function initView(id,svg) {
        var bound = stateManager.bindId(id);
        var view = bound.getData();
        $scope.viewLoaded = [];
        $scope.data = {
          template: 'emptypanel.html'
        };

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
        $scope.nav = function(path) {
    $scope.filePath = path;
}; 
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

      $scope.myFunction = function(d3ViewId,selectedView) {
        console.log("myfunction d3ViewId",d3ViewId);
        console.log("myfunction d3ViewId",selectedView);
        for (var i = $scope.allviews.length - 1; i >= 0; i--) {
            console.log("myFunction SELECTED VIEW",selectedView);
          if($scope.allviews[i].id==selectedView){

            console.log("found match",$scope.allviews[i].id);
            var view = $scope.allviews[i].data;
            console.log("view",view);
            console.log("d3",d3);
            /*if(d3.select('#'+d3ViewId+' svg')!= undefined){
               d3.select('#'+d3ViewId)
                .remove('svg');
              
            //console.log("svg",svg);
            }*/

            var oldsvg = d3.select("svg");
            console.log("oldsvg",oldsvg);
            if(oldsvg != undefined){
              oldsvg.remove();
            }
            var svg = d3.select('#'+d3ViewId)
                .append('svg');
            console.log("svg",svg);
            view.unsaved = {svg:svg};
            view.render(svg, stateManager);
            
            $scope[d3ViewId].viewLoaded = true;
            return view;
            // scope.allviews[i].data.render(,undefined);
          }
        }
      
      };
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

      $scope.addView = function(svg) {
        if (_.isUndefined($scope.selectedView)) {
          return;
        }
        
        var selected = $scope.selectedView;
        console.log("Selectedview",selectedView);
        var newView = stateManager.create();

        newView.type = _.omit(selected, 'data');

        initView(newView.id,svg);

        stateManager.save();
      };

      $scope.removeView = function(id) {
        stateManager.remove(id);
        $scope.views = _.filter($scope.views, function(view) {
          return view.id !== id;
        });
      };

    }])
