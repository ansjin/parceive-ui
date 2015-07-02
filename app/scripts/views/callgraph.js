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

    g.selectAll('text.call')
      .data(calls)
      .enter()
      .append('text')
      .attr('class', 'call')
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

    g.selectAll('text.ref')
      .data(refs)
      .enter()
      .append('text')
      .attr('class', 'ref')
      .attr('x', function(d) {
        return d.x;
      })
      .attr('y', function(d) {
        return d.y;
      })
      .text(function(d) {
        return d.label;
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
