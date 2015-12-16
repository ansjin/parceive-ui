angular.module('cct-view', ['app'])
.value('name', 'CCT')
.value('group', 'Callgraph')
.value('markedCb', function() {})
.value('focusCb', function() {})
.value('hoverCb', function() {})
.service('render', ['CallGraphDataService', 'LoaderService', 'd3',
function(CallGraphDataService, loader, d3) {
  function addZoom(svg) {
    svg.call(d3.behavior.zoom().scaleExtent([1, 10]).on('zoom', zoom));

    var g = svg.append('g')
      .attr('class', 'callgraph');

    g.append('g')
      .attr('class', 'edges-group');

    g.append('g')
      .attr('class', 'calls-group');

    g.append('g')
      .attr('class', 'refs-group');

    function zoom() {
      g.attr('transform', 'translate(' + d3.event.translate +
                ')scale(' + d3.event.scale + ')');
    }
  }

  function render(svg, stateManager) {
    function rerender() {
      render(svg, stateManager);
    }

    function fail(err) {
      alert(err);
    }

    var state = stateManager.getData();
    var callgraph = state.unsaved.callgraph;

    var g = svg.select('g.callgraph');

    var callGroup = g.select('g.calls-group');
    //var refGroup = g.select('g.refs-group');
    //var edgeGroup = g.select('g.edges-group');

    function nodeClick(d) {
      if (d3.event.shiftKey) {
        switch (d.type) {
          case 'CallGroup':
            d.loadCalls().then(rerender, fail);
            break;
          case 'Call':
            d.toggleLoopExecutions().then(rerender, fail);
            break;
          case 'LoopExecution':
            d.toggleLoopIterations().then(rerender, fail);
            break;
        }
      } else if (d3.event.altKey) {
        d.toggleReferences().then(rerender, fail);
      } else {
        d.toggleChildren().then(rerender, fail);
      }
    }

    var calls = callgraph.getNodes();

    var callNodes = callGroup.selectAll('g.node')
      .data(calls, function(d) { return d.type + d.data.id; });

    callNodes
      .exit()
      .transition()
      .attr('transform', function(d) {
        if (d.parent) {
          return 'translate(' + d.parent.x + ',' + d.parent.y + ')';
        } else {
          return 'translate(0,0)';
        }
      })
      .style('opacity', 0)
      .remove();

    var callNodesEnter = callNodes
      .enter()
      .append('g')
      .classed('node', true)
      .on('click', nodeClick);

    callNodesEnter
      .style('opacity', 0)
      .attr('transform', function(d) {
        if (d.parent) {
          return 'translate(' + d.parent.x + ',' + d.parent.y + ')';
        } else {
          return 'translate(0,0)';
        }
      })
      .transition('enter')
      .style('opacity', 1);

    /* Compute node sizes */
    callgraph.computeSizes();

    /* Background */
    callNodesEnter.append('rect')
      .classed('call-bg', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', function(d) {
        return d.width + 20;
      })
      .attr('height', function(d) {
        return d.height + 10;
      });

    /* Label */
    callNodesEnter
      .append('text')
      .attr('x', 5)
      .attr('y', function(d) {
        return d.height;
      })
      .text(function(d) {
        return d.getLabel();
      });

    /* Update node type*/
    callNodes.classed('call', function(d) {
      return d.type === 'Call';
    })
    .classed('callgroup', function(d) {
      return d.type === 'CallGroup';
    })
    .classed('loopexecution', function(d) {
      return d.type === 'LoopExecution';
    })
    .classed('loopiteration', function(d) {
      return d.type === 'LoopIteration';
    });

    /* Calculate true size */
    callNodes.each(function(d) {
      var bbox = this.getBBox();
      d.width = bbox.width;
      d.height = bbox.height;
    });

    /* Layouting */
    callgraph.layout();

    /* Update positions after layout */
    callNodes
      .transition('layout')
      .attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });
  }

  return function(svg, stateManager) {
    addZoom(svg);

    var state = stateManager.getData();

    if (!state.unsaved.callgraph) {
      state.unsaved.callgraph = CallGraphDataService();
      loader.getFunctionBySignature('main').then(function(fct) {
        return fct.getCalls();
      }).then(function(calls) {
        return state.unsaved.callgraph.addCallRoot(calls[0]);
      }).then(function() {
        render(svg, stateManager);
      });
    } else {
      render(svg, stateManager);
    }
  };
}]);
