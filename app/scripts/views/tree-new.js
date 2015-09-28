var margin = {top: 20, right: 120, bottom: 20, left: 120};
var height = 800 - margin.top - margin.bottom;

var i = 0;
var duration = 750;
var root;

angular.module('tree2-view', ['app'])
.value('name', 'Tree2 view')
.value('group', 'Callgraph')
.value('markedCb', function() {})
.value('focusCb', function() {})
.value('hoverCb', function() {})
.service('render', ['d3', 'LoaderService', 'CallGraphDataService',
                      'LayoutCallGraphService', 'SizeService',
                      'GradientService',
function(d3, loader, callgraph, layout, SizeService, GradientService) {
  var tree = d3.layout.tree()
    .size([1000, 1000]);
  var diagonal = d3.svg.diagonal()
    .projection(function(d) {
      return [d.y, d.x];
    });

  function addZoom(svg) {
    svg.call(d3.behavior.zoom().scaleExtent([0, 10]).on('zoom', zoom));

    var g = svg.append('g')
      .attr('class', 'callgraph');

    g.append('g')
      .attr('class', 'edges-group');

    g.append('g')
      .attr('class', 'calls-group');

    function zoom() {
      g.attr('transform', 'translate(' + d3.event.translate +
                ')scale(' + d3.event.scale + ')');
    }
  }

  function render(svg, state) {
    var graph = state.unsaved.graph;

    state.unsaved.nodes = graph.sources()[0];

    graph.sources().forEach(function(node) {
      root = graph.node(node);
      root.x0 = height / 2;
      root.y0 = 0;
    });

    update(svg, state, root);
  }

  function update(svg, state, source) {
    var g = svg.select('g.callgraph');
    var callGroup = g.select('g.calls-group');
    var edgeGroup = g.select('g.edges-group');

    var graph = state.unsaved.graph;
    var nodes = tree.nodes(root).reverse();
    var links = tree.links(nodes);

    // Normalize for fixed-depth.
    nodes.forEach(function(d) {
      d.y = d.depth * 300;
    });

    var nodeClick = function() {
      var data = d3.select(this).datum();
      var promise;

      if (data.isExpanded) {
        data._children = data.children;
        callgraph.collapseCall(graph, data.call);
        promise = RSVP.Promise.resolve();
      } else {
        promise = callgraph.expandCall(graph, data.call);
      }

      promise.then(function() {
        data.children = [];
        graph.successors(data.id).forEach(function(d) {
          var node = graph.node(d);
          var add = false;

          if (!node.isCall) {
            return;
          }

          var child = _.find(data._children, function(c) {
            return c.id === node.id;
          });

          if (child) {
            add = true;
          } else {
            var repr = _.find(data.children, function(c) {
              return c.label === node.label;
            });

            if (!repr) {
              add = true;
            } else {
              repr.count++;
            }
          }

          if (add) {
            data.children.push(
              _.merge(graph.node(d), {
                count: 0
              })
            );
          }
        });
        data.children.sort(function(a, b) {
          return a.start - b.start;
        });
        update(svg, state, data);
      });
    };

    // Update the nodes…
    var node = callGroup.selectAll('g.call')
        .data(nodes, function(d) {
          return d.id || (d.id = ++i);
        });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node
      .enter()
      .append('g')
      .attr('class', 'call')
      .attr('transform', function() {
        return 'translate(' + source.y0 + ',' + source.x0 + ')';
      });

    nodeEnter.append('rect')
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('width', function(d) {
        return d.width + 20;
      })
      .attr('height', function(d) {
        return d.height + 10;
      })
      .on('click', nodeClick);

    nodeEnter
      .append('text')
      .attr('x', 5)
      .attr('y', function(d) {
        return d.height;
      })
      .text(function(d) {
        return d.label;
      })
      .on('click', nodeClick);

    var durations = _.map(nodes, function(node) {
      return node.call.duration;
    });

    var min = _.min(durations);
    var max = _.max(durations);

    var gradient = GradientService.gradient(min, max);

    var clickLabel = function() {
      var node = d3.select(this).datum();
      var parent = d3.select(this).datum().parent;

      graph.successors(parent.id).forEach(function(d) {
        var child = graph.node(d);
        if (node.label === child.label && node.id !== child.id) {
          parent.children.push(child);
        }
      });
      node.count = 0;
      parent.children.sort(function(a, b) {
        return a.start - b.start;
      });
      parent._children = parent.children;
      update(svg, state, node);
    };

    function clickMemory() {
      var data = d3.select(this).datum();
      var promise;

      if (data.isMemoryExpanded) {
        callgraph.collapseCallMemory(graph, data.call);
        promise = RSVP.Promise.resolve();
      } else {
        promise = callgraph.expandCallMemory(graph, data.call);
      }

      promise.then(function() {
        update(svg, state, data);
      });
    }

    nodeEnter.append('circle')
      .classed('memCircle', true)
      .attr('cx', function(d) {
        return d.width + 18;
      })
      .attr('cy', function(d) {
        return d.height / 2 + 12;
      })
      .attr('r', 8)
      .attr('stroke', function(d) {
        return gradient(d.call.duration);
      })
      .on('click', clickMemory);

    var memClickNodes = callGroup.selectAll('circle.memCircle');

    memClickNodes.attr('fill', function(d) {
      if (d.isMemoryExpanded) {
        return 'yellow';
      } else {
        return 'white';
      }
    });

    nodeEnter.append('circle')
      .classed('labelCircle', true)
      .attr('cx', function(d) {
        return d.width + 18;
      })
      .attr('cy', function(d) {
        return d.height / 2 - 4;
      })
      .attr('r', function(d) {
        return d.count > 0 ? 10 : 0;
      })
      .attr('fill', 'white')
      .attr('stroke', function(d) {
        return gradient(d.call.duration);
      })
      .attr('stroke-width', 2)
      .style('stroke-opacity', function(d) {
        return d.call.callsOthers > 0 ? 1 : 0.5;
      })
      .on('click', clickLabel);

    nodeEnter.append('text')
      .classed('labelText', true)
      .attr('x', function(d) {
        return d.width + 18;
      })
      .attr('y', function(d) {
        return d.height / 2;
      })
      .attr('text-anchor', 'middle')
      .style('fill', 'black')
      .style('font-family', 'Arial')
      .style('font-size', function(d) {
        return d.count > 0 ? 14 : 0;
      })
      .text(function(d) {
        return d.count + 1;
      })
      .on('click', clickLabel);

    node
      .attr('fill', function(d) {
        return gradient(d.call.duration);
      });

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(duration)
        .attr('transform', function(d) {
          return 'translate(' + d.y + ',' + d.x + ')';
        });

    nodeUpdate.select('rect')
      .style('opacity', function(d) {
        return d.call.callsOthers > 0 ? 1 : 0.5;
      });

    nodeUpdate.select('text')
      .style('fill-opacity', 1);

    nodeUpdate.selectAll('.labelText')
      .style('font-size', function(d) {
        return d.count > 0 ? 14 : 0;
      });

    nodeUpdate.selectAll('.labelCircle')
      .attr('r', function(d) {
        return d.count > 0 ? 10 : 0;
      });

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
        .duration(duration)
        .attr('transform', function() {
          return 'translate(' + source.y + ',' + source.x + ')';
        })
        .remove();

    nodeExit.select('circle')
        .attr('r', 1e-6);

    nodeExit.select('text')
        .style('fill-opacity', 1e-6);

    // Update the links…
    var link = edgeGroup.selectAll('path.link')
        .data(links, function(d) { return d.target.id; });

    // Enter any new links at the parent's previous position.
    link.enter().insert('path', 'g')
        .attr('class', 'link')
        .attr('d', function() {
          var o = {x: source.x0, y: source.y0};
          return diagonal({source: o, target: o});
        });

    // Transition links to their new position.
    link.transition()
        .duration(duration)
        .attr('d', function(d) {
          var s = {x: d.source.x + (d.source.height + 10) / 2,
                   y: d.source.y + d.source.width + 20};
          var t = {x: d.target.x + (d.target.height + 10) / 2,
                   y: d.target.y};
          return diagonal({source: s, target: t});
        });

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(duration)
        .attr('d', function() {
          var o = {x: source.x, y: source.y};
          return diagonal({source: o, target: o});
        })
        .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });

    nodes = _.map(graph.nodes(), function(node, index) {
      node = graph.node(node);
      node.index = index;

      var copy = _.clone(node);

      copy.x = node.y;
      copy.y = node.x;

      return copy;
    });

    var edges = _.map(graph.edges(), function(e) {
      return _.merge(graph.edge(e), {
        from: graph.node(e.v),
        to: graph.node(e.w),
        source: graph.node(e.v).index,
        target: graph.node(e.w).index
      });
    });

    var edgesNodes = edgeGroup.selectAll('line')
      .data(_.filter(edges, function(edge) {
        return edge.to.isReference;
      }));

    edgesNodes.enter()
      .append('line')
      .attr('stroke', 'blue');

    var memNodes =
      g.selectAll('g.ref')
      .data(_.filter(nodes, function(node) {
        return node.isReference;
      }));

    var memNodesEnter = memNodes.enter()
      .append('g')
      .classed('ref', true);

    memNodesEnter.append('circle')
      .attr('class', 'ref-bg')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 10);

    memNodesEnter
      .append('text')
      .attr('x', 10)
      .attr('y', function(d) {
        return d.height;
      })
      .text(function(d) {
        return d.label;
      });

    var size = SizeService.svgSize(svg);

    var d3cola =
      d3.layout.force()
      .linkDistance(100)
      .linkStrength(0.1)
      .friction(0.9)
      .gravity(0)
      .size([size.height, size.width])
      .charge(function(d) {
        if (d.isCall) {
          return -500;
        } else {
          return -100;
        }
      });

    _.forEach(nodes, function(node) {
      if (node.isCall) {
        node.fixed = true;
      }
    });

    d3cola
      .nodes(nodes)
      .links(edges)
      .start();

    d3cola.on('tick', function() {
      edgesNodes
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

      memNodes
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

    tree.size([size.height, size.width]);

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
