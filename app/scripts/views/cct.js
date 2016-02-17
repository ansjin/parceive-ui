angular.module('cct-view', ['app'])
.value('name', 'CCT')
.value('group', 'Callgraph')
.value('markedCb', function() {})
.value('focusCb', function() {})
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
    });

    _.forEach(hovered, function(toFind) {
      var node = _.find(nodes, function(node) {
        return node.type === toFind.type && node.data.id === toFind.id;
      });

      if (node) {
        node.isHovered = true;
      }
    });

    state.unsaved.callGroup.selectAll('g.node')
      .transition('opacity')
      .style('opacity', function(d) {
        if (d.isHovered) {
          return 1;
        } else {
          return (d.normalOpacity ? d.normalOpacity : 1) - 0.5;
        }
      });
  }
})
.service('render', ['CallGraphDataService', 'LoaderService', 'd3', 'KeyService',
                    'GradientService', 'jquery',
function(CallGraphDataService, loader, d3, keyService, GradientService, $) {
  var bgColors = d3.scale.category20();

  function addZoom(svg) {
    svg.call(d3.behavior.zoom().scaleExtent([1, 10]).on('zoom', zoom));

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

    function zoom() {
      g.attr('transform', 'translate(' + d3.event.translate +
                ')scale(' + d3.event.scale + ')');
    }
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

    function nodeClick(d) {
      if (d3.event.shiftKey) {
        expandAction(d);
      } else if (d3.event.altKey) {
        referencesAction(d);
      } else if (keyService('Z')) {
        parentAction(d);
      } else {
        childrenAction(d);
      }
    }

    var calls = callgraph.getNodes();
    var refs = callgraph.getReferences();
    var edges = callgraph.getEdges();

    var durations = _.map(calls, function(call) {
      return call.data.duration;
    });

    var gradient = GradientService.gradient(_.min(durations), _.max(durations));

    var allnodes = calls.concat(refs);

    _.forEach(calls, function(call) {
      call.fixed = true;
    });

    _.forEach(allnodes, function(node, index) {
      node.index = index;
    });

    // Set up force simulation

    if (!_.isUndefined(force)) {
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
      .data(calls, function(d) { return d.type + ':' + d.data.id; });

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
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('width', function(d) {
        return d.width + 6;
      })
      .attr('height', function(d) {
        return d.height + 6;
      });

    /* Label */
    restNodesEnter
      .append('text')
      .attr('x', 3)
      .attr('y', function(d) {
        return d.height;
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

    var callGroupNodesEnter = callNodesEnter.filter(function(d) {
      return d.type === 'CallGroup' || d.type === 'LoopExecution';
    });

    var textCounters = callGroupNodesEnter
      .append('text')
      .attr('x', function(d) {
        return d.width;
      })
      .text(function(d) {
        if (d.type === 'CallGroup') {
          return d.data.count;
        } else if (d.type === 'LoopExecution') {
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

    callNodes.selectAll('g.call > rect.call-bg')
      .attr('fill', function(d) {
        return d3.rgb(gradient(d.data.duration));
      }).attr('stroke', function(d) {
        return gradient(d.data.duration);
      });

    callNodes.selectAll('g.callgroup > rect.call-bg')
      .attr('fill', function(d) {
        return d3.rgb(gradient(d.data.duration));
      }).attr('stroke', function(d) {
        return gradient(d.data.duration);
      });

    callNodes.selectAll('g.loopexecution > rect.call-bg')
      .attr('FILL', function(d) {
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
      .data(executions, function(d) { return d.data.id; });

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
      .data(refs, function(d) { return d.data.id; });

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
      .attr('r', 10);

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
        return d[0].type + ':' + d[0].data.id + '-' +
               d[1].type + ':' + d[1].data.id;
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
      .append('path');

    var edgeLines = edgeGroup.selectAll('g.edge > path');

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

    $(function() {
      $.contextMenu({
        selector: '.node.call',
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
              'parent': {
                name: (element.parent ? 'Hide' : 'Show') +
                      ' Parent',
                callback: function() {
                  element.toggleParent().then(rerender, fail);
                }
              },
            }
          };

          if (element.data.loopCount === 0) {
            delete data.items.expand;
          }

          if (element.data.callsOthers === 0) {
            delete data.items.children;
          }

          return data;
        }
      });
    });

    $(function() {
      $.contextMenu({
        selector: '.node.callgroup',
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
              'parent': {
                name: (element.parent ? 'Hide' : 'Show') +
                      ' Parent',
                callback: function() {
                  element.toggleParent().then(rerender, fail);
                }
              },
            }
          };
        }
      });
    });

    $(function() {
      $.contextMenu({
        selector: '.node.loopexecution',
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
              }
            }
          };
        }
      });
    });

    $(function() {
      $.contextMenu({
        selector: '.node.loopiteration',
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
        return state.unsaved.callgraph.addCallRoot(calls[0]);
      }).then(function() {
        render(svg, stateManager);
      });
    } else {
      render(svg, stateManager);
    }
  };
}]);
