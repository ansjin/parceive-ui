
angular
  .module('app')
  .factory('profilerViewHelper', profilerViewHelper);

// inject dependencies
profilerViewHelper.$inject = ['d3', 'SizeService', 'GradientService'];

function profilerViewHelper(d3, SizeService, GradientService) {
  var factory = {
    appendDeep: appendDeep
  };

  return factory;

  function appendDeep(finalObj, obj, isTracing) {
    var recurse = function(children, obj) {
      for (var i = 0, len = children.length; i < len; i++) {
        if (obj.ancestor === children[i].id) {
          appendData(children[i], obj);
          break;
        } else {
          // if object isn't direct child of first object
          // then recurse children till you find its parent
          recurse(children[i].children, obj);
        }
      }
    };

    var appendData = function(child, obj) {
      // if data already has the children property, then push item to array
      // otherwise create children property and add as first item
      if (child.hasOwnProperty('children') === true) {
        if (!isTracing) {
          obj.start = child.children[child.children.length - 1].end;
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
}
