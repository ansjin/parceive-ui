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
    var edgeGroup = g.select('g.edges-group');

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
          case 'LoopIteration':
            d.toggleLoopExecutions().then(rerender, fail);
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
      .data(calls, function(d) { return d.type + ':' + d.data.id; });

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
      .classed({
        'call': function(d) {return d.type === 'Call';},
        'callgroup': function(d) {return d.type === 'CallGroup';},
        'loopexecution': function(d) {return d.type === 'LoopExecution';},
        'loopiteration': function(d) {return d.type === 'LoopIteration';},
        'reference': function(d) {return d.type === 'Reference';},
      })
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
        return d.width + 10;
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

    var edges = callgraph.getEdges();

    var edgeNode = edgeGroup.selectAll('g.edge')
      .data(edges, function(d) {
        return d[0].type + ':' + d[0].data.id + '-' +
               d[1].type + ':' + d[1].data.id;
      });

    edgeNode
      .exit()
      .transition('opacity')
      .style('opacity', 0)
      .remove();

    var edgeNodesEnter = edgeNode
      .enter()
      .append('g')
      .classed('edge', true)
      .classed({
        'from-call': function(d) {return d[0].type === 'Call';},
        'to-call': function(d) {return d[1].type === 'Call';},
        'from-callgroup': function(d) {return d[0].type === 'CallGroup';},
        'to-callgroup': function(d) {return d[1].type === 'CallGroup';},
        'from-loopexecution':
          function(d) {return d[0].type === 'LoopExecution';},
        'to-loopexecution': function(d) {return d[1].type === 'LoopExecution';},
        'from-loopiteration':
          function(d) {return d[0].type === 'LoopIteration';},
        'tp-loopiteration': function(d) {return d[1].type === 'LoopIteration';},
        'from-reference': function(d) {return d[0].type === 'Reference';},
        'to-reference': function(d) {return d[1].type === 'Reference';},
      });

    edgeNodesEnter
      .style('opacity', 0)
      .transition('opacity')
      .style('opacity', 1);

    edgeNodesEnter
      .append('path');

    var edgeLines = edgeGroup.selectAll('g.edge > path');

    edgeLines.each(function(d) {
      d[0].midx = d[0].x + d[0].width / 2;
      d[0].midy = d[0].y + d[0].height / 2;

      d[1].midx = d[1].x + d[1].width / 2;
      d[1].midy = d[1].y + d[1].height / 2;
    });

    var diagonal = d3.svg.diagonal()
      .source(function(d) { return d[0]; })
      .target(function(d) { return d[1]; })
      .projection(function(d) { return [d.x, d.y]; });

    edgeLines.attr('d', diagonal);
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
