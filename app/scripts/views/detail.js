angular.module('detail-view', ['app'])
.value('name', 'Detail View')
.value('group', 'Misc')
.value('markedCb', function() {})
.value('focusCb', function() {})
.value('hoverCb', function(stateManager, hovered) {
  var state = stateManager.getData();

  var table = state.unsaved.table;
  var loader = state.unsaved.loader;

  var promise;
  var element;

  if (hovered.length > 0) {
    element = hovered[0];

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
          return RSVP.hash({
            'Function': call.getFunction().then(function(fct) {
              return fct.signature;
            }),
            'Start': call.start,
            'End': call.end,
            'Duration': call.duration
          });
        });
        break;
      case 'Reference':
        promise = loader.getReference(element.id).then(function(ref) {
          return {
            'Name': ref.name,
            'Reference Type': ref.type
          };
        });
        break;
      case 'CallGroup':
        promise = loader.getCallGroup(element.id).then(function(callgroup) {
          return RSVP.hash({
            'Function': callgroup.getFunction().then(function(fct) {
              return fct.signature;
            }),
            'Duration': callgroup.duration,
            'Call count': callgroup.count
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

    _.delay(function() {
      var header = $(svg[0][0]).parent().siblings('div.html-header');
      var table = d3.select(header.children('table')[0]);

      state.unsaved.table = table;
      state.unsaved.loader = loader;
    }, 10);
  };
}]);
