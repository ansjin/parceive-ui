/* global $, window, document, console */

angular
  .module('thread-view', ['app'])
  .value('name', 'Thread view')
  .value('group', 'Profile views')
  .value('focusCb', focusCb)
  .value('markedCb', markedCb)
  .value('hoverCb', hoverCb)
  .value('spotCb', spotCb)
  .service('render', render);

// handle focus event
function focusCb(stateManager, data) {

}

// handle mark event
function markedCb(stateManager, data) {

}

// handle hover event
function hoverCb(stateManager, data) {

}

// handle spot event
function spotCb(stateManager, data) {
  
}

// inject view dependencies
render.$inject = [
  'd3',
  'pData'
];

// render the view
function render(d3, pd) {
  return function(svg, stateManager) {
    // data holder for this view
    var _svg = {
      viewData: {},
      profileId: Date.now()
    };

    // get thread data for current database
    pd.getThreadData()
    .then(function(data) {
      _svg.viewData = data;
    });

    // nest thread data
    function nestData(data) {
      var obj = data[0];

      for (var i = 1, len = data.length; i < len; i++) {
        
      }
    }
  }
}
