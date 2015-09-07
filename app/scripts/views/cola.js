angular.module('cola-view', ['app'])
.value('name', 'Cola view')
.value('group', 'Callgraph')
.value('markedCb', function() {})
.value('focusCb', function() {})
.value('hoverCb', function() {})
.service('render', ['d3', 'cola', 'LoaderService', 'CallGraphDataService',
                      'LayoutCallGraphService', 'SizeService',
                      'GradientService',
function(d3, cola, loader, callgraph, layout, SizeService, GradientService) {
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

  var d3cola = cola.d3adaptor()
    .avoidOverlaps(true)
    .linkDistance(60);

  function render(svg, state) {
    var graph = state.unsaved.graph;

    var g = svg.select('g.callgraph');

    var callGroup = g.select('g.calls-group');
    var refGroup = g.select('g.refs-group');
    var edgeGroup = g.select('g.edges-group');

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

    var callNodes = callGroup.selectAll('g.call')
      .data(calls);

    callNodes.exit()
      .remove();

    var callNodesEnter = callNodes
      .enter()
      .append('g')
      .classed('call', true);

    callNodesEnter.append('rect')
      .attr('class', 'call-bg')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', function(d) {
        return d.width + 20;
      })
      .attr('height', function(d) {
        return d.height + 10;
      });

    callNodesEnter.append('rect')
      .attr('class', 'call-refs')
      .attr('x', function(d) {
        return d.width + 12;
      })
      .attr('y', function(d) {
        return d.height / 2 + 6;
      })
      .attr('width', 6)
      .attr('height', function(d) {
        return d.height / 2 + 1;
      })
      .on('click', function() {
        var data = d3.select(this).datum();

        var promise;

        if (data.isMemoryExpanded) {
          callgraph.collapseCallMemory(graph, data.call);
          promise = RSVP.Promise.resolve();
        } else {
          promise = callgraph.expandCallMemory(graph, data.call);
        }

        promise.then(function() {
          //d3cola.stop();
          render(svg, state);
        });
      });

    callNodesEnter.append('rect')
      .attr('class', 'call-calls')
      .attr('x', function(d) {
        return d.width + 12;
      })
      .attr('y', 2)
      .attr('width', 6)
      .attr('height', function(d) {
        return d.height / 2 + 1;
      });

    var durations = _.map(calls, function(call) {
      return call.call.end - call.call.start;
    });

    var min = _.min(durations);
    var max = _.max(durations);

    var gradient = GradientService.gradient(min, max);

    callNodesEnter
      .append('text')
      .attr('x', 5)
      .attr('y', function(d) {
        return d.height;
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

    callNodes
      .selectAll('text')
      .attr('fill', function(d) {
        return gradient(d.call.end - d.call.start);
      });

    callNodes.each(function(d) {
      var bbox = this.getBBox();
      d.width = bbox.width;
      d.height = bbox.height;
    });

    var refNodes = refGroup.selectAll('g.ref')
      .data(refs);

    refNodes.exit()
      .remove();

    var refNodesEnter = refNodes
      .enter()
      .append('g')
      .classed('ref', true);

    refNodesEnter.append('circle')
      .attr('class', 'ref-bg')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 10);

    refNodesEnter
      .append('text')
      .attr('x', 10)
      .attr('y', function(d) {
        return d.height;
      })
      .text(function(d) {
        return d.label;
      });

    layout.layout(graph);

    callNodes
      .attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      })
      .classed('expanded-call', function(d) {
        return d.isExpanded;
      })
      .classed('memory-expanded-call', function(d) {
        return d.isMemoryExpanded;
      });

    _.forEach(calls, function(call) {
      call.fixed = true;
    });

    var edgesNodes = edgeGroup.selectAll('line')
      .data(edges);

    edgesNodes.enter()
      .append('line')
      .attr('class', function(d) {
        return 'edge ' + (d.to.isReference ? 'edge-ref' : 'edge-call');
      });
    edgesNodes.exit().remove();

    var refEdges = edgeGroup.selectAll('line.edge-ref');
    var callEdges = edgeGroup.selectAll('line.edge-call');

    callEdges
      .attr('x1', function(d) {
        return nodes[d.source].x + nodes[d.source].width;
      })
      .attr('x2', function(d) {
        return nodes[d.target].x;
      })
      .attr('y1', function(d) {
        return nodes[d.source].y + nodes[d.source].height / 2;
      })
      .attr('y2', function(d) {
        return nodes[d.target].y + nodes[d.target].height / 2;
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

    refNodes.each(function(d) {
      var bbox = this.getBBox();
      d.width = bbox.width;
      d.height = bbox.height;
    });

    d3cola
      .nodes(nodes)
      .links(edges)
      .groups(groups)
      .start();

    d3cola.on('tick', function() {
      refEdges
        .attr('x1', function(d) {
          return d.source.x + d.source.width / 2;
        })
        .attr('x2', function(d) {
          return d.target.x + d.target.width / 2;
        })
        .attr('y1', function(d) {
          return d.source.y + d.source.height / 2;
        })
        .attr('y2', function(d) {
          return d.target.y + d.target.height / 2;
        });

      refNodes
        .attr('transform', function(d) {
          return 'translate(' + d.x + ',' + d.y + ')';
        });
    });
  }

  return function(svg, stateManager) {
    var state = stateManager.getData();

    if (!state.expanded || !state.expandedMemory) {
      state.expanded = [];
      state.expandedMemory = [];
      stateManager.save();
    }

    addZoom(svg);

    var size = SizeService.svgSize(svg);

    d3cola.size([size.width, size.height]);

    if (!state.unsaved.graph) {
      loader.getFunctionBySignature('main').then(function(fct) {
        return fct.getCalls();
      }).then(function(calls) {
        return callgraph.createGraph(calls[0], state.expanded,
                                          state.expandedMemory);
      }).then(function(graph) {
        state.unsaved.graph = graph;
        render(svg, state);
      });
    } else {
      render(svg, state);
    }
  };
}]);
