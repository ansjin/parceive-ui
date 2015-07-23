angular.module('callgraph-view', ['app'])
.value('name', 'Callgraph')
.value('group', 'Calls')
.value('markedChanged', function() {})
.value('focus', function() {})
.service('render', ['loader', 'CallGraphDataService', 'd3', 'sizeHelper',
                    'dagre',
function(loader, callgraph, d3, sizeHelper, dagre) {
  function addZoom(svg) {
    svg.call(d3.behavior.zoom().scaleExtent([1, 10]).on('zoom', zoom));

    var g = svg.append('g')
      .attr('class', 'callgraph');

    function zoom() {
      g.attr('transform', 'translate(' + d3.event.translate +
                ')scale(' + d3.event.scale + ')');
    }
  }

  function render(svg, state) {
    var graph = state.unsaved.graph;

    dagre.layout(graph);

    var g = svg.select('g.callgraph');

    var nodes = _.chain(graph.nodes())
                  .sort()
                  .map(function(node) {
                    return graph.node(node);
                  })
                  .partition(function(node) {
                    return node.isCall;
                  })
                  .value();

    var calls = nodes[0];
    var refs = nodes[1];

    var callNodes = g.selectAll('text.call')
      .data(calls);
    callNodes.exit().remove();
    callNodes.enter()
      .append('text');
    callNodes.attr('class', function(d) {
        return 'call ' + (d.isExpanded ? 'expanded-call' : 'collapsed-call');
      })
      .text(function(d) {
        return d.label;
      })
      .attr('x', function(d) {
        return d.x;
      })
      .attr('y', function(d) {
        return d.y;
      })
      .on('click', function() {
        var data = d3.select(this).datum();

        var promise;

        if (data.isExpanded) {
          callgraph.collapseCall(graph, data.call);
          promise = RSVP.Promise.resolve();
        } else {
          promise = callgraph.expandCall(graph, data.call);
        }

        promise.then(function() {
          render(svg, state);
        });
      });

    var refNodes = g.selectAll('text.ref')
      .data(refs);
    refNodes.exit().remove();
    refNodes.enter()
      .append('text')
      .attr('class', 'ref');

    refNodes.attr('x', function(d) {
        return d.x;
      })
      .attr('y', function(d) {
        return d.y;
      })
      .text(function(d) {
        return d.label;
      });

    var edges = _.map(graph.edges(), function(e) {
      return _.merge(graph.edge(e), {
        from: graph.node(e.v),
        to: graph.node(e.w)
      });
    });

    var edgesNodes = g.selectAll('line')
      .data(edges);

    edgesNodes.enter()
      .append('line')
      .attr('class', function(d) {
        return 'edge ' + (d.to.isReference ? 'edge-ref' : 'edge-call');
      });
    edgesNodes.exit().remove();

    edgesNodes
      .attr('x1', function(d) {
        return d.from.x + d.from.width;
      })
      .attr('x2', function(d) {
        return d.to.x;
      })
      .attr('y1', function(d) {
        return d.from.y - d.from.height / 2;
      })
      .attr('y2', function(d) {
        return d.to.y - d.to.height / 2;
      });
  }

  return function(svg, stateManager) {
    var state = stateManager.getData();

    if (!state.expanded) {
      state.expanded = [];
      stateManager.save();
    }

    addZoom(svg);

    if (!state.unsaved.graph) {
      loader.getFunctionBySignature('main').then(function(fct) {
        return fct.getCalls();
      }).then(function(calls) {
        return callgraph.createGraph(calls[0], state.expanded, true);
      }).then(function(graph) {
        state.unsaved.graph = graph;
        render(svg, state);
      });
    } else {
      render(svg, state);
    }
  };
}]);
