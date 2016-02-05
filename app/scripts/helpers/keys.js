/* global window */

var keys = {};

function keyUp(e) {
  keys[String.fromCharCode(e.which)] = false;
}

function keyDown(e) {
  keys[String.fromCharCode(e.which)] = true;
}

window.addEventListener('keyup', keyUp);
window.addEventListener('keydown', keyDown);

angular.module('app')
  .service('KeyService', function() {
    return function(key) {
      return keys[key];
    };
  });
