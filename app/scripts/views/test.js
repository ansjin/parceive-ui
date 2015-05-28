angular.module('test1-view', ['app'])
.value('name', 'Test view 1')
.value('group', 'Simple test views')
.value('markedChanged', function() {})
.value('focus', function() {})
.service('render', ['d3', function(d3) {
  return function(svg, stateManager) {
    svg.selectAll('*').remove();

    var state = stateManager.getData();

    if (_.isUndefined(state.color)) {
      state.color = 'blue';
      stateManager.save();
    }

    svg
      .append('circle')
      .style('stroke', 'gray')
      .style('fill', state.color)
      .attr('r', 40)
      .attr('cx', 50)
      .attr('cy', 50)
      .on('click', function() {
        d3.select(this).style('fill', 'aliceblue');

        state.color = 'aliceblue';
        stateManager.save();
      })
      .on('dblclick', function() {
        d3.select(this).style('fill', 'blue');

        state.color = 'blue';
        stateManager.save();
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
.service('markedChanged', ['stateManager', function(stateManager) {
  return function(id) {
    var isMarked = stateManager.isMarked(id, 'File', 1);
    var state = stateManager.getData(id);

    state.unsaved.fileE.style('stroke', isMarked ? 'red' : 'blue');
  };
}])
.service('focus', ['stateManager', function(stateManager) {
  return function(id, focused) {
    var state = stateManager.getData(id);

    _.forEach(state.unsaved.fcts, function(fct) {
      var hasFocus = stateManager.checkFocus(focused, 'Function', fct.id);

      fct.fctE.style('stroke', hasFocus ? 'green' : 'blue');
    });
  };
}])
.service('render', ['loader', function(loader) {
  return function(svg, stateManager) {
    svg.selectAll('*').remove();

    loader.getFile('1').then(function(file) {
      var fileE = svg
        .append('text')
        .attr('x', 10)
        .attr('y', 10)
        .text(file.name);

      fileE.style('stroke', stateManager.isMarked('File', 1) ? 'red' : 'blue');

      fileE.on('click', function() {
        stateManager.mark('File', 1, !stateManager.isMarked('File', 1));
      });

      var state = stateManager.getData();

      state.unsaved.fileE = fileE;
      state.unsaved.fcts = [];

      file.getFunctions().then(function(fcts) {
        var y = 30;
        _.forEach(fcts, function(fct) {
          var fctE = svg
            .append('text')
            .attr('x', 15)
            .attr('y', y)
            .text(fct.signature)
            .style('stroke', 'blue');

          fctE.on('click', function() {
            stateManager.focus([{type: 'Function', id: fct.id}]);
          });

          state.unsaved.fcts.push({
            id: fct.id,
            fctE: fctE
          });

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

    loader.getFunctionBySignature('main').then(function(fct) {
      return fct.getCalls();
    }).then(function(calls) {
      return calls[0];
    }).then(function(call) {
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
                .text(ref.id + '-' + ref.type);
              x += 40;
            });
          });

          y += 20;
        });
      });
    });
  };
}]);
