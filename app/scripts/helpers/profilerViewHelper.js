
angular
  .module('app')
  .factory('profilerViewHelper', profilerViewHelper);

// inject dependencies
profilerViewHelper.$inject = [];

function profilerViewHelper() {
  var factory = {
    appendDeep: appendDeep,
    findDeep: findDeep
  };

  return factory;

  function appendDeep(finalObj, obj, isTracing) {
    var recurse = function(children, obj) {
      for (var i = 0, len = children.length || 0; i < len; i++) {
        if (obj.ancestor === children[i].id) {
          appendData(children[i], obj);
          break;
        } else {
          // if object isn't direct child of first object
          // then recurse children till you find its parent
          if (children[i].hasOwnProperty('children') === true) {
            recurse(children[i].children, obj);
          }
        }
      }
    };

    var appendData = function(child, obj) {
      // if data already has the children property, then push item to array
      // otherwise create children property and add as first item
      if (child.hasOwnProperty('children') === true) {
        if (!isTracing) {
          var end = _.sortBy(child.children, 'end');
          obj.start = end[child.children.length - 1].end;
          obj.end = obj.start + obj.duration;
        }
        child.children.push(obj);
      } else {
        if (!isTracing) {
          obj.start = child.start;
          obj.end = obj.start + obj.duration;
        }
        child.children = [obj];
      }
    };

    // if object is direct child of main object
    if (obj.ancestor === finalObj.id) {
      appendData(finalObj, obj);
    } else {
      recurse(finalObj.children, obj);
    }
  }

  function findDeep(obj, id) {
    var val = {};

    function recurse(children, id) {
      for (var i = children.length - 1; i >= 0; i--) {
        if (children[i].id === id) {
          val = children[i];
        }
        if (children[i].hasOwnProperty('children') === true) {
          recurse(children[i].children, id);
        }
      }
    }

    if (obj.id === id) {
      val = obj;
    } else {
      recurse(obj.children, id);
    }

    return val;
  }
}
