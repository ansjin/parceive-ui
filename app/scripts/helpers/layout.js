function sortByMaxSequence(a, b) {
  if (a.maxSequence < b.maxSequence) {
    return 1;
  } else if (a.maxSequence > b.maxSequence) {
    return -1;
  } else {
    return b.getDuration() - a.getDuration();
  }
}

function sortByStartTime(a, b) {
  return b.start - a.start;
}

angular.module('app')
  .service('LayoutCallGraphService',
  [function() {
  var conf = {
    horisontalMargin: 20,
    verticalMargin: 0
  };

  function clearLayout(callgraph) {
    function clearNode(call) {
      delete call.x;
      delete call.y;
      delete call.maxSequence;
      delete call.rank;
    }

    _.forEach(callgraph.getCalls(), clearNode);
    _.forEach(callgraph.getReferences(), clearNode);
  }

  function rankCalls(callgraph, root) {
    var rank = [[root]];

    var index = 0;
    var i;
    var j;

    while (true) {
      var last = rank[index];
      var current = [];

      for (i = 0; i < last.length; i++) {
        var successors = last[i].children;

        if (_.isUndefined(successors)) {
          continue;
        }

        for (j = 0; j < successors.length; j++) {
          current.push(successors[j]);
        }
      }

      index++;

      if (current.length > 0) {
        rank.push(current);
      } else {
        break;
      }
    }

    for (i = 0; i < rank.length; i++) {
      var line = rank[i];

      for (j = 0; j < line.length; j++) {
        line[j].rank = i;
      }
    }

    root.rank = rank;
  }

  function calcMaxSequence(callgraph) {
    function visit(node) {
      var next;

      if (_.isUndefined(node.children) || node.children.length === 0) {
        next = 0;
      } else {
        next = _.max(node.children, visit);
      }

      node.maxSequence = next + 1;

      return node.maxSequence;
    }

    _.forEach(callgraph.getRoots(), visit);
  }

  function maxWidth(nodes) {
    var max = nodes[0].width;

    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].width > max) {
        max = nodes[i].width;
      }
    }

    return max;
  }

  function layoutCalls(callgraph, root) {
    var i;
    var j;

    var x = 0;
    var y = 0;

    var rank = root.rank;
    var sort;

    switch (callgraph.conf.sorting) {
      case 'Importance':
        sort = sortByMaxSequence;
        break;
      case 'Time':
        sort = sortByStartTime;
        break;
    }

    for (i = 0; i < rank.length; i++) {
      rank[i].sort(sort);
    }

    for (i = 0; i < rank.length; i++) {
      var width = maxWidth(rank[i]);

      var column = new Array(rank[i].length);

      var mid = Math.floor(rank[i].length / 2);
      var at = 0;

      for (j = 0; j < rank[i].length; j++) {
        column[mid + at] = rank[i][j];

        if (at >= 0) {
          at++;
        }

        at = -at;
      }

      y = 0;
      for (j = 0; j < column.length; j++) {
        column[j].x = x;
        column[j].y = y;

        y += column[j].height + conf.verticalMargin;
      }

      var distUp = y / 2;

      if (column.length % 2 === 0) {
        distUp += column[column.length - 1].height / 2;
      }

      for (j = 0; j < column.length; j++) {
        column[j].y -= distUp;
      }

      x += width + conf.horisontalMargin;
    }
  }

  function layoutRoots(callgraph) {
    var roots = callgraph.getRoots();

    roots.sort(sortByStartTime);

    var y = 0;

    _.forEach(roots, function(root, index) {
      root.y = y;

      if (index > 0) {
        var intermediate = _.find(root.rank, function(level) {
          var max = _.max(level, function(node) {
            return node.end;
          });

          return root.start > max;
        });

        if (intermediate) {
          root.x = roots[index - 1].x + intermediate[0].x;
        } else {
          root.x = roots[index - 1].x + roots[index - 1].width;
        }
      } else {
        root.x = 0;
      }

      y += root.height;
    });

    _.forEach(roots, function(root) {
      function visit(node) {
        node.x += root.x;
        node.y += root.y;

        _.forEach(node.chilren, visit);
      }

      root.x /= 2;
      root.y /= 2;

      visit(root);
    });
  }

  function layout(callgraph) {
    clearLayout(callgraph);
    calcMaxSequence(callgraph);

    _.forEach(callgraph.getRoots(), function(root) {
      rankCalls(callgraph, root);
      layoutCalls(callgraph, root);
    });

    layoutRoots(callgraph);
  }

  return layout;

}]);
