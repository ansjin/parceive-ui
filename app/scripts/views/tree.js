var margin = {top: 20, right: 120, bottom: 20, left: 120};
var height = 800 - margin.top - margin.bottom;

var i = 0;
var duration = 750;
var root;

angular.module('tree-view', ['app'])
.value('name', 'Tree view')
.value('group', 'Callgraph')
.value('markedCb', function() {})
.value('focusCb', function() {})
.value('hoverCb', function() {})
.service('render', ['d3', 'LoaderService', 'CallGraphDataService',
  'GradientService',
function(d3, loader, callgraph, GradientService) {
  var tree = d3.layout.tree()
    .size([1000, 1000]);
  var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

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
      d.y = d.depth * 180;
    });

    // Update the nodes…
    var node = callGroup.selectAll('g.node')
        .data(nodes, function(d) {
          return d.id || (d.id = ++i);
        });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('transform', function() {
          return 'translate(' + source.y0 + ',' + source.x0 + ')';
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
            data.children = _.map(graph.successors(data.id), function(node) {
              node = graph.node(node);
              return node;
            });
            update(svg, state, data);
          });
        });

    var durations = _.map(nodes, function(node) {
      return node.call.duration;
    });

    var min = _.min(durations);
    var max = _.max(durations);

    var gradient = GradientService.gradient(min, max);

    nodeEnter.append('circle')
        .attr('r', 1e-6)
        .style('fill', function(d) {
          return d.call.callsOthers > 0 ? gradient(d.call.duration) : '#fff';
        })
        .style('stroke', function(d) {
          return gradient(d.call.duration);
        });

    nodeEnter.append('text')
        .attr('x', function(d) {
          return d.isExpanded || d.call.callsOthers > 0 ? -10 : 10;
        })
        .attr('dy', '.35em')
        .attr('text-anchor', function(d) {
          return d.isExpanded || d.call.callsOthers > 0 ? 'end' : 'start';
        })
        .text(function(d) { return d.label; })
        .style('fill-opacity', 1e-6);

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(duration)
        .attr('transform', function(d) {
          return 'translate(' + d.y + ',' + d.x + ')';
        });

    nodeUpdate.select('circle')
        .attr('r', 4.5)
        .style('fill', function(d) {
          return d.call.callsOthers > 0 ? gradient(d.call.duration) : '#fff';
        })
        .style('stroke', function(d) {
          return gradient(d.call.duration);
        });

    nodeUpdate.select('text')
        .style('fill-opacity', 1);

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
        .data(links, function(d) {
          return d.target.id;
        });

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
        .attr('d', diagonal);

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
  }

  return function(svg, stateManager) {
    var state = stateManager.getData();

    if (!state.expanded || !state.expandedMemory) {
      state.expanded = [];
      state.expandedMemory = [];
      stateManager.save();
    }

    addZoom(svg);

    //var size = SizeService.svgSize(svg);

    tree.size([1000, 1000]);

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
