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
render.$inject = ['LoaderService', 'd3'];

// render the view
function render(loader, d3) {
  return function(svg) {
    ProfileView(svg, loader, d3);
  }
}

function ProfileView(svg, loader, d3) {
  
  var width = 800;
  var height = 350;
  var pad = 10;
  var rect = svg.selectAll('rect');
  var text = svg.selectAll('text');
  var x = d3.scale.linear().range([0, width]);
  var y = d3.scale.linear().range([0, height]);
  var flatData = [];
  var nestedData = {};
  var calledId = [];
  var runtimeThreshold = null;
  var thresholdFactor = 0.01;
  var maxRuntime;

  svg.selectAll('*').remove();
  svg
    .style('width', width)
    .style('height', height)
    .style('background', 'pink');

  var partition = d3.layout.partition().value(function(d) { 
    return d.runtime; 
  });

  var getData = function(callId, ancestor, level) {
    calledId.push(callId);
    var temp = {};
    var call;

    loader.getCall(callId)
      .then(function(callData) {
        call = callData;
        temp.runtime = callData.end - callData.start;

        if(runtimeThreshold === null) {
          maxRuntime = temp.runtime;
          runtimeThreshold = temp.runtime * thresholdFactor;
        }

        if(temp.runtime < runtimeThreshold) {
          return;
        }

        temp.ancestor = ancestor;
        temp.level = level;
        temp.callId = callData.id;
        
        return loader.getFunction(callData.function);
      })
      .then(function(funcData) {
        temp.name = funcData.signature;
        flatData.push(temp);
        
        return call.getCalls();
      })
      .then(function(childData) {
        var d = childData;
        var l = level + 1;
        var p = temp.callId;

        if(d.length > 0) {
          $.each(d, function(index, child) {
            if(calledId.indexOf(child.id) == -1) {
              getData(child.id, p, l);
            }
          });
        }

        mapViewData(flatData);
      });
  };

  var mapViewData = function(data) {
    var d = $.extend(true, [], data);
    
    var dataMap = d.reduce(function(map, node) {
      map[node.callId] = node;
      return map;
    }, {});

    var tree = new Array();      
    d.forEach(function(node) {
      var ancestor = dataMap[node.ancestor];
      if (ancestor) {
        (ancestor.children || (ancestor.children = [])).push(node);
      }
      else {
        tree.push(node);
      }
    });

    nestedData = $.extend(true, {}, tree[0]);
    displayView(nestedData);
  };

  var nodes;
  var displayView = function(data) {
    var json = $.extend(true, {}, data);
    nodes = partition.nodes(json);

    svg.selectAll('*').remove();
    rect = svg.selectAll('rect');
    text = svg.selectAll('text');

    rect = rect
      .data(nodes)
      .enter()
      .append('rect')
      .attr('x', function(d) { return x(d.x); })
      .attr('y', function(d) { return y(d.y); })
      .attr('width', function(d) { return x(d.dx); })
      .attr('height', function(d) { return y(d.dy); })
      .attr('stroke', 'black')
      .attr('stroke-opacity', 0.1)
      .attr('stroke-width', 4)
      .attr('fill', function(d) { return getColor(maxRuntime, d.runtime); })
      .on('click', selectNode)
      .on('dblclick', zoomNode)
      .on('mouseenter', highlightNode)
      .on('mouseleave', removeNodeHighlight);

    text = text
      .data(nodes.filter(function(d) { return x(d.dx) > 70; }))
      .enter()
      .append('text')
      .attr('x', function(d) { return x(d.x) + pad; })
      .attr('y', function(d) { return y(d.y) + pad; })
      .attr('font-family', 'sans-serif')
      .attr('font-size', '11px')
      .attr('fill', 'white')
      .text(function(d) { return d.name; });
  };

  function highlightNode(d) {
    d3.select(this).attr('stroke-opacity', 0.7);
  }

  function removeNodeHighlight(d) {
    d3.select(this).attr('stroke-opacity', 0.1);
  }

  var selectedNodes = [];
  function selectNode(d) {
    if(d3.select(this).attr('prev-color') === null) {
      var current_color = d3.select(this).attr('fill');
      d3.select(this).attr('prev-color', current_color);
      d3.select(this).attr('fill', 'black');

      // add node to selection
      var n = _.findWhere(selectedNodes, {callId: d.callId});
      if(n === undefined) {
        selectedNodes.push(d);
      }
    }
    else {
      var prev_color = d3.select(this).attr('prev-color');
      d3.select(this).attr('prev-color', null);
      d3.select(this).attr('fill', prev_color);

      // remove node from selection
      var n = _.findWhere(selectedNodes, {callId: d.callId});
      if(n !== undefined) {
        selectedNodes.splice(selectedNodes.indexOf(n), 1);
      }
    }
    console.log(selectedNodes);
  }

  var topNode = null;
  function zoomNode(d) {
    loadChildren(d);
    topNode = d;
    x.domain([d.x, d.x + d.dx]);
    y.domain([d.y, 1]).range([d.y ? 10 : 0, height]);

    rect.transition()
      .duration(750)
      .attr('x', function(d) { return x(d.x); })
      .attr('y', function(d) { return y(d.y); })
      .attr('width', function(d) { return x(d.x + d.dx) - x(d.x); })
      .attr('height', function(d) { return y(d.y + d.dy) - y(d.y); });

    text.transition()
      .duration(750)
      .attr('x', function(d) { return x(d.x) + pad; })
      .attr('y', function(d) { return y(d.y) + pad; })
      .attr('width', function(d) { return x(d.x + d.dx) - x(d.x) + pad; })
      .attr('height', function(d) { return y(d.y + d.dy) - y(d.y) + pad; });
  }

  function loadChildren(d) {
    console.log(d);
    runtimeThreshold = d.runtime * 0.01;
    loader.getCall(d.callId)
      .then(function(call) {
        console.log('get children');
        return call.getCalls();
      })
      .then(function(childData) {
        var d = childData;
        var l = level + 1;
        var p = temp.callId;
        console.log(d.length);

        
        if(d.length > 0) {
          $.each(d, function(index, child) {
            if(calledId.indexOf(child.id) == -1) {
              // call_id, parent, level
              getData(child.id, p, l);
            }
          });
        }
      });
  }

  function numberToColorHsl(i) {
    var hue = i * 1.2 / 360;
    var rgb = hslToRgb(hue, 1, .5); 
    return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')'; 
  }

  function hue2rgb(p, q, t){
    if (t < 0) { t += 1; }
    if (t > 1) { t -= 1; }
    if (t < 1/6) { return p + (q - p) * 6 * t; }
    if (t < 1/2) { return q; }
    if (t < 2/3) { return p + (q - p) * (2/3 - t) * 6; }
    return p;
  }

  function hslToRgb(h, s, l){
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
  }

  function getColor(max, val) {
    var p = val / max * 100;
    return numberToColorHsl(p);
  }

  // run for main function
  loader.getFunctionBySignature('main')
    .then(function(res) {
      return res.getCalls();
    })
    .then(function(res) {
      getData(res[0].id, 'null', 1);
    });
}

