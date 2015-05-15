angular.module('test1-view', ['app'])
.value('name', 'Test view 1')
.value('group', 'Simple test views')
.value('markedChanged', function() {})
.value('focus', function() {})
.service('render', ['d3', function(d3) {
  return function(svg) {
    svg.selectAll('*').remove();

    svg
      .append('circle')
      .style('stroke', 'gray')
      .style('fill', 'blue')
      .attr('r', 40)
      .attr('cx', 50)
      .attr('cy', 50)
      .on('mouseover', function() {
        d3.select(this).style('fill', 'aliceblue');
      })
      .on('mouseout', function() {
        d3.select(this).style('fill', 'blue');
      });
  };
}]);

angular.module('test2-view', ['app'])
.value('name', 'Test view 2')
.value('group', 'Simple test views')
.value('markedChanged', function() {})
.value('focus', function() {})
.service('render', ['d3', function(d3) {
  return function(svg) {
    svg.selectAll('*').remove();

    svg
      .append('circle')
      .style('stroke', 'gray')
      .style('fill', 'red')
      .attr('r', 40)
      .attr('cx', 50)
      .attr('cy', 50)
      .on('mouseover', function() {
        d3.select(this).style('fill', 'aliceblue');
      })
      .on('mouseout', function() {
        d3.select(this).style('fill', 'red');
      });
  };
}]);

angular.module('test1-loader-view', ['app'])
.value('name', 'Loader view 1')
.value('group', 'Loader test views')
.value('markedChanged', function() {})
.value('focus', function() {})
.service('render', ['loader', function(loader) {
  return function(svg) {
    svg.selectAll('*').remove();

    loader.getFile('1').then(function(file) {
      svg
        .append('text')
        .attr('x', 10)
        .attr('y', 10)
        .text(file.name);

      file.getFunctions().then(function(fcts) {
        var y = 30;
        _.forEach(fcts, function(fct) {
          svg
            .append('text')
            .attr('x', 15)
            .attr('y', y)
            .text(fct.name);
          y += 20;
        });
      });
    });
  };
}]);

angular.module('tes2-loader-view', ['app'])
.value('name', 'Loader view 2')
.value('group', 'Loader test views')
.value('markedChanged', function() {})
.value('focus', function() {})
.service('render', ['loader', function(loader) {
  return function(svg) {
    svg.selectAll('*').remove();

    loader.getCall('1').then(function(call) {
      svg
        .append('text')
        .attr('x', 10)
        .attr('y', 10)
        .text(call.id);

      call.getInstructions().then(function(instrs) {
        var y = 30;
        _.forEach(instrs, function(instr) {
          var yc = y;
          svg
            .append('text')
            .attr('x', 15)
            .attr('y', y)
            .text(instr.type);

          instr.getReferences().then(function(refs) {
            var x = 80;

            _.forEach(refs, function(ref) {
              svg
                .append('text')
                .attr('x', x)
                .attr('y', yc)
                .text(ref.accessType + '-' + ref.address);
              x += 40;
            });
          });

          y += 20;
        });
      });
    });
  };
}]);
