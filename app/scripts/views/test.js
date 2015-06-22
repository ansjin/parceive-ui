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

          instr.getAccesses().then(function(accesses) {
            var x = 80;

            _.forEach(accesses, function(access) {
              access.getReference().then(function(ref) {
                svg
                  .append('text')
                  .attr('x', x)
                  .attr('y', yc)
                  .text(ref.id + '-' + ref.type);
                x += 40;
              });
            });
          });

          y += 20;
        });
      });
    });
  };
}]);

angular.module('test5-view', ['app'])
.value('name', 'Test view 5')
.value('group', 'Dagre test views')
.value('markedChanged', function() {})
.value('focus', function() {})
.service('render', ['loader', 'dagre', function(loader, dagre) {
  return function doRender(svg, stateManager) {
    svg.selectAll('*').remove();

    var state = stateManager.getData();

    if (!state.expanded) {
      state.expanded = [];
      stateManager.save();
    }

    function hasNode(node) {
      return _.includes(state.expanded, node);
    }

    function toggleNode(node) {
      var index = state.expanded.indexOf(node);

      if (index > -1) {
        state.expanded.splice(index, 1);
      } else {
        state.expanded.push(node);
      }

      stateManager.save();
    }

    var g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: 'LR'
    });

    function textDims(text) {
      var textE = svg
        .append('text')
        .text(text);

      var size = textE.node().getBBox();

      textE.remove();

      return size;
    }

    function addCall(previous, call) {
      if (g.hasNode(call.id)) {
        return RSVP.Promise.resolve();
      }

      return call.getFunction().then(function(fct) {
        var size = textDims(fct.signature);

        g.setNode(call.id, {
          label: fct.signature,
          width: size.width,
          height: size.height
        });

        if (previous) {
          g.setEdge(previous.id, call.id, {});
        }

        if (hasNode(call.id)) {
          return call.getCalls();
        }
      }).then(function(calls) {
        if (calls) {
          return RSVP.all(_.map(calls, function(ncall) {
            return addCall(call, ncall);
          }));
        } else {
          return;
        }
      });
    }

    loader.getFunctionBySignature('main').then(function(fct) {
      return fct.getCalls();
    }).then(function(calls) {
      return addCall(null, calls[0]);
    }).then(function() {
      dagre.layout(g);

      _.forEach(g.nodes(), function(nodeID) {
        var node = g.node(nodeID);
        var rx = node.x - node.width / 2;
        var ry = node.y - node.height / 2;

        svg
          .append('rect')
          .style('stroke', 'gray')
          .style('fill', 'white')
          .attr('width', node.width)
          .attr('height', node.height)
          .attr('x', rx)
          .attr('y', ry)
          .on('click', function() {
            toggleNode(nodeID);
            doRender(svg, stateManager);
          });

        svg
          .append('text')
          .attr('x', rx)
          .attr('y', node.y + 4)
          .text(node.label)
          .on('click', function() {
            toggleNode(nodeID);
            doRender(svg, stateManager);
          });
      });

      _.forEach(g.edges(), function(edgeObj) {
        var edge = g.edge(edgeObj.v, edgeObj.w);

        var pct1 = edge.points[0];
        var pct2 = edge.points[2];

        svg.append('line')
          .attr('x1', pct1.x)
          .attr('y1', pct1.y)
          .attr('x2', pct2.x)
          .attr('y2', pct2.y)
          .style('stroke', 'red');
      });

      svg
        .style('overflow', 'auto');
    });
  };
}]);

angular.module('test6-view', ['app'])
.value('name', 'Test view 6')
.value('group', 'Stress tests')
.value('markedChanged', function() {})
.value('focus', function() {})
.service('render', ['loader', function(loader) {
  return function doRender(svg) {
    RSVP.all([
      loader.getAccesses(),
      loader.getCalls(),
      loader.getFiles(),
      loader.getFunctions(),
      loader.getInstructions(),
      loader.getReferences(),
      loader.getSegments(),
      loader.getThreads()
    ]).then(function() {
      svg.selectAll('*').remove();
      svg.append('text')
        .attr('x', 100)
        .attr('y', 100)
        .text('done');
    }).catch(function(err) {
      svg.selectAll('*').remove();
      svg.append('text')
        .attr('x', 100)
        .attr('y', 100)
        .text(err);
    });
  };
}]);
