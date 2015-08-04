var conf = {
  horisontalMargin: 20,
  verticalMargin: 0,
  layout: 'self'
};

function clearLayout(graph) {
  _.chain(graph.nodes())
    .map(function(node) {
      return graph.node(node);
    })
    .forEach(function(node) {
      delete node.x;
      delete node.y;
      delete node.rank;
      delete node.maxSequence;
    })
    .value();

  var g = graph.graph();

  delete g.rank;
}

function rankCalls(graph) {
  var roots =
    _.chain(graph.sources())
      .map(function(node) {
        return graph.node(node);
      })
      .filter(function(node) {
        return node.isCall;
      })
      .value();

  var rank = [roots];

  var index = 0;
  var i;
  var j;

  while (true) {
    var last = rank[index];
    var current = [];

    for (i = 0; i < last.length; i++) {
      var successors = graph.successors(last[i].id);

      for (j = 0; j < successors.length; j++) {
        var node = graph.node(successors[j]);

        if (node.isCall) {
          current.push(node);
        }
      }
    }

    index++;

    if (current.length > 0) {
      rank.push(current);
    } else {
      break;
    }
  }

  for (i = 0; i < rank.length; i++) {
    var line = rank[i];

    for (j = 0; j < line.length; j++) {
      line[j].rank = i;
    }
  }

  graph.graph().rank = rank;
}

function calcMaxSequence(graph) {
  var i;
  var j;

  var current = graph.sinks();
  var next = [];

  for (i = 0; i < current.length; i++) {
    var node = graph.node(current[i]);
    if (node.isCall) {
      next.push(current[i]);
    } else if (node.isReference) {
      var scall = graph.predecessors(current[i]);
      for (j = 0; j < scall.length; j++) {
        if (graph.node(scall[j]).isCall && next.indexOf(scall[j]) === -1) {
          next.push(scall[j]);
        }
      }
    }
  }

  current = next;

  var at = 0;
  do {
    next = [];

    for (i = 0; i < current.length; i++) {
      graph.node(current[i]).maxSequence = at;

      var pred = graph.predecessors(current[i]);

      for (j = 0; j < pred.length; j++) {
        if (graph.node(pred[j]).isCall && next.indexOf(pred[j]) === -1) {
          next.push(pred[j]);
        }
      }
    }

    at++;
    current = next;
  } while (current.length > 0);
}

function maxWidth(nodes) {
  var max = nodes[0].width;

  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].width > max) {
      max = nodes[i].width;
    }
  }

  return max;
}

function layoutCalls(graph) {
  var i;
  var j;

  var x = 0;
  var y = 0;

  var rank = graph.graph().rank;

  function sortByMaxSequence(a, b) {
    return a.maxSequence < b.maxSequence;
  }

  for (i = 0; i < rank.length; i++) {
    rank[i].sort(sortByMaxSequence);
  }

  for (i = 0; i < rank.length; i++) {
    var width = maxWidth(rank[i]);

    y = 0;
    for (j = 0; j < rank[i].length; j++) {
      rank[i][j].x = x;
      rank[i][j].y = y;

      if (y >= 0) {
        y += rank[i][j].height + conf.verticalMargin;
      } else {
        y -= rank[i][j].height + conf.verticalMargin;
      }

      y = -y;
    }

    x += width + conf.horisontalMargin;
  }
}

function layoutRefs(graph) {
  var x = 0;
  var y = -300;

  _.chain(graph.nodes())
      .map(function(node) {
        return graph.node(node);
      })
      .filter(function(node) {
        return node.isReference || node.isGroup;
      })
      .forEach(function(node) {
        node.x = x;
        node.y = y;

        x += node.width;
      })
      .value();

}

function layout(graph) {
  clearLayout(graph);
  /*rankCalls(graph);
  calcMaxSequence(graph);
  layoutCalls(graph);
  layoutRefs(graph);*/
}

function groupRefs(graph, ret) {
  var groups = [];

  function addToGroup(node) {
    var group = _.find(groups, function(group) {
      return _.isEqual(group.inbound, graph.predecessors(node.id));
    });

    if (group) {
      group.elements.push(node);
    } else {
      group = {
        isGroup: true,
        elements: [node],
        inbound: graph.predecessors(node.id),
        id: 'group:ref:' + groups.length,
        label: 'Grouped references',
        height: 50,
        width: 150
      };

      groups.push(group);
    }
  }

  _.chain(graph.nodes())
    .map(function(node) {
      return graph.node(node);
    })
    .filter(function(node) {
      return node.isReference;
    })
    .forEach(function(node) {
      addToGroup(node);
    })
    .value();

  _.forEach(groups, function(group) {
    if (group.elements.length > 1) {
      ret.setNode(group.id, group);
    } else {
      ret.setNode(group.elements[0].id, group.elements[0]);
    }

  });

  ret.graph().refGroups = groups;
}

