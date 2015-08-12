####Example

```
angular.module('test1-view', ['app'])
.value('name', 'Test view 1')
.value('group', 'Simple test views')
.value('markedCb', function() {})
.value('focusCb', function() {})
.value('hoverCb', function() {})
.service('render', ['d3', function(d3) {
  return function(svg, stateManager) {
    var state = stateManager.getData();

    ...
  };
}]);
```

####State

Each instance of a view has a state. It can be obtained in all functions that the view defines. Anything can be stored in the state and will be saved by calling `stateManager.save()`. To save state that can not or should not be saved use the key `unsaved`.

####Mark

Marking is used for selection across views. Marking and unmarking an element is done with `mark(type, id, isMarked)`. Notification of other views is done automatically. If multiple elements are to be marked use the form `mark(array)`, where `array` has elements of the form:

```
{
  type: ... // The same as the ones available from `LoaderService`
  id: ...
  isMarked: ...
}
```

Checking if a element is marked can be done using `isMarked(type, id)`.

####Focus

Focus is used to focus on specific elements. This is done with `focus(array)` where elements of the array are of the form:

```
{
  type: ...
  id: ...
}
```

####Hover

Hover is handled the same way as Focus.

####Callbacks

Form:
`cb(stateManager, data)`

* markedCb
  `markCb(stateManager, marked)`

  `marked`: array with elements of the form used by `mark`. Only the changes are contained.
* focusCb
  `focusCb(stateManager, focused)`

  `focused`: the array sent using `focus`.
* hoverCb
  `hoverCb(state, hovered)`

  `hovered`: the array sent using `hovered`.

####Rendering

each view needs a function similar to the following:

```
.service('render', ['d3', function(d3) {
  return function(svg, stateManager) {
    var state = stateManager.getData();

    ...
  };
}])
```

* `svg`: the d3 selector used to manipulate the SVG that has already been added to the DOM.
* `stateManager`: the state of the view.

There can be multiple views of the same type and the only difference between them is the state. The render will be called multiple times during the views lifetime for changes to the SVG itself.
