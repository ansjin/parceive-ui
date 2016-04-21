angular.module('filelist-view', ['app'])
.value('name', 'File List')
.value('group', 'Source Code')
.value('markedCb', function() {})
.value('focusCb', function() {})
.value('hoverCb', function() {})
.value('spotCb', function() {})
.service('render', ['LoaderService', 'jquery', 'd3', function(loader, $, d3) {
  return function(svg, stateManager) {
    _.delay(function() {
      var header = $(svg[0][0]).parent().siblings('div.html-header');
      header.css('overflow', 'auto');
      var table = d3.select(header.children('table')[0]);

      loader.getFiles().then(function(files) {
        var rows = table.selectAll('tr');

        rows
          .data(files)
          .enter()
          .append('tr')
          .append('td')
          .text(function(d) {
            return d.path;
          })
          .on('click', function(d) {
            stateManager.focus([{type: 'File', id: d.id}]);
          });
      });
    }, 10);
  };
}]);