function groupCalls(graph, ret) {
  _.chain(graph.nodes())
    .map(function(node) {
      return graph.node(node);
    })
    .filter(function(node) {
      return node.isCall;
    })
    .forEach(function(node) {
      ret.setNode(node.id, node);
    })
    .value();
}

function addEdges(graph, ret) {
  var groups = ret.graph().refGroups;

  _.forEach(groups, function(group) {
    if (group.elements.length > 1) {
      var preds = group.inbound;

      for (var i = 0; i < preds.length; i++) {
        ret.setEdge(preds[i], group.id, {});
      }
    }
  });

  _.chain(ret.nodes())
    .map(function(node) {
      return ret.node(node);
    })
    .filter(function(node) {
      return node.isReference || node.isCall;
    })
    .forEach(function(node) {
      var preds = graph.predecessors(node.id);

      for (var i = 0; i < preds.length; i++) {
        ret.setEdge(preds[i], node.id, graph.edge(preds[i], node.id));
      }
    })
    .value();
}

function groupGraph(graph) {
  var ret = new dagre.graphlib.Graph({
    directed: true
  });

  ret.setGraph(graph.graph());

  groupRefs(graph, ret);
  groupCalls(graph, ret);
  addEdges(graph, ret);

  return ret;
}

angular.module('callgraph-view', ['app'])
.value('name', 'Callgraph')
.value('group', 'Calls')
.value('markedChanged', function() {})
.value('focus', function() {})
.service('render', ['loader', 'CallGraphDataService', 'd3', 'dagre', 'cola',
function(loader, callgraph, d3, dagre, cola) {
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

    var nodes;
    var calls;
    var refs;
    var edges;

    var usingCola = false;
    var d3cola;

    function setUpGraph() {
      nodes = _.chain(graph.nodes())
                    .sort()
                    .map(function(node, index) {
                      var nodeLabel = graph.node(node);

                      nodeLabel.index = index;

                      return nodeLabel;
                    })
                    .partition(function(node) {
                      return node.isCall;
                    })
                    .value();

      calls = nodes[0];
      refs = nodes[1];

      edges = _.map(graph.edges(), function(e) {
        return _.merge(graph.edge(e), {
          source: graph.node(e.v).index,
          target: graph.node(e.w).index,
          from: graph.node(e.v),
          to: graph.node(e.w)
        });
      });
    }

    if (conf.layout === 'dagre') {
      dagre.layout(graph);
      setUpGraph();
    } else if (conf.layout === 'self') {
      graph = groupGraph(graph);
      layout(graph);

      setUpGraph();

      /*_.forEach(calls, function(call) {
        call.fixed = true;
      });*/

      d3cola = cola.d3adaptor();

      d3cola
        .size([1000, 1000])
        .nodes(nodes)
        .links(edges)
        .symmetricDiffLinkLengths(5)
        .start(30);

      usingCola = true;
    } else {
      return;
    }

    var g = svg.select('g.callgraph');

    var callNodes = g.selectAll('text.call')
      .data(calls);
    callNodes.exit().remove();
    callNodes.enter()
      .append('text');

    var refNodes = g.selectAll('text.ref')
      .data(refs);
    refNodes.exit().remove();
    refNodes.enter()
      .append('text')
      .attr('class', 'ref');

    var edgesNodes = g.selectAll('line')
      .data(edges);

    edgesNodes.enter()
      .append('line')
      .attr('class', function(d) {
        return 'edge ' + (d.to.isReference ? 'edge-ref' : 'edge-call');
      });
    edgesNodes.exit().remove();

    d3cola.on('tick', function() {
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
            callgraph.collapseCall(state.unsaved.graph, data.call);
            promise = RSVP.Promise.resolve();
          } else {
            promise = callgraph.expandCall(state.unsaved.graph, data.call);
          }

          promise.then(function() {
            d3cola.stop();
            render(svg, state);
          });
        });

      refNodes.attr('x', function(d) {
          return d.x;
        })
        .attr('y', function(d) {
          return d.y;
        })
        .text(function(d) {
          return d.label;
        });

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
        stateManager.save();
        render(svg, state);
      }).catch(function(err) {
        debugger;
      });
    } else {
      render(svg, state);
    }
  };
}]);
