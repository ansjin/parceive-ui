var opacityIgnore = 0.3;
var opacityNeighbour = 0.8;
var opacityHover = 1;

var hoverTransitionDuration = 50;
var hoverTransitionDelay = 0;

var opacityLineReference = 0.4;
var opacityLineCall = 0.2;

angular.module('force-view', ['app'])
.value('name', 'Force view')
.value('group', 'Callgraph')
.value('markedCb', function() {})
.value('focusCb', function() {})
.value('hoverCb', function(stateManager, elms) {
  var state = stateManager.getData();

  var nodes = state.unsaved.nodes;
  var refNodes = state.unsaved.refNodes;
  var callNodes = state.unsaved.callNodes;
  var edgesNodes = state.unsaved.edgesNodes;
  var graph = state.unsaved.graph;

  if (elms.length === 0) {
    refNodes
      .transition('hover')
      .duration(hoverTransitionDuration)
      .delay(hoverTransitionDelay)
      .style('opacity', opacityHover);
    callNodes
      .transition('hover')
      .duration(hoverTransitionDuration)
      .delay(hoverTransitionDelay)
      .style('opacity', opacityHover);
    edgesNodes
      .transition('hover')
      .duration(hoverTransitionDuration)
      .delay(hoverTransitionDelay)
      .style('opacity', opacityHover);
  } else {
    nodes.forEach(function(node) {
      node.hovered = false;
      node.neighbourHovered = false;
    });
    _.forEach(edgesNodes, function(edge) {
      edge.hovered = false;
    });

    _.forEach(elms, function(e) {
      var hoveredNode = _.find(nodes, function(node) {
        if (e.type === 'Call' && node.isCall) {
          return e.id === node.call.id;
        } else if (e.type === 'Reference' && node.isReference) {
          return e.id === node.reference.id;
        }
      });

      if (!hoveredNode) {
        return;
      }

      var index = hoveredNode.index;

      nodes[index].hovered = true;

      _.forEach(graph.nodeEdges(nodes[index].id), function(edge) {
        graph.edge(edge).hovered = true;
      });

      _.forEach(graph.successors(nodes[index].id), function(node) {
        graph.node(node).neighbourHovered = true;
      });

      _.forEach(graph.predecessors(nodes[index].id), function(node) {
        graph.node(node).neighbourHovered = true;
      });
    });

    refNodes
      .attr('stroke-width', function(d) {
        if (d.hovered) {
          return 2;
        } else {
          return 1;
        }
      });

    callNodes
      .attr('stroke-width', function(d) {
        if (d.hovered) {
          return 1.5;
        } else {
          return 1;
        }
      });

    callNodes
      .transition('hover')
      .duration(hoverTransitionDuration)
      .delay(hoverTransitionDelay)
      .style('opacity', function(d) {
        if (d.hovered) {
          return opacityHover;
        } else if (d.neighbourHovered) {
          return opacityNeighbour;
        } else {
          return opacityIgnore;
        }
      });

    refNodes
      .transition('hover')
      .duration(hoverTransitionDuration)
      .delay(hoverTransitionDelay)
      .style('opacity', function(d) {
        if (d.hovered) {
          return opacityHover;
        } else if (d.neighbourHovered) {
          return opacityNeighbour;
        } else {
          return opacityIgnore;
        }
      });

    edgesNodes
      .transition('hover')
      .duration(hoverTransitionDuration)
      .delay(hoverTransitionDelay)
      .style('opacity', function(d) {
        if (d.hovered) {
          return opacityHover;
        } else {
          return opacityIgnore;
        }
      });
  }
})
.service('render', ['d3', 'LoaderService', 'CallGraphDataService',
                      'LayoutCallGraphService', 'SizeService',
                      'GradientService',
function(d3, loader, callgraph, layout, SizeService, GradientService) {
  function addZoom(svg) {
    svg.call(d3.behavior.zoom().scaleExtent([0, 10]).on('zoom', zoom));

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

  var d3cola =
    d3.layout.force()
    .linkDistance(100)
    .linkStrength(0.1)
    .friction(0.9)
    .gravity(0)
    .size([1000, 1000])
    .charge(function(d) {
      if (d.isCall) {
        return -500;
      } else {
        return -100;
      }
    });

  function render(svg, state, stateManager) {
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

    var callNodes;
    var refNodes;

    callNodes = callGroup.selectAll('g.call')
      .data(calls);

    callNodes.exit()
      .transition('position')
      .style('opacity', 0)
      .attr('transform', function(d) {
        return 'translate(' + (d.x - d.width / 2) + ',' + 0 + ')';
      })
      .remove();

    var callNodesEnter = callNodes
      .enter()
      .append('g')
      .style('opacity', 0)
      .attr('transform', function(d) {
        return 'translate(' + (d.x - d.width / 2) + ',' + 0 + ')';
      })
      .classed('call', true);

    callNodesEnter.append('rect')
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
          render(svg, state, stateManager);
        });
      });

    callNodesEnter.append('rect')
      .attr('class', 'call-calls')
      .attr('x', function(d) {
        return d.width + 12;
      })
      .attr('y', 4)
      .attr('width', 6)
      .attr('height', function(d) {
        return d.height / 2 + 1;
      });

    var durations = _.map(calls, function(call) {
      return call.call.duration;
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
          render(svg, state, stateManager);
        });
      });

    callNodes
      .attr('fill', function(d) {
        return gradient(d.call.duration);
      });

    callNodes.each(function(d) {
      var bbox = this.getBBox();
      d.width = bbox.width;
      d.height = bbox.height;
    });

    layout.layout(graph);

    refNodes = refGroup.selectAll('g.ref')
      .data(refs);

    refNodes.exit()
      .remove();

    var refNodesEnter = refNodes
      .enter()
      .append('g')
      .on('mousedown', function() { d3.event.stopPropagation(); })
      .call(d3cola.drag)
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

    callNodes
      .classed('expanded-call', function(d) {
        return d.isExpanded;
      })
      .classed('memory-expanded-call', function(d) {
        return d.isMemoryExpanded;
      })
      .transition('position')
      .style('opacity', 1)
      .attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });

    _.forEach(calls, function(call) {
      call.fixed = true;
    });

    var edgesNodes = edgeGroup.selectAll('line')
      .data(edges);

    edgesNodes.enter()
      .append('line')
      .style('opacity', 0)
      .attr('class', function(d) {
        return 'edge ' + (d.to.isReference ? 'edge-ref' : 'edge-call');
      });

    edgesNodes
      .exit()
      .transition()
      .style('opacity', 0)
      .remove();

    edgesNodes
      .transition()
      .duration(3000)
      .style('opacity', function(d) {
        if (d.isCall) {
          return opacityLineCall;
        } else if (d.isReference) {
          return opacityLineReference;
        }
      });

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

    state.unsaved.refNodes = refNodes;
    state.unsaved.callNodes = callNodes;
    state.unsaved.nodes = nodes;
    state.unsaved.edgesNodes = edgesNodes;

    refNodes.on('mouseover', function(d) {
      stateManager.hover([
        {
          type: 'Reference',
          id: d.reference.id
        }
      ]);
    });
    callNodes.on('mouseover', function(d) {
      stateManager.hover([
        {
          type: 'Call',
          id: d.call.id
        }
      ]);
    });

    refNodes.on('mouseout', function() {
      stateManager.hover([]);
    });
    callNodes.on('mouseout', function() {
      stateManager.hover([]);
    });

    d3cola
      .nodes(nodes)
      .links(edges)
      .start();

    d3cola.on('tick', function() {
      refEdges
        .attr('x1', function(d) {
          var mid =  d.source.x + d.source.width / 2;

          if (d.target.x > mid) {
            return d.source.x + d.source.width;
          } else {
            return d.source.x;
          }
        })
        .attr('x2', function(d) {
          return d.target.x;
        })
        .attr('y1', function(d) {
          return d.source.y + d.source.height / 2;
        })
        .attr('y2', function(d) {
          return d.target.y;
        });

      refNodes
        .attr('transform', function(d) {
          nodes[d.index].x = d.x;
          nodes[d.index].y = d.y;
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
        render(svg, state, stateManager);
      });
    } else {
      render(svg, state, stateManager);
    }
  };
}]);
