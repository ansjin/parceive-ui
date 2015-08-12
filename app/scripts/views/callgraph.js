var conf = {
  horisontalMargin: 20,
  verticalMargin: 0
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
        return node.isReference;
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
  rankCalls(graph);
  calcMaxSequence(graph);
  layoutCalls(graph);
  layoutRefs(graph);
}

angular.module('callgraph-view', ['app'])
.value('name', 'Callgraph')
.value('group', 'Calls')
.value('markedCb', function() {})
.value('focusCb', function() {})
.value('hoverCb', function() {})
.service('render', ['LoaderService', 'CallGraphDataService', 'd3', 'dagre',
function(loader, callgraph, d3, dagre) {
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
    layout(graph);

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
