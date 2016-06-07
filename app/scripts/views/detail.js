angular.module('detail-view', ['app'])
.value('name', 'Detail View')
.value('group', 'Misc')
.value('markedCb', function() {})
.value('focusCb', function() {})
.value('spotCb', function() {})
.value('hoverCb', function(stateManager, hovered) {
  var state = stateManager.getData();

  var table = state.unsaved.table;
  var loader = state.unsaved.loader;
  var mainDuration = state.unsaved.mainDuration;

  var promise;
  var element;

  function calcRelDuration(val) {
    return val / mainDuration * 100 + '%';
  }

  if (hovered.length > 0) {
    element = _.find(hovered, function(e) {
      return !e.neighbour;
    });

    switch (element.type) {
      case 'File':
        promise = loader.getFile(element.id).then(function(file) {
          return {
            'Name': file.name,
            'Path': file.path,
          };
        });
        break;
      case 'Call':
        promise = loader.getCall(element.id).then(function(call) {
          return call.getFunction().then(function(fct) {
            return fct.getFile().then(function(file) {
              return {
                'Function': fct.signature,
                'Function Location': file.path + ':' + fct.startLine,
                'Start': call.start,
                'End': call.end,
                'Duration': call.duration,
                'Relative Duration': calcRelDuration(call.duration)
              };
            });
          });
        });
        break;
      case 'Reference':
        promise = loader.getReference(element.id).then(function(ref) {
          return ref.getAllocator().then(function(allocator) {
            return allocator.getCall().then(function(call) {
              return call.getFunction();
            }).then(function(fct) {
              return fct.getFile().then(function(file) {
                return {
                  'Name': ref.name,
                  'Reference Type': ref.type,
                  'Allocated in': file.path + ':' + allocator.lineNumber,
                  'Allocated by': fct.signature
                };
              });
            });
          });

        });
        break;
      case 'CallGroup':
        promise = loader.getCallGroup(element.id).then(function(callgroup) {
          return callgroup.getFunction().then(function(fct) {
            return fct.getFile().then(function(file) {
              return {
                'Function': fct.signature,
                'Function Location': file.path + ':' + fct.startLine,
                'Start': callgroup.start,
                'End': callgroup.end,
                'Duration': callgroup.duration,
                'Relative Duration': calcRelDuration(callgroup.duration),
                'Call count': callgroup.count
              };
            });
          });
        });
        break;
      case 'LoopIteration':
        promise = loader.getLoopIteration(element.id).then(function(iteration) {
          return RSVP.hash({
            'Iteration': iteration.iteration
          });
        });
        break;
      case 'LoopExecution':
        promise = loader.getLoopExecution(element.id).then(function(execution) {
          return RSVP.hash({
            'Start': execution.start,
            'End': execution.end,
            'Duration': execution.duration,
            'Relative Duration': calcRelDuration(execution.duration)
          });
        });
        break;
      default:
        promise = RSVP.resolve({});
    }
  } else {
    promise = RSVP.resolve({});
  }

  promise.then(function(data) {
    var array = _.pairs(data);

    if (element) {
      array.push(['Id', element.id], ['Node Type', element.type]);
    }

    table.selectAll('tr').remove();

    var rows = table.selectAll('tr')
                    .data(array);

    var trs = rows.enter()
      .append('tr');

    trs.append('th')
      .text(function(d) {
        return d[0];
      });
    trs.append('td')
      .text(function(d) {
        return d[1];
      });
  });
})
.service('render', ['LoaderService', 'jquery', 'd3', function(loader, $, d3) {
  return function(svg, stateManager) {
    var state = stateManager.getData();

    loader.getFunctionBySignature('main').then(function(fct) {
      return fct.getCalls().then(function(calls) {
        state.unsaved.mainDuration = calls[0].duration;
      });
    }).then(function() {
      var header = $(svg[0][0]).parent().siblings('div.html-header');
      var table = d3.select(header.children('table')[0]);

      state.unsaved.table = table;
      state.unsaved.loader = loader;
    });
  };
}]);
