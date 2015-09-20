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
render.$inject = ['LoaderService', 'd3', 'SizeService'];

// render the view
function render(loader, d3, size) {
  return function(svg, stateManager) {
    var width = '100%';
    var height = '100%';
    var flatData = [];
    var nestedData = {};
    var calledId = [];
    var runtimeThreshold = null;
    var thresholdFactor = 0.01;
    var maxRuntime;
    var profileId = Date.now();

    var xScale = d3.scale.linear()
      .range([0, width]);
    var yScale = d3.scale.linear()
      .range([0, height]);
    var colorScale = d3.scale.linear()
      .domain([0, 50, 100])
      .range(['#B0FC23', '#EEFC23', '#FC2323']);
    var partition = d3.layout.partition()
      .value(function(d) { return d.runtime; });

    svg.attr('id', profileId);
    svg.selectAll('*').remove();

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
          }

          if (temp.runtime < runtimeThreshold) {
            return;
          }

          temp.ancestor = ancestor;
          temp.level = level;
          temp.callId = callData.id;
          return loader.getFunction(callData.function)
            .then(function(funcData) {
              temp.name = funcData.signature;
              flatData.push(temp);
              return call.getCalls();
            })
            .then(function(childData) {
              calledId.push(callId);
              mapViewData(flatData);

              var d = childData;
              var l = level + 1;
              var p = temp.callId;
              if (d.length > 0) {
                $.each(d, function(index, child) {
                  if (calledId.indexOf(child.id) === -1) {
                    getData(child.id, p, l);
                  }
                });
              }
            });
        })
        .then(function(ok) {}, function(err) {});
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
      displayView(nestedData);
    };

    var nodes, g;
    var rectHeight = 20;
    var textPadY = 15;
    var textPadX = 5;
    var adjustLevel = 0;
    var displayView = function(data) {
      var json = $.extend(true, {}, data);
      nodes = partition.nodes(json);

      svg.selectAll('*').remove();
      g = svg.selectAll('g');

      g = g
        .data(nodes)
        .enter()
        .append('g');

      g.append('rect')
        .attr('x', function(d) { return xScale(d.x); })
        .attr('y', function(d) { 
          return rectHeight * (d.level - adjustLevel) - rectHeight; 
        })
        .attr('width', function(d) { return xScale(d.dx); })
        .attr('height', function() { return rectHeight; })
        .attr('id', function(d) { return d.callId; })
        .attr('stroke', 'black')
        .attr('stroke-opacity', 0.1)
        .attr('stroke-width', 2)
        .attr('fill', function(d) {
          return colorScale(d.runtime / maxRuntime * 100);
        })
        .on('click', selectNode)
        .on('dblclick', zoomer)
        .on('mouseenter', highlightNode)
        .on('mouseleave', removeNodeHighlight)
        .append('title')
        .text(function(d) {
          var runtime = d.runtime.toLocaleString();
          return d.level + ' | ' + d.name + ' | ' + runtime;
        });

      g.append('text')
        .filter(function(d, i) { 
          var rectWidth = size.svgSizeById(d.callId).width;
          var textWidth = size.svgTextSize(d.name, '11px').width;
          return rectWidth > textWidth + textPadX; 
        })
        .attr('x', function(d) { return widthInPixels(d) + textPadX; })
        .attr('y', function(d) { 
          return (rectHeight * (d.level - adjustLevel) - rectHeight) + textPadY;
        })
        .attr('font-family', 'sans-serif')
        .attr('font-size', '11px')
        .attr('fill', 'black')
        .text(function(d) { return d.name; });
    };

    function widthInPixels(d) {
      var svgWidth = size.svgSizeById(profileId).width;
      var xVal = xScale(d.x);
      var percentVal = xVal.slice(0, -1);
      return Math.ceil(percentVal * svgWidth / 100);
    }

    function highlightNode(d) {
      d3.select(this).attr('stroke-opacity', 0.7);
      stateManager.hover([{type: 'Call', id: d.callId}]);
    }

    function removeNodeHighlight() {
      d3.select(this).attr('stroke-opacity', 0.1);
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

    function zoomer(d) {
      var newData = findDeep(nestedData, d.callId);
      console.log(JSON.stringify(newData));
      adjustLevel = d.level - 1;
      displayView(newData);
      return;

      var dRect = d;
      var currY = Number(d3.select(this).attr('y'));
      var svgWidth = size.svgSizeById(profileId).width;
      var dWidth = size.svgSizeById(d.callId).width;
      var widthMult = svgWidth / dWidth;
      var xTransScale = d3.scale.linear()
        .domain([0, 100])
        .range([0, 1]);

      svg.selectAll('rect')
        .filter(function(d, i) {
          var isAbove = dRect.y >= d.y;
          var isBelow = dRect.y < d.y;
          var isLeft = dRect.x < d.x;
          var isRight = dRect.x > d.x;
          var isElem = d.callId === dRect.callId;
          return (isAbove || isLeft || isRight || (isBelow && (isLeft || isRight))) && !isElem; 
        })
        .each(function(d) {
          d3.select(this.parentNode).remove();
        });

        return;
      svg.selectAll('rect')
        .filter(function(d, i) {
          return dy < d.y || dcallId === d.callId;
        })
        .attr('width', function(d) { 
          var xPercent = d3.select(this).attr('width').slice(0, -1);
          return xPercent * widthMult + '%'; 
        })
        .attr('y', function(d) { return Number(d3.select(this).attr('y') - currY); })
        .attr('x', function(d) { 
          var xPercent = d3.select(this).attr('width').slice(0, -1);
          var transWidth = xPercent * widthMult; 
          return xTransScale(transWidth); 
        });

      svg.selectAll('text')
        .filter(function(d, i) {
          return dy <= d.y;
        })
        .attr('y', function(d) { return Number(d3.select(this).attr('y') - currY); });
    }

    var topNode = null;
    var transDuration = 750
    function zoomNode(d) {
      var svgWidth = size.svgSizeById(profileId).width;
      var dWidth = size.svgSizeById(d.callId).width;

      var widthMult = svgWidth / dWidth;

      var dTransWidth = Math.ceil(dWidth * widthMult);
      var dTransMaxWidth = Math.ceil(svgWidth * widthMult);

      var dPercentWidthIncrease = dTransWidth / dWidth * 100;

      var dTransX = Math.ceil(dTransWidth * dPercentWidthIncrease / 100);
      var dTransMaxX = Math.ceil(dTransMaxWidth * dPercentWidthIncrease / 100);
      var transXBegin = 0 - dTransX;
      var transXEnd = dTransMaxX - dTransX;

      var xTransScale = d3.scale.linear()
      .domain([0, 1])
      .range([transXBegin, transXEnd]);
      var currY = Number(d3.select(this).attr('y'));

      console.log(currY, dTransWidth, dTransMaxWidth, dPercentWidthIncrease, dTransX, dTransMaxX, transXBegin, transXEnd, xTransScale(0));

      return;

      svg.selectAll('g').transition()
        .duration(transDuration)
        // .attr('transform', 'translate(' + widthInPixels(d) + ', ' + -Number(rectHeight * d.level - rectHeight) + ')')
        .select('rect')
          .attr('x', function(d) { return xTransScale(d.x); })
          .attr('y', function(d) { return Number(d3.select(this).attr('y') - currY); })
          .attr('width', function(d) { return Math.ceil(size.svgSizeById(d.callId).width * widthMult); });
        // .each(function(d) { 
        //   d3.select(this)
        //     .attr('transform', 'translate(' + widthInPixels(d) + ', ' + Number(rectHeight * d.level - rectHeight) + ')');
        //   console.log(this, widthInPixels(d), rectHeight * d.level - rectHeight); 
        // });
      // svg.selectAll('g rect').transition()
      //   .duration(transDuration)
      //   // .attr('x', function(d) { return Math.ceil(d.x * dPercentWidthIncrease); })
      //   .attr('width', function(d) { return Math.ceil(size.svgSizeById(d.callId).width * widthMult); });
      // svg.selectAll('rect').transition()
      //   .duration(transDuration)
      //   .attr('x', function(d) { return xScale(d.x); })
      //   .attr('y', function(d) { return yScale(d.y); })
      //   .attr('width', function(d) { return x(d.x + d.dx) - x(d.x); })
      //   .attr('height', function(d) { return y(d.y + d.dy) - y(d.y); });

      // setTimeout(function() { loadChildren(d); }, transDuration);
    }

    var selectedNodes = [];
    function selectNode(d) {
      var n;
      if (d3.select(this).attr('prev-color') === null) {
        var currentColor = d3.select(this).attr('fill');
        d3.select(this).attr('prev-color', currentColor);
        d3.select(this).attr('fill', 'black');

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

        // remove node from selection
        n = _.findWhere(selectedNodes, {id: d.callId});
        if (n !== undefined) {
          selectedNodes.splice(selectedNodes.indexOf(n), 1);
        }
      }
      console.log(selectedNodes);
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
          if (data.length > 0) {
            $.each(data, function(index, child) {
              if (calledId.indexOf(child.id) === -1) {
                console.log(index, child);
                getData(child.id, p, l);
              }
            });
          }
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

