/* global $ */
/* global window */
/* global document */

angular
  .module('profile-view', ['app'])
  .value('name', 'Profile view')
  .value('group', 'Profile views')
  .value('markedCb', markedCb)
  .value('focusCb', focusCb)
  .value('hoverCb', hoverCb)
  .service('render', render);

// handle marked event
function markedCb() {

}

// handle focus event
function focusCb() {

}

// handle hover event
function hoverCb() {

}

// view dependencies
render.$inject = ['LoaderService', 'd3', 'SizeService', 'GradientService'];

// render the view
function render(loader, d3, SizeService, GradientService) {
  return function(svg, stateManager) {
    var width = '100%';
    var flatData = [];
    var nestedData = {};
    var calledId = [];
    var runtimeThreshold = null;
    var thresholdFactor = 0.01;
    var maxRuntime;
    var selectedNodes = [];
    var profileId = Date.now();
    var nodes;
    var zoomId = null;
    var minToolBoxWidth = 150;
    var gradient = null;
    var myScale = null;
    var myPoint = null;

    var partition = d3.layout.partition()
      .value(function(d) { return d.runtime; });
    svg.attr('id', profileId);

    var getData = function(callId, ancestor, level) {
      var temp = {};
      var call;

      loader.getCall(callId)
        .then(function(callData) {
          call = callData;
          temp.runtime = callData.end - callData.start;

          if (runtimeThreshold === null) {
            runtimeThreshold = temp.runtime * thresholdFactor;
            gradient = GradientService.gradient(0, maxRuntime);
          }

          if (temp.runtime < runtimeThreshold) {
            return;
          }

          temp.ancestor = ancestor;
          temp.level = level;
          temp.callId = callData.id;
          temp.start = callData.start;
          temp.end = callData.end;
          return callData.getFunction()
            .then(function(funcData) {
              temp.name = funcData.signature;
              if (_.findWhere(flatData, temp) === undefined) {
                flatData.push(temp);
              }
              return call.getCalls();
            })
            .then(function(childData) {
              calledId.push(callId);
              mapViewData(flatData);
              var d = childData;
              var l = level + 1;
              var p = temp.callId;
              getChildren(d, p, l);
            });
        })
        .then(function() {}, function() {});
    };

    var getChildren = function(children, parent, level) {
      if (children.length > 0) {
        $.each(children, function(index, child) {
          if (calledId.indexOf(child.id) === -1) {
            getData(child.id, parent, level);
          }
        });
      }
    };

    var mapViewData = function(data) {
      var d = $.extend(true, [], data);
      var dataMap = d.reduce(function(map, node) {
        map[node.callId] = node;
        return map;
      }, {});

      var tree = [];
      d.forEach(function(node) {
        var ancestor = dataMap[node.ancestor];
        if (ancestor) {
          (ancestor.children || (ancestor.children = [])).push(node);
        } else {
          tree.push(node);
        }
      });

      nestedData = $.extend(true, {}, tree[0]);
      if (zoomId !== null) {
        displayView(findDeep(nestedData, zoomId));
        return;
      }
      displayView(nestedData);
    };

    var rectHeight = 22;
    var textPadY = 15;
    var textPadX = 0.5;
    var adjustLevel = 0;
    var transTime = 600;
    var transType = 'elastic';
    var maxLevel = 1;
    var svgElem = document.getElementById(profileId);
    var svgParentElem = document.getElementById(profileId).parentNode;

    var displayView = function(data) {
      var json = $.extend(true, {}, data);
      nodes = partition.nodes(json);

      if(svgElem.scrollHeight > svgParentElem.clientHeight) {
        width = '98%';
      }

      myScale = d3.scale.linear()
        .domain([0, nodes[0].runtime])
        .range([0, width]);
      myPoint = d3.scale.linear()
        .domain([nodes[0].start, nodes[0].end])
        .range([0, width]);

      svg.selectAll('*').remove();
      svg.selectAll('rect')
        .data(nodes)
        .enter()
        .append('rect')
        .attr('x', function(d) { return myPoint(d.start); })
        .attr('y', function(d) {
          var _y = rectHeight * (d.level - adjustLevel) - rectHeight;
          if (d.level > maxLevel) { maxLevel = d.level; }
          if (zoomId !== null) { _y = _y - rectHeight; }
          return _y ;
        })
        .attr('width', function(d) {
          return myScale(d.runtime);
        })
        .attr('height', function() {
          var _h = rectHeight;
          if (zoomId !== null) { _h = rectHeight / 2; }
          return _h;
        })
        .attr('fill-opacity', function() {
          var _o = 1;
          if (zoomId !== null) { _o = 0; }
          return _o;
        })
        .attr('id', function(d) { return d.callId; })
        .attr('stroke', 'white')
        .attr('stroke-opacity', 1)
        .attr('stroke-width', 2)
        .attr('shape-rendering', 'crispEdges')
        .attr('fill', function(d) {
          return gradient(d.runtime);
        });

      svg.selectAll('text')
        .data(nodes.filter(function(d) {
          var rectWidth = SizeService.svgSizeById(d.callId).width;
          var textWidth = SizeService.svgTextSize(d.name, '14px').width;
          return rectWidth > textWidth + textPadX;
        }))
        .enter()
        .append('text')
        .attr('x', function(d) { 
          var _x_old = myPoint(d.start);
          var _x_sliced = Number(_x_old.slice(0, -1));
          var _x = Number(_x_sliced + textPadX) + '%';
          return _x; 
        })
        .attr('y', function(d) {
          var _y = rectHeight * (d.level - adjustLevel) - rectHeight;
          _y = _y + textPadY;
          if (zoomId !== null) { _y = _y - 50; }
          return _y;
        })
        .attr('fill-opacity', function() {
          var _o = 1;
          if (zoomId !== null) { _o = 0; }
          return _o;
        })
        .style('shape-padding', 10)
        .attr('id', function(d) { return 'text_' + d.callId; })
        .attr('font-family', 'Arial')
        .attr('font-size', '14px')
        .attr('fill', 'white')
        .text(function(d) { return d.name; });

      svg.selectAll('rect, text')
        .on('click', selectNode)
        .on('mouseenter', highlightNode)
        .on('mouseleave', removeNodeHighlight);

      if (zoomId !== null) {
        svg.selectAll('rect')
          .transition()
          .duration(transTime)
          .ease(transType)
          .attr('y', function(d) {
            return rectHeight * (d.level - adjustLevel) - rectHeight;
          })
          .attr('height', function() { return rectHeight; })
          .attr('fill-opacity', 1);

        svg.selectAll('text')
          .transition()
          .duration(transTime)
          .ease(transType)
          .attr('y', function(d) {
            var _y = rectHeight * (d.level - adjustLevel) - rectHeight;
            return _y + textPadY;
          })
          .attr('fill-opacity', 1);
        setSvgHeight();
      }
      displaySelectedNodes();
      return true;
    };

    function setSvgHeight() {
      var newHeight = rectHeight * (maxLevel - adjustLevel);
      svg.style('height', newHeight + 'px');
    }

    function highlightNode(d) {
      d3.select(this)
        .attr('fill-opacity', 0.5);

      var x = d3.event.pageX;
      var y = d3.event.pageY;

      var runtime = d.runtime / maxRuntime * 100;
      var svgWidth = SizeService.svgSizeById(profileId).width;
      var tooltipWidth = _.max(
        [minToolBoxWidth, SizeService.textSize(d.name, 14).width]
      );
      var tooltipPadding = 20;

      if (tooltipWidth + tooltipPadding > svgWidth - x) {
        x = x - (tooltipWidth + tooltipPadding);
      }

      //Update the tooltip position and value
      var tooltip = d3.select('#tooltip')
        .style('left', x  + 'px')
        .style('top', y + 'px')
        .style('width', tooltipWidth + 'px');
      tooltip
        .select('#title')
        .text(d.name);
      tooltip
        .select('#value')
        .text(runtime.toFixed(2) + ' %');

      //Show the tooltip
      tooltip.classed('hidden', false);

      stateManager.hover([{type: 'Call', id: d.callId}]);
    }

    function removeNodeHighlight() {
      d3.select(this)
        .attr('fill-opacity', 1);

      //Hide the tooltip
      d3.select('#tooltip').classed('hidden', true);
    }

    function findDeep(obj, id) {
      var val = {};

      function recurse(children, id) {
        for (var i = children.length - 1; i >= 0; i--) {
          if (children[i].callId === id) {
            val = children[i];
            break;
          }
          if (children[i].hasOwnProperty('children') === true) {
            recurse(children[i].children, id);
          }
        }
      }

      if (obj.callId === id) {
        val = obj;
      } else {
        recurse(obj.children, id);
      }

      return val;
    }

    var zoomData;
    var zoomHistory = [];
    function zoom(d) {
      // zoom to previous parent level
      if (zoomId === d.callId) {
        zoomHistory.pop();

        if (zoomHistory.length > 0) {
          zoomToLevel(zoomHistory[zoomHistory.length - 1], false);
        } else {
          zoomToTop();
        }
        return;
      }

      // zoom to new child level
      zoomToLevel(d, true);

      // save parent level for back navigation
      zoomHistory.push({
        level: d.level,
        callId: d.callId,
        runtime: d.runtime,
        name: d.name
      });
    }

    function zoomToLevel(d, loadNodeChildren) {
      adjustLevel = d.level - 1;
      runtimeThreshold = d.runtime * thresholdFactor;
      zoomId = d.callId;
      zoomData = findDeep(nestedData, d.callId);

      if (displayView(zoomData)) {
        if (loadNodeChildren) {
          window.setTimeout(function() {
            loadChildren(d);
          }, transTime);
        }
      }
    }

    function zoomToTop() {
      adjustLevel = 0;
      runtimeThreshold = maxRuntime * thresholdFactor;
      displayView(nestedData);
      zoomId = null;
      zoomHistory = [];
    }

    var clickCount = 0;
    var clickData;
    var that;
    function selectNode(d) {
      clickCount++;
      clickData = d;
      that = this;
      window.setTimeout(function() {
        if (clickCount === 2) {
          zoom(clickData);
        }

        if (clickCount === 1) {
          setSelectedNodes(clickData);
        }
        clickCount = 0;
      }, 300);
    }

    function setSelectedNodes(d) {
      var n;
      var rectSelect = d3.select(that);
      if (!rectSelect.empty()) {
        if (rectSelect.attr('prev-color') === null) {
          var currentColor = rectSelect.attr('fill');
          rectSelect
            .attr('prev-color', currentColor)
            .attr('fill', 'grey')
            .attr('fill-opacity', 0.8);

          // add node to selection
          n = _.findWhere(selectedNodes, {callId: d.callId});
          if (n === undefined) {
            selectedNodes.push({
              type: 'Call',
              id: d.callId,
              isMarked: true
            });
          }
        } else {
          var prevColor = rectSelect.attr('prev-color');
          rectSelect.attr('prev-color', null);
          rectSelect.attr('fill', prevColor);

          // remove node from selection
          n = _.findWhere(selectedNodes, {id: d.callId});
          if (n !== undefined) {
            selectedNodes.splice(selectedNodes.indexOf(n), 1);
          }
        }
      }
    }

    function displaySelectedNodes() {
      d3.selectAll('rect')
        .each(function(d) {
          var selection = d3.select(this);
          for (var x = 0, len = selectedNodes.length; x < len; x++) {
            var n = selectedNodes[x];
            if (n.id === d.callId) {
              var currentColor = selection.attr('fill');
              selection
                .attr('prev-color', currentColor)
                .attr('fill', 'grey')
                .attr('fill-opacity', 0.8);
            }
          }
        });
    }

    function loadChildren(d) {
      runtimeThreshold = d.runtime * thresholdFactor;
      loader.getCall(d.callId)
        .then(function(call) {
          return call.getCalls();
        })
        .then(function(childData) {
          var data = childData;
          var l = Number(d.level) + 1;
          var p = d.callId;
          getChildren(data, p, l);
        });
    }

    // run for main function
    loader.getFunctionBySignature('main')
      .then(function(res) {
        return res.getCalls();
      })
      .then(function(res) {
        maxRuntime = res[0].end - res[0].start;
        getData(res[0].id, 'null', 1);
      });

    // temp solution to set click handler for profiler reset btn
    window.setTimeout(function() {
      document.getElementById('profiler-reset')
      .addEventListener('click', function() {
        zoomToTop();
      });
    }, 1000);

  };
}
