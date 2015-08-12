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
                writes: 0
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

      var childrenPromise;

      if (!_.includes(graph.graph().expanded, self.id)) {
        childrenPromise = RSVP.Promise.resolve();
      } else {
        childrenPromise = self.getCalls().then(function(calls) {
          var promises = _.map(calls, function(call) {
            return addCall(graph, call, node.level + 1);
          });

          return RSVP.all(promises).then(function() {
            return calls;
          });
        }).then(function(calls) {
          _.forEach(calls, function(call) {
            if (self.id !== call.id) {
              graph.setEdge('call:' + self.id, 'call:' + call.id, {});
            }
          });
        });
      }

      var refPromise;

      if (node.isMemoryExpanded) {
        refPromise = addReferences(graph, self);
      } else {
        refPromise = RSVP.Promise.resolve();
      }

      return RSVP.all([childrenPromise, refPromise]);
    }

    function addCall(graph, self, level) {
      if (graph.hasNode('call:' + self.id)) {
        return RSVP.Promise.resolve();
      }

      var data = {
        call: self,
        level: level,
        isCall: true,
        id: 'call:' + self.id
      };

      graph.setNode(data.id, data);

      var fctPromise = self.getFunction().then(function(fct) {
        data.fct = fct;
        data.label = fct.signature;

        setNodeSize(data);
      });

      return RSVP.all([fctPromise, addCallChildren(graph, data)]);
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
          return g;
        });
      },

      expandCall: function(graph, call) {
        graph.graph().expanded.push(call.id);

        var data = graph.node('call:' + call.id);
        data.isExpanded = true;

        return addCallChildren(graph, data);
      },

      expandCallMemory: function(graph, call) {
        graph.graph().expandedMemory.push(call.id);

        var data = graph.node('call:' + call.id);
        data.isMemoryExpanded = true;

        return addReferences(graph, call);
      },

      collapseCallMemory: function(graph, call) {
        var expanded = graph.graph().expandedMemory;

        var index = expanded.indexOf(call.id);
        if (index > -1) {
          expanded.splice(index, 1);
        } else {
          return;
        }

        graph.node('call:' + call.id).isMemoryExpanded = false;

        _.forEach(graph.successors('call:' + call.id), function(child) {
          if (graph.node(child).isReference) {
            graph.removeEdge('call:' + call.id, child);
          }
        });

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
      },

      collapseCall: function collapseCall(graph, call, leaveRefs) {
        var expanded = graph.graph().expanded;

        var index = expanded.indexOf(call.id);
        if (index > -1) {
          expanded.splice(index, 1);
        } else {
          return;
        }

        graph.node('call:' + call.id).isExpanded = false;
        _.forEach(graph.successors('call:' + call.id), function(child) {
          if (graph.node(child).isCall) {
            collapseCall(graph, graph.node(child).call, true);
            graph.removeNode(child);
          }
        });

        if (!leaveRefs) {
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
      }
    };
  }]);
