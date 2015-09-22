angular.module('app')
  .service('CallGraphDataService',
  ['LoaderService', 'dagre', 'SizeService',
  function(loader, dagre, sizeHelper) {
    function setNodeSize(data) {
      var text = data.label;

      var size = sizeHelper.svgTextSize(text);

      data.width = size.width;
      data.height = size.height;
    }

    function syncNodeExpanded(graph, node) {
      if (graph.graph().expanded.indexOf(node) >= 0) {
        graph.node(node).isExpanded = true;
      } else {
        graph.node(node).isExpanded = false;
      }

      if (graph.graph().expandedMemory.indexOf(node) >= 0) {
        graph.node(node).isMemoryExpanded = true;
      } else {
        graph.node(node).isMemoryExpanded = false;
      }
    }

    function addExpanded(graph, node) {
      graph.graph().expanded.push(node);
      graph.node(node).isExpanded = true;
    }

    function clearExpanded(graph, node) {
      var index = graph.graph().expanded.indexOf(node);
      if (index > -1) {
        graph.graph().expanded.splice(index, 1);
      } else {
        return;
      }
      graph.node(node).isExpanded = false;
    }

    function syncExpanded(graph) {
      var expanded = graph.graph().expanded;
      _.forEach(graph.nodes(), function(node) {
        if (expanded.indexOf(node) >= 0) {
          graph.node(node).isExpanded = true;
        } else {
          graph.node(node).isExpanded = false;
        }
      });
    }

    function addExpandedMemory(graph, node) {
      graph.graph().expandedMemory.push(node);
      graph.node(node).isMemoryExpanded = true;
    }

    function clearExpandedMemory(graph, node) {
      var index = graph.graph().expandedMemory.indexOf(node);
      if (index > -1) {
        graph.graph().expandedMemory.splice(index, 1);
      } else {
        return;
      }
      graph.node(node).isMemoryExpanded = false;
    }

    function syncExpandedMemory(graph) {
      var expanded = graph.graph().expandedMemory;
      _.forEach(graph.nodes(), function(node) {
        if (expanded.indexOf(node) >= 0) {
          graph.node(node).isMemoryExpanded = true;
        } else {
          graph.node(node).isMemoryExpanded = false;
        }
      });
    }

    function cleanMemoryNodes(graph) {
      _.chain(graph.nodes())
        .map(function(node) {
          return graph.node(node);
        })
        .filter(function(node) {
          return node.isReference;
        })
        .filter(function(node) {
          var into = graph.predecessors(node.id);
          return into.length === 0;
        })
        .forEach(function(node) {
          graph.removeNode(node.id);
        })
        .value();
    }

    function addReferences(graph, call) {
      return call.getReferences().then(function(refs) {
        _.forEach(refs, function(ref) {
          if (!graph.hasNode('ref:' + ref.id)) {
            var data = {
              label: ref.name,
              reference: ref,
              isReference: true,
              id: 'ref:' + ref.id
            };

            setNodeSize(data);

            graph.setNode('ref:' + ref.id, data);
          }
        });

        return call.getAccesses();
      }).then(function(accesses) {
        return RSVP.all(_.map(accesses, function(access) {
          return access.getReference().then(function(ref) {
            var data = graph.edge('call:' + call.id, 'ref:' + ref.id);
            if (!data) {
              data = {
                reads: 0,
                writes: 0,
                isEdge: true
              };
              graph.setEdge('call:' + call.id, 'ref:' + ref.id, data);
            }

            if (access.type === 'READ') {
              data.reads++;
            } else if (access.type === 'WRITE') {
              data.writes++;
            }
          });
        }));
      });
    }

    function addCallChildren(graph, node) {
      var self = node.call;

      var childrenPromise = self.getCalls().then(function(calls) {
        var promises = _.map(calls, function(call) {
          return addCall(graph, call, node.level + 1);
        });

        return RSVP.all(promises).then(function() {
          return calls;
        });
      }).then(function(calls) {
        _.forEach(calls, function(call) {
          if (self.id !== call.id) {
            var data = graph.edge('call:' + self.id, 'call:' + call.id);
            if (!data) {
              data = {
                isEdge: true
              };
              graph.setEdge('call:' + self.id, 'call:' + call.id, data);
            }
          }
        });
      });

      var refPromise;

      if (node.isMemoryExpanded) {
        refPromise = addReferences(graph, self);
      } else {
        refPromise = RSVP.Promise.resolve();
      }

      return RSVP.all([childrenPromise, refPromise]);
    }

    function addCall(graph, self, level) {
      if (graph.hasNode('call:' + self.id) &&
        graph.node('call:' + self.id)) {
        return RSVP.Promise.resolve();
      }

      var data = {
        call: self,
        level: level,
        isCall: true,
        id: 'call:' + self.id
      };

      graph.setNode(data.id, data);
      syncNodeExpanded(graph, data.id);

      var fctPromise = self.getFunction().then(function(fct) {
        data.fct = fct;
        data.label = fct.signature;

        setNodeSize(data);
      });

      if (data.isExpanded) {
        return RSVP.all([fctPromise, addCallChildren(graph, data)]);
      } else {
        return fctPromise;
      }

    }

    return {
      createGraph: function(root, expanded, expandedMemory) {
        var g = new dagre.graphlib.Graph({
          directed: true
        });

        g.setGraph({
          rankdir: 'LR',
          root: root,
          expandedMemory: expandedMemory,
          expanded: expanded,
          nodesep: 5,
          edgesep: 1,
          ranksep: 20
        });

        return addCall(g, root, 0).then(function() {
          syncExpanded(g);
          syncExpandedMemory(g);
          return g;
        });
      },

      expandCall: function(graph, call) {
        var data = graph.node('call:' + call.id);

        addExpanded(graph, 'call:' + call.id);

        return addCallChildren(graph, data);
      },

      expandCallMemory: function(graph, call) {
        addExpandedMemory(graph, 'call:' + call.id);

        return addReferences(graph, call);
      },

      collapseCallMemory: function(graph, call) {
        clearExpandedMemory(graph, 'call:' + call.id);

        _.forEach(graph.successors('call:' + call.id), function(child) {
          if (graph.node(child).isReference) {
            graph.removeEdge('call:' + call.id, child);
          }
        });

        cleanMemoryNodes(graph);
      },

      collapseCall: function collapseCall(graph, call, leaveRefs,
          leaveExpanded) {
        if (!leaveExpanded) {
          clearExpanded(graph, 'call:' + call.id);
        }

        _.forEach(graph.successors('call:' + call.id), function(child) {
          if (graph.node(child).isCall) {
            collapseCall(graph, graph.node(child).call, true, true);
            graph.removeNode(child);
          }
        });

        if (!leaveRefs) {
          cleanMemoryNodes(graph);
        }
      }
    };
  }]);
