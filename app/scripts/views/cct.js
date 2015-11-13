angular.module('force-view', ['app'])
.value('name', 'Force view')
.value('group', 'Callgraph')
.value('markedCb', function() {})
.value('focusCb', function() {})
.value('hoverCb', function() {})
.service('render', ['CallGraphDataService', 'LoaderService', 'd3',
function(CallGraphDataService, loader, d3) {
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

  function render(svg, stateManager) {
    var state = stateManager.getData();
    var callgraph = state.unsaved.callgraph;

    var g = svg.select('g.callgraph');

    var callGroup = g.select('g.calls-group');
    var refGroup = g.select('g.refs-group');
    var edgeGroup = g.select('g.edges-group');

    var calls = callgraph.getCalls();

    var callNodes = callGroup.selectAll('g.call')
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
      .classed('call', true)
      .style('opacity', 0);

    /* Background */
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

    /* Label */
    callNodesEnter
      .append('text')
      .attr('x', 5)
      .attr('y', function(d) {
        return d.height;
      })
      .text(function(d) {
        return d.label;
      });

    /* Calculate size */
    callNodes.each(function(d) {
      var bbox = this.getBBox();
      d.width = bbox.width;
      d.height = bbox.height;
    });

    callgraph.layout();

    /* Update positions after layout */
    callNodes
      .transition('position')
      .attr('transform', function(d) {
        return 'translate(' + (d.x - d.width / 2) + ',' + 0 + ')';
      });
  }

  return function(svg, stateManager) {
    addZoom(svg);

    var state = stateManager.getData();

    if (!state.unsaved.callgraph) {
      state.unsaved.callgraph = CallGraphDataService();
      loader.getFunctionBySignature('main').then(function(fct) {
        return fct.getCalls();
      }).then(function(calls) {
        state.unsaved.callgraph.addCallRoot(calls[0]);
        render(svg, stateManager);
      });
    } else {
      render(svg, stateManager);
    }
  };
}]);
