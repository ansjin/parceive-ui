function cb(stateManager, data) {
  var state = stateManager.getData();

  var file = _.find(data, function(e) {
    return e.type === 'File';
  });

  if (file) {
    state.file = file.id;

    state.unsaved.update();
  }
}

angular.module('source-view', ['app'])
.value('name', 'Source View')
.value('group', 'Source Code')
.value('markedCb', function() {})
.value('focusCb', cb)
.value('hoverCb', function() {})
.value('spotCb', cb)
.service('render', ['highlight', 'LoaderService', 'jquery', 'd3',
function(highlight, loader, $, d3) {
  return function(svg, stateManager) {
    _.delay(function() {
      var header = $(svg[0][0]).parent().siblings('div.html-header');
      var codeElement = d3.select(header.children('pre.highlight')[0]);

      var state = stateManager.getData();

      state.unsaved.update = function() {
        codeElement.text('');
        codeElement.text('Loading');
        loader.getFile(state.file).then(function(file) {
          file.getContent().then(function(data) {
            codeElement.text(data);
            highlight.highlightBlock(codeElement[0][0]);
          });
        }, function(err) {
          codeElement.text(err);
        });
      };

      if (state.file) {
        state.unsaved.update();
      }
    }, 10);
  };
}]);
