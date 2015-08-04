angular.module('cola-view', ['app'])
.value('name', 'Cola')
.value('group', 'Calls')
.value('markedChanged', function() {})
.value('focus', function() {})
.service('render', ['d3', 'cola', 'loader', 'CallGraphDataService',
function(d3, cola, loader, callgraph) {
  function render(svg, state) {
    var graph = state.unsaved.graph;

    var nodes = _.map(graph.nodes(), function(node, index) {
      node = graph.node(node);
      node.index = index;
      return node;
    });

    var edges = _.map(graph.edges(), function(edge) {
      var edgeLabel = graph.edge(edge);

      edgeLabel.source = graph.node(edge.v).index;
      edgeLabel.target = graph.node(edge.w).index;

      return edgeLabel;
    });

    var d3cola = cola.d3adaptor().convergenceThreshold(0.1);

    d3cola
      .avoidOverlaps(true)
      .convergenceThreshold(1e-3)
      .flowLayout('x', 150)
      .size([1000, 1000])
      .nodes(nodes)
      .links(edges)
      .jaccardLinkLengths(150);

    var g = svg.select('g.callgraph');

    var node = g.selectAll(".node")
      .data(nodes)
      .enter().append("rect")
      .classed("node", true)
      .attr({ rx: 5, ry: 5 })
      .call(d3cola.drag);

    d3cola.start(50, 100, 2000).on("tick", function () {
      node
        .attr("x", function (d) { return d.x; })
        .attr("y", function (d) { return d.y; })
        .attr("width", function (d) {
            return d.width;
        })
        .attr("height", function (d) {
          return d.height;
        });
    });



  }

  function addZoom(svg) {
    svg.call(d3.behavior.zoom().scaleExtent([1, 10]).on('zoom', zoom));

    var g = svg.append('g')
      .attr('class', 'callgraph');

    function zoom() {
      g.attr('transform', 'translate(' + d3.event.translate +
                ')scale(' + d3.event.scale + ')');
    }
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
