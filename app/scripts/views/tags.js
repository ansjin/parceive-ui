function Cb(stateManager) {
  var state = stateManager.getData();
  var table = state.unsaved.table;

  var tags = _.filter(stateManager.getMarked(), function(element) {
    return element.type === 'Tag';
  });

  var data = table.selectAll('tr').data(tags)
  var enter = data.enter()
    .append('tr');

  enter.append('td').text(function(d) {
      return d.tagType;
    });

  enter.append('td').text(function(d) {
      return d.name;
    });

  enter.append('td').text('Remove')
    .on("click", function (d) {
      d.isMarked = false;
      stateManager.mark(d);

      var tagInstructions = _.filter(stateManager.getMarked(), function(element) {
        return element.type === 'TagInstruction' && element.tag === d.name;
      });

      _.forEach(tagInstructions, function(tagInstruction) {
        tagInstruction.isMarked = false;
        stateManager.mark(tagInstruction);
      });
    });

  data.exit().remove();
}

angular.module('tags-view', ['app'])
.value('name', 'Tag List')
.value('group', 'Source Code')
.value('markedCb', Cb)
.value('focusCb', function() {})
.value('hoverCb', function() {})
.value('spotCb', function() {})
.service('render', ['LoaderService', 'jquery', 'd3', function(loader, $, d3) {
  return function(svg, stateManager) {
    _.delay(function() {
      var header = $(svg[0][0]).parent().siblings('div.html-header');
      header.css('overflow', 'auto');
      var table = d3.select(header.children('table')[0]);
      var select = d3.select(header.children('select')[0]);
      var input = d3.select(header.children('input')[0]);
      var button = d3.select(header.children('button')[0]);

      var state = stateManager.getData();
      state.unsaved.table = table;

      Cb(stateManager);

      button.on("click", function () {
        var tagType = select.node().value;
        var tagName = input.node().value;

        stateManager.mark({
          'isMarked': true,
          'type': 'Tag',
          'id': tagName,
          'name': tagName,
          'tagType': tagType
        });
      });
    }, 10);
  };
}]);
