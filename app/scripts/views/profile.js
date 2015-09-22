/* global $ */
/* global console */

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
function render(loader, d3, size, GradientService) {
  return function(svg, stateManager) {
    var width = '100%';
    var flatData = [];
    var nestedData = {};
    var calledId = [];
    var runtimeThreshold = null;
    var thresholdFactor = 0.01;
    var maxRuntime;
    var profileId = Date.now();
    var nodes;
    var zoomId = null;
    var minToolBoxWidth = 150;
    var gradient = null;

    var xScale = d3.scale.linear()
      .range([0, width]);
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
            maxRuntime = temp.runtime;
            runtimeThreshold = temp.runtime * thresholdFactor;
            gradient = GradientService.gradient(0, maxRuntime);
          }

          if (temp.runtime < runtimeThreshold) {
            return;
          }

          temp.ancestor = ancestor;
          temp.level = level;
          temp.callId = callData.id;
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
    var textPadX = 5;
    var adjustLevel = 0;
    var transTime = 600;
    var transType = 'elastic';

    var displayView = function(data) {
      var json = $.extend(true, {}, data);
      nodes = partition.nodes(json);

      svg.selectAll('*').remove();

      svg.selectAll('rect')
        .data(nodes)
        .enter()
        .append('rect')
        .attr('x', function(d) { return xScale(d.x); })
        .attr('y', function(d) {
          var _y = rectHeight * (d.level - adjustLevel) - rectHeight;
          if (zoomId !== null) { _y = _y - rectHeight; }
          return _y ;
        })
        .attr('width', function(d) { return xScale(d.dx); })
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
          var rectWidth = size.svgSizeById(d.callId).width;
          var textWidth = size.svgTextSize(d.name, '12px').width;
          return rectWidth > textWidth + textPadX;
        }))
        .enter()
        .append('text')
        .attr('x', function(d) { return widthInPixels(d) + textPadX; })
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
        .attr('id', function(d) { return 'text_' + d.callId; })
        .attr('font-family', 'Arial')
        .attr('font-size', '12px')
        .attr('fill', 'white')
        .text(function(d) { return d.name; });

      svg.selectAll('rect, text')
        .on('click', selectNode)
        .on('dblclick', zoom)
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
      }
      return true;
    };

    function widthInPixels(d) {
      var svgWidth = size.svgSizeById(profileId).width;
      var xVal = xScale(d.x);
      var percentVal = xVal.slice(0, -1);
      return Math.ceil(percentVal * svgWidth / 100);
    }

    function highlightNode(d) {
      d3.select(this)
        .attr('fill-opacity', 0.5);

      var x = d3.event.pageX;
      var y = d3.event.pageY;

      var runtime = d.runtime / maxRuntime * 100;
      var svgWidth = size.svgSizeById(profileId).width;
      var tooltipWidth = _.max([minToolBoxWidth, size.textSize(d.name, 14).width]);

      if (tooltipWidth > svgWidth - x) {
        x = x - (tooltipWidth + 20);
      }

      //Update the tooltip position and value
      var tooltip =
        d3.select("#tooltip")
          .style("left", x  + "px")
          .style("top", y + "px")
          .style("width", tooltipWidth + "px");
      tooltip
          .select('#title')
          .text(d.name);
      tooltip
        .select('#value')
        .text(runtime.toFixed(2) + ' %');

      //Show the tooltip
      tooltip
        .classed('hidden', false);

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
    function zoom(d) {
      adjustLevel = d.level - 1;
      runtimeThreshold = d.runtime * thresholdFactor;

      if (zoomId === d.callId) {
        adjustLevel = 0;
        runtimeThreshold = maxRuntime * thresholdFactor;
        displayView(nestedData);
        zoomId = null;
        return;
      }

      zoomId = d.callId;
      zoomData = findDeep(nestedData, d.callId);
      if (displayView(zoomData)) {
        setTimeout(function() {
          loadChildren(d);
        }, transTime);
      }
    }

    var selectedNodes = [];
    function selectNode(d) {
      var n;
      if (d3.select(this).attr('prev-color') === null) {
        var currentColor = d3.select(this).attr('fill');
        d3.select(this).attr('prev-color', currentColor);
        d3.select(this)
          .attr('fill', 'grey')
          .attr('fill-opacity', 0.8);
        d3.select('#text_' + d.callId)
          .attr('fill', 'white');

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
        var prevColor = d3.select(this).attr('prev-color');
        d3.select(this).attr('prev-color', null);
        d3.select(this).attr('fill', prevColor);
        d3.select('#text_' + d.callId).attr('fill', 'white');

        // remove node from selection
        n = _.findWhere(selectedNodes, {id: d.callId});
        if (n !== undefined) {
          selectedNodes.splice(selectedNodes.indexOf(n), 1);
        }
      }
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
        getData(res[0].id, 'null', 1);
      });

  };
}
