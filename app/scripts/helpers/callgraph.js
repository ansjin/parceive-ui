angular.module('app')
  .service('CallGraphDataService', ['loader', 'dagre', function(loader, dagre) {
    function setNodeSize(data) {
      data.width = 50;
      data.height = 10;
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

      if (!graph.graph().includeMemoryNodes) {
        refPromise = RSVP.Promise.resolve();
      } else {
        refPromise = addReferences(graph, self);
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
      createGraph: function(root, expanded, includeMemoryNodes) {
        var g = new dagre.graphlib.Graph({
          directed: true
        });
        g.setGraph({
          rankdir: 'LR',
          root: root,
          includeMemoryNodes: includeMemoryNodes,
          expanded: expanded
        });

        return addCall(g, root, 0).then(function() {
          dagre.layout(g);

          return g;
        });
      },

      expandCall: function(graph, call) {
        graph.graph().expanded.push(call.id);

        var data = graph.node('call:' + call.id);
        data.isExpanded = true;

        return addCallChildren(graph, data).then(function() {
          dagre.layout(graph);
        });
      },

      collapseCall: function collapseCall(graph, call) {
        var expanded = graph.graph().expanded;

        var index = expanded.indexOf(call.id);
        if (index > -1) {
          expanded.splice(index, 1);
        } else {
          return;
        }

        graph.node('call:' + call.id).isExpanded = false;
        _.forEach(graph.children('call:' + call.id), function(child) {
          var refs = graph.successors(child);
          graph.removeNode(child);
          _.forEach(refs, function(ref) {
            if (graph.node(ref).isReference) {
              if (graph.predecessors(ref).length === 0) {
                graph.removeNode(ref);
              }
            } else if (graph.node(ref).isCall) {
              collapseCall(graph, graph.node(ref).call);
            }
          });
        });

        dagre.layout(graph);
      }
    };
  }]);
