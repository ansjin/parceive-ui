function applyMarked(state, nodes, changes) {
  nodes.forEach(function(node) {
    var fnode =  _.find(changes, function(change) {
      return change.type === node.type && change.id === node.data.id;
    });

    if (!_.isUndefined(fnode)) {
      node.isMarked = fnode.isMarked;
    }
  });

  var markedNodes = _.filter(nodes, function(node) {
    return node.isMarked;
  });

  state.unsaved.callGroup.selectAll('g.node > rect.call-bg')
    .attr('fill', function(d) {
      if (d.isMarked) {
        return state.unsaved.gradient(d.data.duration);
      } else {
        return state.unsaved.gradientBright(d.data.duration);
      }
    });

  state.unsaved.callGroup.selectAll('g.node > text.call-bg')
    .attr('fill', function(d) {
      if (d.isMarked) {
        return 'white';
      } else {
        return state.unsaved.gradient(d.data.duration);
      }
    });
}

angular.module('cct-view', ['app'])
.value('name', 'CCT')
.value('group', 'Callgraph')
.value('spotCb', function(stateManager, elements) {
  elements = _.filter(elements, function(element) {
    return !element.neighbour && (
      element.type === 'Call' || element.type === 'CallGroup'
    );
  });

  var state = stateManager.getData();
  var callgraph = state.unsaved.callgraph;

  callgraph.spot(elements).then(state.unsaved.rerender);
})
.value('markedCb', function(stateManager, changes) {
  var state = stateManager.getData();
  var callgraph = state.unsaved.callgraph;
  var nodes = callgraph.getNodes();

  changes = _.filter(changes, function(change) {
    return !change.neighbour;
  });

  applyMarked(state, nodes, changes);
})
.value('focusCb', function(stateManager, focused) {
  var state = stateManager.getData();
  var callgraph = state.unsaved.callgraph;
  var svg = state.unsaved.svg;

  var nodes = callgraph.getNodes();

  var interesting = _.filter(focused, function(el) {
    return !el.neighbour && (
                            el.type === 'Call' || el.type === 'CallGroup' ||
                            el.type === 'LoopIteration' ||
                            el.type === 'LoopExecution'
                          );
  });

  if (interesting.length === 0) {
    return;
  }

  var node = _.find(nodes, function(node) {
    return _.any(interesting, function(el) {
      return el.id === node.data.id && el.type === node.type;
    });
  });

  if (_.isUndefined(node)) {
    return;
  }

  svg.focus([node.x, node.y]);
})
.value('hoverCb', function(stateManager, hovered) {
  var state = stateManager.getData();
  var callgraph = state.unsaved.callgraph;
  var nodes = callgraph.getNodes();

  if (hovered.length === 0) {
    state.unsaved.callGroup.selectAll('g.node')
      .transition('opacity')
      .style('opacity', function(d) {
        return d.normalOpacity ? d.normalOpacity : 1;
      });
  } else {
    _.forEach(nodes, function(node) {
      node.isHovered = false;
      node.isNeighbourHovered = false;
    });

    _.forEach(hovered, function(toFind) {
      var node = _.find(nodes, function(node) {
        return node.type === toFind.type && node.data.id === toFind.id;
      });

      if (node) {
        if (toFind.neighbour) {
          node.isNeighbourHovered = true;
        } else {
          node.isHovered = true;
        }
      }
    });

    state.unsaved.callGroup.selectAll('g.node')
      .transition('opacity')
      .style('opacity', function(d) {
        if (d.isHovered) {
          return 1;
        } else if (d.isNeighbourHovered) {
          return (d.normalOpacity ? d.normalOpacity : 1) - 0.5;
        } else {
          return (d.normalOpacity ? d.normalOpacity : 1) - 0.6;
        }
      });
  }
})
.service('render', ['CallGraphDataService', 'LoaderService', 'd3', 'KeyService',
                    'GradientService', 'jquery', 'SizeService',
function(CallGraphDataService, loader, d3, keyService, GradientService, $,
          SizeService) {
  var bgColors = d3.scale.category20();
  function refColors(type) {
    switch (type) {
      case 1: return d3.rgb("cornflowerblue");
      case 2: return d3.rgb("darkorange");
      case 3: return d3.rgb("tomato");
      case 4: return d3.rgb("gold");
      case 5: return d3.rgb("lightgreen");
    }
  };

  function addZoom(svg) {
    var zoom = d3.behavior.zoom();

    svg.call(zoom.on('zoom', zoomEvent));

    var defs = svg.append('defs');

    /* jscs: disable */

    defs.append('path')
      .attr('id', 'execution')
      .attr('d', 'M1536 1280v-448q0 -26 -19 -45t-45 -19h-448q-42 0 -59 40q-17 39 14 69l138 138q-148 137 -349 137q-104 0 -198.5 -40.5t-163.5 -109.5t-109.5 -163.5t-40.5 -198.5t40.5 -198.5t109.5 -163.5t163.5 -109.5t198.5 -40.5q119 0 225 52t179 147q7 10 23 12q14 0 25 -9 l137 -138q9 -8 9.5 -20.5t-7.5 -22.5q-109 -132 -264 -204.5t-327 -72.5q-156 0 -298 61t-245 164t-164 245t-61 298t61 298t164 245t245 164t298 61q147 0 284.5 -55.5t244.5 -156.5l130 129q29 31 70 14q39 -17 39 -59z')
      .attr('horiz-adv-x', '448');

    defs.append('path')
      .attr('id', 'iteration')
      .attr('d', 'M765 1043q-9 -19 -29 -19h-224v-1248q0 -14 -9 -23t-23 -9h-192q-14 0 -23 9t-9 23v1248h-224q-21 0 -29 19t5 35l350 384q10 10 23 10q14 0 24 -10l355 -384q13 -16 5 -35z')
      .attr('horiz-adv-x', '768');

    defs.append('filter')
      .attr('id', 'blurFilter')
      .append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', 8);

    var markedFilter = defs.append('filter')
      .attr('id', 'marked');

    markedFilter.append('feFlood')
      .attr('flood-color', 'blue')
      .attr('flood-opacity', '.2')
      .attr('result','flood');

    var markedFilterMerge = markedFilter.append('feMerge');

    markedFilterMerge
      .append('feMergeNode')
      .attr('in', 'SourceGraphic');

    markedFilterMerge
      .append('feMergeNode')
      .attr('in', 'flood');

    /* jscs: enable */

    var g = svg.append('g')
      .attr('class', 'callgraph');

    g.append('g')
      .attr('class', 'bg-group')
        .append('g')
        .attr('class', 'loop-bg-group');

    g.append('g')
      .attr('class', 'edges-group');

    g.append('g')
      .attr('class', 'refs-group');

    g.append('g')
      .attr('class', 'calls-group');

    function zoomEvent() {
      g.attr('transform', 'translate(' + d3.event.translate +
                ')scale(' + d3.event.scale + ')');
    }

    svg.focus = function(pos) {
      var x = pos[0];
      var y = pos[1];

      var svgSize = SizeService.svgSize(svg);

      var cx = svgSize.width / 2;
      var cy = svgSize.height / 2;

      var tx = cx - x;
      var ty = cy - y;

      pos = [tx, ty];

      zoom.translate(pos);
      zoom.scale(1);

      g
        .transition()
        .attr('transform', 'translate(' + pos[0] + ', ' + pos[1]+ ')scale(1)');
    };
  }

  function calcEdgePoints(d) {
    d.source = {
      elem: d[0]
    };

    d.target = {
      elem: d[1]
    };

    if (d[0].type !== 'Reference' && d[1].type !== 'Reference') {
      d.source.x = d[0].x + d[0].width;
      d.source.y = d[0].y + d[0].height / 2;
      d.target.x = d[1].x;
      d.target.y = d[1].y + d[1].height / 2;
    } else {
      var smidx = d[0].x + d[0].width / 2;
      var smidy = d[0].y + d[0].height / 2;

      var tmidx = d[1].x + d[1].width / 2;
      var tmidy = d[1].y + d[1].height / 2;

      var angle = Math.atan2(tmidy - smidy, tmidx - smidx);

      if (Math.abs(angle) < Math.PI / 4) {
        d.source.x = d[0].x + d[0].width;
        d.source.y = d[0].y + d[0].height / 2;
        d.target.x = d[1].x;
        d.target.y = d[1].y + d[1].height / 2;
      } else if (Math.abs(angle) > 3 * Math.PI / 4) {
        d.source.x = d[0].x;
        d.source.y = d[0].y + d[0].height / 2;
        d.target.x = d[1].x + d[1].width;
        d.target.y = d[1].y + d[1].height / 2;
      } else if (angle > 0) {
        d.source.x = d[0].x + d[0].width / 2;
        d.source.y = d[0].y + d[0].height;
        d.target.x = d[1].x + d[1].width / 2;
        d.target.y = d[1].y;
      } else if (angle <= 0) {
        d.source.x = d[0].x + d[0].width / 2;
        d.source.y = d[0].y;
        d.target.x = d[1].x + d[1].width / 2;
        d.target.y = d[1].y + d[1].height;
      }

      if (d.target.elem.type === 'Reference') {
        d.target.x = d[1].x;
        d.target.y = d[1].y;
      }
    }
  }

  function calcPolygonPoints(execution) {
    var min = _.min(execution.loopIterations, 'y');
    var max = _.max(execution.loopIterations, 'y');

    return execution.x + 5  + ',' + (execution.y + 5) + ' ' +
            (min.x + 5) + ',' + (min.y + 5) + ' ' +
            (max.x + 5) + ',' + (max.y + 5);
  }

  var force;

  function render(svg, stateManager) {
    function rerender() {
      render(svg, stateManager);
    }

    function fail(err) {
      alert(err);
    }

    var state = stateManager.getData();
    var callgraph = state.unsaved.callgraph;

    var g = svg.select('g.callgraph');

    var bgGroup = g.select('g.bg-group');
    var loopBgGroup = bgGroup.select('g.loop-bg-group');
    var callGroup = g.select('g.calls-group');
    var refGroup = g.select('g.refs-group');
    var edgeGroup = g.select('g.edges-group');

    state.unsaved.callGroup = callGroup;
    state.unsaved.refGroup = refGroup;
    state.unsaved.rerender = rerender;

    function expandAction(d) {
      switch (d.type) {
        case 'CallGroup':
          d.loadCalls().then(rerender, fail);
          break;
        case 'Call':
          d.toggleLoopExecutions().then(rerender, fail);
          break;
        case 'LoopExecution':
          d.toggleLoopIterations().then(rerender, fail);
          break;
        case 'LoopIteration':
          d.toggleLoopExecutions().then(rerender, fail);
          break;
      }
    }

    function childrenAction(d) {
      d.toggleChildren().then(rerender, fail);
    }

    function referencesAction(d) {
      d.toggleReferences().then(rerender, fail);
    }

    function parentAction(d) {
      if (d.type === 'Call' || d.type === 'CallGroup') {
        d.toggleParent().then(rerender, fail);
      }
    }

    function markAction(d) {
      if (d.type === 'Call') {
        stateManager.mark(d.type, d.data.id,
          !stateManager.isMarked(d.type, d.data.id));
      }
    }

    function nodeClick(d) {
      if (d3.event.shiftKey) {
        expandAction(d);
      } else if (d3.event.altKey) {
        referencesAction(d);
      } else if (d3.event.ctrlKey) {
        markAction(d);
      } else if (keyService('Z')) {
        parentAction(d);
      } else {
        childrenAction(d);
      }
    }

    var calls = callgraph.getNodes();
    var refs = callgraph.getReferences();
    var edges = callgraph.getEdges();

    var gradient = GradientService.gradient(0, state.unsaved.mainDuration);
    var gradientBright = GradientService.gradientBright(0, state.unsaved.mainDuration);
    var gradientDark = GradientService.gradientDark(0, state.unsaved.mainDuaration);
    state.unsaved.gradient = gradient;
    state.unsaved.gradientBright = gradientBright;
    state.unsaved.gradientDark = gradientDark;

    var allnodes = calls.concat(refs);

    _.forEach(calls, function(call) {
      call.fixed = true;
    });

    _.forEach(allnodes, function(node, index) {
      node.index = index;
    });

    // Set up force simulation

    if (!_.isUndefined(force)) {
      _.forEach(calls, function(node) {
        delete node.px;
        delete node.py;
      });
      force.stop();
    }

    force = d3.layout.force()
      .nodes(allnodes)
      .links(_.map(edges, function(d, index) {
        return {
          source: d[0],
          target: d[1],
          index: index
        };
      }))
      .gravity(0)
      .linkStrength(0.05)
      .linkDistance(60)
      .friction(0.7)
      .charge(function(d) {
        switch (d.type) {
          case 'Reference':
            return -200;
          default:
            return -300;
        }
      });

    // Add nodes
    var callNodes = callGroup.selectAll('g.node')
      .data(calls, function(d) { return d.uuid; });

    var callNodesEnter = callNodes
      .enter()
      .append('g')
      .classed('node', true)
      .classed({
        'call': function(d) {return d.type === 'Call';},
        'callgroup': function(d) {return d.type === 'CallGroup';},
        'loopexecution': function(d) {return d.type === 'LoopExecution';},
        'loopiteration': function(d) {return d.type === 'LoopIteration';},
        'reference': function(d) {return d.type === 'Reference';},
      })
      .on('click', nodeClick);

    callNodesEnter
      .style('opacity', 0)
      .transition('opacity')
      .style('opacity', 1);

    /* Compute node sizes */
    callgraph.computeSizes();

    /* Background */
    var loopExecutionEnter = callNodesEnter.filter(function(d) {
      return d.type === 'LoopExecution';
    });

    loopExecutionEnter.append('use')
      .attr('xlink:href', '#execution')
      .attr('transform', 'scale(' + 10 / 800 + ')')
      .attr('fill', function(d) {
        return gradient(d.data.duration);
      });

    var loopIterationEnter = callNodesEnter.filter(function(d) {
      return d.type === 'LoopIteration';
    });

    loopIterationEnter.append('use')
      .attr('xlink:href', '#iteration')
      .attr('transform', 'scale(' + 10 / 800 + ')');

    var restNodesEnter = callNodesEnter.filter(function(d) {
      return d.type === 'Call' || d.type === 'CallGroup';
    });

    var fctcallNodesEnter = restNodesEnter.filter(function(d) {
      return d.type === 'Call';
    });

    fctcallNodesEnter
      .transition('opacity')
      .style('opacity', function(d) {
        if (d.data.callsOthers === 0) {
          d.normalOpacity = 0.8;
          return d.normalOpacity;
        } else {
          return 1;
        }
      });

    restNodesEnter.append('rect')
      .classed('call-bg', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', 7)
      .attr('ry', 7)
      .attr('width', function(d) {
        return d.width + 10;
      })
      .attr('height', function(d) {
        return d.height + 6;
      });

    var callGroupNodesEnter = callNodesEnter.filter(function(d) {
      return d.type === 'CallGroup';
    });

    callGroupNodesEnter
      .append('rect')
      .classed('count-bg', true)
      .attr('x', function(d) {
        return d.width + 4;
      })
      .attr('y', -9)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('width', function(d) {
        return SizeService.svgTextSize(d.data.count).width + 4;
      })
      .attr('height', function(d) {
        return d.height - 2;
      });

    callGroupNodesEnter
      .append('text')
      .classed('count', true)
      .attr('x', function(d) {
        return d.width + 4 + 1;
      })
      .attr('y', function(d) {
        return d.height - 13.5;
      })
      .attr('rx', 1)
      .attr('ry', 1)
      .text(function(d) {
        return d.data.count;
      });

    /* Label */
    restNodesEnter
      .append('text')
      .classed('call-bg', true)
      .attr('x', 5)
      .attr('y', function(d) {
        return d.height - 1;
      })
      .text(function(d) {
        return d.getLabel();
      });

    /* Calculate true size */
    callNodes.each(function(d) {
      var bbox = this.getBBox();
      d.width = bbox.width - (d.counterWidth ? d.counterWidth : 0);
      d.height = bbox.height - (d.counterHeight ? d.counterHeight : 0);
    });

    /* Add counters */

    var loopExecutionNodesEnter = callNodesEnter.filter(function(d) {
      return d.type === 'LoopExecution';
    });

    var textCounters = loopExecutionNodesEnter
      .append('text')
      .attr('x', function(d) {
        return d.width;
      })
      .text(function(d) {
        if (d.type === 'LoopExecution') {
          return d.data.iterationsCount;
        }
      });

    textCounters.each(function(d) {
      var bbox = this.getBBox();
      d.counterWidth = bbox.width;
      d.counterHeight = bbox.height;
    });

    /* Layouting */
    callgraph.layout();

    callNodes
      .exit()
      .transition()
      .attr('transform', function(d) {
        if (d.parent) {
          return 'translate(' + d.parent.x + ',' + d.parent.y + ')';
        } else {
          return 'translate(0,0)';
        }
      })
      .style('opacity', 0)
      .remove();

    /* Set colors */

    callNodes.selectAll('g.node > rect.call-bg')
      .attr('stroke', function(d) {
        return gradient(d.data.duration);
      })
      .attr('fill', function(d) {
        if (d.isMarked) {
          return gradient(d.data.duration);
        } else {
          return gradientBright(d.data.duration);
        }
      });

    callNodes.selectAll('g.node > text.call-bg')
      .attr('fill', function(d) {
        return gradient(d.data.duration);
      });

    callNodes.selectAll('g.callgroup > rect.count-bg')
      .attr('stroke', function(d) {
        return gradientBright(d.data.duration);
      });

    callNodes.selectAll('g.node > text.count')
      .attr('fill', function(d) {
        return gradient(d.data.duration);
      });

    callNodes.selectAll('g.loopexecution > rect.call-bg')
      .attr('fill', function(d) {
        return gradient(d.data.duration);
      });

    /* Set initial position so the first transition makes sense */

    callNodesEnter
      .attr('transform', function(d) {
        if (d.parent) {
          return 'translate(' + d.parent.x + ',' + d.parent.y + ')';
        } else {
          return 'translate(0,0)';
        }
      });

    /* Update positions after layout */
    callNodes
      .transition('position')
      .attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });

    /* Background */

    var executions = _.filter(calls, function(call) {
      return call.type === 'LoopExecution' &&
              !_.isUndefined(call.loopIterations);
    });

    var loopBg = loopBgGroup.selectAll('polygon')
      .data(executions, function(d) { return d.uuid; });

    loopBg.exit().remove();

    loopBg.enter()
      .append('polygon')
      .style('filter', 'url(#blurFilter)')
      .style('fill', function(d, i) { return bgColors(i); });

    loopBg.attr('points', function(d) {
      return calcPolygonPoints(d);
    });

    /* Add references */

    var refNodes = refGroup.selectAll('g.reference')
      .data(refs, function(d) { return d.uuid; });

    refNodes
      .exit()
      .transition()
      .style('opacity', 0)
      .remove();

    var refNodesEnter = refNodes
      .enter()
      .append('g')
      .classed('reference', true)
      .call(force.drag)
      .on('mousedown', function() { d3.event.stopPropagation(); });

    refNodesEnter
      .append('circle')
      .attr('r', 10)
      .style('fill', function(d) {
        return refColors(d.data.type);
      });

    refNodesEnter
      .append('text')
      .attr('x', 5)
      .attr('y', 20)
      .text(function(d) {
        return d.data.name;
      });

    refNodes.each(function(d) {
        var bbox = this.getBBox();
        d.width = bbox.width;
        d.height = bbox.height;
      });

    /* Add references */

    var edgeNode = edgeGroup.selectAll('g.edge')
      .data(edges, function(d) {
        return d[0].uuid + '-' + d[1].uuid;
      });

    edgeNode
      .exit()
      .transition()
      .style('opacity', 0)
      .remove();

    var edgeNodesEnter = edgeNode
      .enter()
      .append('g')
      .classed('edge', true)
      .classed({
        'from-call': function(d) {return d[0].type === 'Call';},
        'to-call': function(d) {return d[1].type === 'Call';},
        'from-callgroup': function(d) {return d[0].type === 'CallGroup';},
        'to-callgroup': function(d) {return d[1].type === 'CallGroup';},
        'from-loopexecution':
          function(d) {return d[0].type === 'LoopExecution';},
        'to-loopexecution': function(d) {return d[1].type === 'LoopExecution';},
        'from-loopiteration':
          function(d) {return d[0].type === 'LoopIteration';},
        'tp-loopiteration': function(d) {return d[1].type === 'LoopIteration';},
        'from-reference': function(d) {return d[0].type === 'Reference';},
        'to-reference': function(d) {return d[1].type === 'Reference';},
      });

    edgeNodesEnter
      .append('path')
      .attr('style', function(d) {
        if (d[1].type === 'Reference') {
          if (_.isUndefined(d.details)) {
            return 'stroke : black';
          } else if (d.details.reads === 0 && d.details.writes > 0) {
            return 'stroke : red';
          } else if (d.details.writes === 0 && d.details.reads > 0) {
            return 'stroke : green';
          } else {
            return 'stroke : black';
          }
        } else {
          return 'stroke : chocolate';
        }
      });

    var edgeLines = edgeGroup.selectAll('g.edge:not(.to-reference) > path');

    edgeLines.each(calcEdgePoints);

    var diagonal = d3.svg.diagonal()
      .source(function(d) { return d.source; })
      .target(function(d) { return d.target; })
      .projection(function(d) {
        return [d.x, d.y];
      });

    edgeLines
      .transition()
      .attr('d', diagonal);

    // start force simulation

    function tick() {
      var edgeLines = edgeGroup.selectAll('g.edge.to-reference > path');

      edgeLines.each(calcEdgePoints);

      edgeLines.attr('d', diagonal);

      var refNodes = refGroup.selectAll('g.reference');

      refNodes.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });
    }

    force
      .start()
      .on('tick', tick);

    callNodes.on('mouseover', function(d) {
      stateManager.hover([{'type': d.type, 'id': d.data.id}]);
    });

    refNodes.on('mouseover', function(d) {
      stateManager.hover([{'type': 'Reference', 'id': d.data.id}]);
    });

    callNodes.on('mouseout', function() {
      stateManager.hover([]);
    });

    refNodes.on('mouseout', function() {
      stateManager.hover([]);
    });

    applyMarked(state, calls, stateManager.getMarked());

    $(function() {
      $.contextMenu({
        selector: 'd3-visualization[view=' + stateManager.getId() + '] g.node.call',
        build: function(menu) {
          var element = menu[0].__data__;
          var data = {
            position: function(opt) {
              var rect = opt.$trigger[0].getBoundingClientRect();
              opt.$menu.css({
                top: rect.top + element.height,
                left: rect.left + element.width
              });
            },
            items: {
              'children': {
                name: (element.children ? 'Hide' : 'Show') + ' Children',
                callback: function() {
                  element.toggleChildren().then(rerender, fail);
                }
              },
              'focus': {
                name: 'Focus',
                callback: function() {
                  stateManager.focus([{type: element.type, id: element.data.id
                                      }]);
                }
              },
              'expand': {
                name: (element.loopExecutions ? 'Hide' : 'Show') +
                      ' Loop Executions',
                callback: function() {
                  element.toggleLoopExecutions().then(rerender, fail);
                }
              },
              'references': {
                name: (element.references ? 'Hide' : 'Show') +
                      ' References',
                callback: function() {
                  element.toggleReferences().then(rerender, fail);
                }
              },
              'recursiveReferences': {
                name: (element.references ? 'Hide' : 'Show') +
                      ' Recursive References',
                callback: function() {
                  element.toggleRecursiveReferences().then(rerender, fail);
                }
              },
              'parent': {
                name: (element.parent ? 'Hide' : 'Show') +
                      ' Parent',
                callback: function() {
                  element.toggleParent().then(rerender, fail);
                }
              },
              'mark': {
                name: stateManager.isMarked(element.type, element.data.id) ?
                  'Unmark' : 'Mark',
                callback: function() {
                  stateManager.mark(element.type, element.data.id,
                    !stateManager.isMarked(element.type, element.data.id));
                }
              },
              'spot': {
                name: 'Spot marked nodes',
                callback: function() {
                  stateManager.spot(stateManager.getMarked());
                }
              },
              'sharedreferences': {
                name: 'Show shared references between marked nodes',
                callback: function() {
                  callgraph.showSharedReferences(stateManager.getMarked())
                    .then(rerender, fail);
                }
              },
              'recursivesharedreferences': {
                name: 'Show shared references between marked nodes and ' +
                      'all children of the nodes',
                callback: function() {
                  callgraph.showRecursiveSharedReferences(stateManager
                    .getMarked()).then(rerender, fail);
                }
              }
            }
          };

          if (element.data.loopCount === 0) {
            delete data.items.expand;
          }

          if (element.data.callsOthers === 0) {
            delete data.items.children;
          }

          if (!stateManager.isMarked(element.type, element.data.id) ||
               stateManager.getMarked().length < 2) {
            delete data.items.sharedreferences;
            delete data.items.recursivesharedreferences;
          }

          if (stateManager.getMarked().length < 2) {
            delete data.items.spot;
          }

          return data;
        }
      });
    });

    $(function() {
      $.contextMenu({
        selector: 'd3-visualization[view=' + stateManager.getId() + '] g.node.callgroup',
        build: function(menu) {
          var element = menu[0].__data__;
          return {
            position: function(opt) {
              var rect = opt.$trigger[0].getBoundingClientRect();
              opt.$menu.css({
                top: rect.top + element.height,
                left: rect.left + element.width
              });
            },
            items: {
              'children': {
                name: (element.children ? 'Hide' : 'Show') + ' Children',
                callback: function() {
                  element.toggleChildren().then(rerender, fail);
                }
              },
              'focus': {
                name: 'Focus',
                callback: function() {
                  stateManager.focus([{type: element.type, id: element.data.id
                                      }]);
                }
              },
              'expand': {
                name: 'Expand into Calls',
                callback: function() {
                  element.loadCalls().then(rerender, fail);
                }
              },
              'references': {
                name: (element.references ? 'Hide' : 'Show') +
                      ' References',
                callback: function() {
                  element.toggleReferences().then(rerender, fail);
                }
              },
              'recursiveReferences': {
                name: (element.references ? 'Hide' : 'Show') +
                      ' Recursive References',
                callback: function() {
                  element.toggleRecursiveReferences().then(rerender, fail);
                }
              },
              'parent': {
                name: (element.parent ? 'Hide' : 'Show') +
                      ' Parent',
                callback: function() {
                  element.toggleParent().then(rerender, fail);
                }
              },
              'mark': {
                name: stateManager.isMarked(element.type, element.data.id) ?
                  'Unmark' : 'Mark',
                callback: function() {
                  stateManager.mark(element.type, element.data.id,
                    !stateManager.isMarked(element.type, element.data.id));
                }
              }
            }
          };
        }
      });
    });

    $(function() {
      $.contextMenu({
        selector: 'd3-visualization[view=' + stateManager.getId() + '] g.node.loopexecution',
        build: function(menu) {
          var element = menu[0].__data__;
          return {
            position: function(opt) {
              var rect = opt.$trigger[0].getBoundingClientRect();
              opt.$menu.css({
                top: rect.top + element.height,
                left: rect.left + element.width
              });
            },
            items: {
              'children': {
                name: (element.children ? 'Hide' : 'Show') + ' Children',
                callback: function() {
                  element.toggleChildren().then(rerender, fail);
                }
              },
              'expand': {
                name: (element.loopIterations ? 'Hide' : 'Show') +
                      ' Loop Iterations',
                callback: function() {
                  element.toggleLoopIterations().then(rerender, fail);
                }
              },
              'references': {
                name: (element.references ? 'Hide' : 'Show') +
                      ' References',
                callback: function() {
                  element.toggleReferences().then(rerender, fail);
                }
              },
              'mark': {
                name: stateManager.isMarked(element.type, element.data.id) ?
                  'Unmark' : 'Mark',
                callback: function() {
                  stateManager.mark(element.type, element.data.id,
                    !stateManager.isMarked(element.type, element.data.id));
                }
              }
            }
          };
        }
      });
    });

    $(function() {
      $.contextMenu({
        selector: 'd3-visualization[view=' + stateManager.getId() + '] g.node.loopiteration',
        build: function(menu) {
          var element = menu[0].__data__;
          return {
            position: function(opt) {
              var rect = opt.$trigger[0].getBoundingClientRect();
              opt.$menu.css({
                top: rect.top + element.height,
                left: rect.left + element.width
              });
            },
            items: {
              'children': {
                name: (element.children ? 'Hide' : 'Show') + ' Children',
                callback: function() {
                  element.toggleChildren().then(rerender, fail);
                }
              },
              'expand': {
                name: (element.loopExecutions ? 'Hide' : 'Show') +
                      ' Loop Executions',
                callback: function() {
                  element.toggleLoopExecutions().then(rerender, fail);
                }
              },
              'references': {
                name: (element.references ? 'Hide' : 'Show') +
                      ' References',
                callback: function() {
                  element.toggleReferences().then(rerender, fail);
                }
              },
              'mark': {
                name: stateManager.isMarked(element.type, element.data.id) ?
                  'Unmark' : 'Mark',
                callback: function() {
                  stateManager.mark(element.type, element.data.id,
                    !stateManager.isMarked(element.type, element.data.id));
                }
              }
            }
          };
        }
      });
    });

    $(function() {
      $.contextMenu({
        selector: 'd3-visualization[view=' + stateManager.getId() + '] g.reference',
        build: function(menu) {
          var element = menu[0].__data__;
          return {
            position: function(opt) {
              var rect = opt.$trigger[0].getBoundingClientRect();
              opt.$menu.css({
                top: rect.top + element.height,
                left: rect.left + element.width
              });
            },
            items: {
              'showlinks': {
                name: 'Show links to expanded nodes',
                callback: function() {
                  element.loadLinks().then(rerender, fail);
                }
              }
            }
          };
        }
      });
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
        state.unsaved.mainDuration = calls[0].duration;
        return state.unsaved.callgraph.addCallRoot(calls[0]);
      }).then(function() {
        render(svg, stateManager);
      });
    } else {
      render(svg, stateManager);
    }
  };
}]);
