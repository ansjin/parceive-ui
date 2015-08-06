angular.module('cola-view', ['app'])
.value('name', 'Cola view')
.value('group', 'Callgraph')
.value('markedChanged', function() {})
.value('focus', function() {})
.service('render', ['d3', 'cola', 'loader', 'CallGraphDataService',
                      'LayoutCallGraphService',
function(d3, cola, loader, callgraph, layout) {
  function addZoom(svg) {
    svg.call(d3.behavior.zoom().scaleExtent([1, 10]).on('zoom', zoom));

    var g = svg.append('g')
      .attr('class', 'callgraph');

    function zoom() {
      g.attr('transform', 'translate(' + d3.event.translate +
                ')scale(' + d3.event.scale + ')');
    }
  }

  var d3cola = cola.d3adaptor()
    .avoidOverlaps(true)
    .linkDistance(60)
    .flowLayout('x', 150)
    .size([1000, 1000]);

  function render(svg, state) {
    var graph = state.unsaved.graph;

    var g = svg.select('g.callgraph');

    var nodes = _.map(graph.nodes(), function(node, index) {
      node = graph.node(node);

      node.index = index;

      return node;
    });

    var edges = _.map(graph.edges(), function(e) {
      return _.merge(graph.edge(e), {
        from: graph.node(e.v),
        to: graph.node(e.w),
        source: graph.node(e.v).index,
        target: graph.node(e.w).index
      });
    });

    var partition = _.partition(nodes, function(node) {
      return node.isCall;
    });

    var calls = partition[0];
    var refs = partition[1];

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
          //d3cola.stop();
          render(svg, state);
        });
      });

    var refNodes = g.selectAll('text.ref')
      .data(refs);
    refNodes.exit().remove();
    refNodes.enter()
      .append('text')
      .attr('class', 'ref');

    refNodes.text(function(d) {
        return d.label;
      });

    var edgesNodes = g.selectAll('line')
      .data(edges);

    edgesNodes.enter()
      .append('line')
      .attr('class', function(d) {
        return 'edge ' + (d.to.isReference ? 'edge-ref' : 'edge-call');
      });
    edgesNodes.exit().remove();

    layout.layout(graph);

    _.forEach(calls, function(call) {
      call.fixed = true;
    });

    var rank = graph.graph().rank;

    var groups = [];

    var i;
    var j;

    for (i = 0; i < rank.length; i++) {
      var line = rank[i];
      var group = [];

      for (j = 0; j < line.length; j++) {
        group.push(line[j].index);
      }

      groups.push({
        groups: [],
        leaves: group
      });
    }

    d3cola
      .nodes(nodes)
      .links(edges)
      .groups(groups)
      .start();

    d3cola.on('tick', function() {
      edgesNodes
        .attr('x1', function(d) {
          return d.source.x + d.source.width;
        })
        .attr('x2', function(d) {
          return d.target.x;
        })
        .attr('y1', function(d) {
          return d.source.y - d.source.height / 2;
        })
        .attr('y2', function(d) {
          return d.target.y - d.target.height / 2;
        });

      callNodes
        .attr('x', function(d) {
          return d.x;
        })
        .attr('y', function(d) {
          return d.y;
        });

      refNodes
        .attr('x', function(d) {
          return d.x;
        })
        .attr('y', function(d) {
          return d.y;
        });
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
