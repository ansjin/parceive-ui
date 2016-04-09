/* global $, window, document, console */

angular
  .module('thread-view', ['app'])
  .value('name', 'Thread view')
  .value('group', 'Profile views')
  .value('focusCb', focusCb)
  .value('markedCb', markedCb)
  .value('hoverCb', hoverCb)
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

// inject view dependencies
render.$inject = [
  'd3',
  'GradientService',
  'LoaderService'
];

// render the view
function render(d3, grad, load) {
  return function(svg, stateManager) {
    // data holder for this view
    var _svg = {};

    // get thread data for current database
    function getThreadData() {
      return new Promise(function(resolve, reject) {

        resolve(true);
      });
    }
  }
}
