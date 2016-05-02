function Cb(stateManager) {
  var data = stateManager.getData();

  var pre = data.unsaved.pre;

  var marked = stateManager.getMarked();

  var tags = _.filter(marked, function(element) {
    return element.type === 'Tag';
  });

  var tagInstructions = _.filter(marked, function(element) {
    return element.type === 'TagInstruction';
  });

  _.forEach(tags, function(tag, index) {
    tag.index = index + 1;
  });

  _.forEach(tagInstructions, function(tagInstruction) {
    tagInstruction.tag = _.find(tags, function(tag) {
      return tag.name === tagInstruction.tag;
    }).index;
  });

  var data = {
    'tags': _.map(tags, function(tag) {
      return {
        'name': tag.name,
        'type': tag.tagType
      };
    }),
    'tagInstructions': _.map(tagInstructions, function(tagInstruction) {
      return {
        'tag': tagInstruction.tag,
        'type': tagInstruction.action,
        'location': tagInstruction.location
      }
    })
  }

  pre.text(JSON.stringify(data, null, 2));
}

angular.module('filter-view', ['app'])
.value('name', 'Filter View')
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
      var pre = d3.select(header.children('pre')[0]);

      var data = stateManager.getData();

      data.unsaved.pre = pre;

      Cb(stateManager);
    }, 10);
  };
}]);
