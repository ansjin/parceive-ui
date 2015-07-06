angular.module('callgraph-view', ['app'])
.value('name', 'Callgraph')
.value('group', 'Calls')
.value('markedChanged', function() {})
.value('focus', function() {})
.service('render', ['loader', 'CallGraphDataService', 'd3',
function(loader, callgraph, d3) {
  function addZoom(svg) {
    var g = svg.append('g')
      .call(d3.behavior.zoom().scaleExtent([-10, 10]).on('zoom', zoom))
      .attr('class', 'callgraph');

    function zoom() {
      g.attr('transform', 'translate(' + d3.event.translate +
                ')scale(' + d3.event.scale + ')');
    }
  }

  function render(svg, state) {
    var graph = state.unsaved.graph;

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
        from: e.v,
        to: e.w
      });
    });

    var edgesNodes = g.selectAll('line')
      .data(edges);

    edgesNodes.enter()
      .append('line')
      .attr('class', 'edge');
    edgesNodes.exit().remove();

    edgesNodes
      .attr('x1', function(d) {
        return d.points[0].x;
      })
      .attr('x2', function(d) {
        return d.points[2].x;
      })
      .attr('y1', function(d) {
        return d.points[0].y;
      })
      .attr('y2', function(d) {
        return d.points[2].y;
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
