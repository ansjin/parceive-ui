angular.module('app')
  .service('CallGraphDataService',
  ['d3', 'SizeService', 'LoaderService', function(d3, SizeService, loader) {
    function CallGraph() {
      this.roots = [];
      this.references = [];

      this.conf = {
        sorting: 'Importance',
        textSize: 10
      };

      this.tree = d3.layout.tree();

      this.tree.children(function(node) {
        var all = [];

        if (node.calls) {
          all = all.concat(node.calls);
        }

        if (node.loopExecutions) {
          all = all.concat(node.loopExecutions);
        }

        if (node.loopIterations) {
          all = all.concat(node.loopIterations);
        }

        return all;
      });

      this.tree.sort(function(a, b) {
        switch (a.type) {
          case 'LoopIteration':
            return a.data.id - b.data.id;
          default:
            return a.data.start - b.data.start;
        }
      });
    }

    CallGraph.prototype.addToRoots = function(node) {
      if (!_.includes(this.roots, node)) {
        this.roots.push(node);
      }
    };

    CallGraph.prototype.layout = function() {
      var root = {
        calls: this.getRoots()
      };

      var nodes = this.tree.nodes(root);

      var maxNodeWidth = _.max(nodes, 'width').width + 20;
      var maxNodeHeight = _.max(nodes, 'width').height + 20;
      var maxNodeDepth = _.max(nodes, 'depth').depth;
      var maxNodeBreath = _.max(_.groupBy(nodes, 'depth'), 'length').length;

      _.forEach(nodes, function(node) {
        var tmp = node.x;
        node.x = node.y * maxNodeWidth * maxNodeDepth;
        node.y = tmp * maxNodeHeight * maxNodeBreath;
      });

      _.forEach(root.calls, function(root) {
        delete root.parent;
      });
    };

    CallGraph.prototype.addCallRoot = function(call) {
      var node = this.addCall(call);
      this.addToRoots(node);
      return node.load();
    };

    CallGraph.prototype.addCallGroupRoot = function(callgroup) {
      var node = this.addCallGroup(callgroup);
      this.addToRoots(node);
      return node.load();
    };

    CallGraph.prototype.addCall = function(call, parent) {
      var existing = _.find(this.getNodes(), function(node) {
        return call === node.data && node.type === 'Call';
      });

      if (existing) {
        return existing;
      } else {
        return new Call(this, call, parent);
      }
    };

    CallGraph.prototype.addCallGroup = function(callgroup, parent) {
      var existing = _.find(this.getNodes(), function(node) {
        return callgroup === node.data && node.type === 'CallGroup';
      });

      if (existing) {
        return existing;
      } else {
        return new CallGroup(this, callgroup, parent);
      }
    };

    CallGraph.prototype.addReference = function(reference) {
      var existing = _.find(this.references, function(node) {
        return reference === node.data;
      });

      if (existing) {
        return existing;
      } else {
        return new Reference(this, reference);
      }
    };

    CallGraph.prototype.getNodes = function() {
      var nodes = [];

      function processNode(node) {
        nodes.push(node);

        _.forEach(node.calls, processNode);
        _.forEach(node.loopExecutions, processNode);
        _.forEach(node.loopIterations, processNode);
      }

      _.forEach(this.roots, processNode);

      return nodes;
    };

    CallGraph.prototype.getEdges = function() {
      var edges = [];

      function getCallProper(parent) {
        return function(node) {
          processNode(node, parent);
        };
      }

      function processNode(node, parent) {
        edges.push([parent, node]);

        _.forEach(node.calls, getCallProper(node));
        _.forEach(node.loopExecutions, getCallProper(node));
        _.forEach(node.loopIterations, getCallProper(node));
      }

      _.forEach(this.roots, function(root) {
        _.forEach(root.calls, getCallProper(root));
        _.forEach(root.loopExecutions, getCallProper(root));
        _.forEach(root.loopIterations, getCallProper(root));
      });

      _.forEach(this.references, function(reference) {
        var i;
        for (i = 0; i < reference.nodes.length; i++) {
          var edge = [reference.nodes[i], reference];

          edge.details = reference.edgeDetails[i];

          edges.push(edge);
        }
      });

      return edges;
    };

    CallGraph.prototype.getReferences = function() {
      return this.references;
    };

    CallGraph.prototype.getRoots = function() {
      return this.roots;
    };

    CallGraph.prototype.computeSizes = function() {
      var self = this;
      _.forEach(self.getNodes(), function(node) {
        var size = SizeService.textSize(node.getLabel(),
          self.conf.textSize);

        node.width = size.width;
        node.height = size.height;
      });
    };

    CallGraph.prototype.spot = function(elements) {
      var self = this;

      self.roots = [];
      self.references = [];

      return RSVP.all(_.map(elements, function(element) {
        if (element.type === 'Call') {
          return loader.getCall(element.id).then(function(call) {
            return self.addCallRoot(call);
          });
        } else if (element.type === 'CallGroup') {
          return loader.getCallGroup(element.id).then(function(callgroup) {
            return self.addCallGroupRoot(callgroup);
          });
        }
      })).then(function() {
        var oldRoots;
        function loadAllParents() {
          oldRoots = _.clone(self.roots);
          return RSVP.all([
            _.map(self.roots, function(root) {
              return root.loadParent();
            })
          ]);
        }

        function doParentLoad() {
          if (self.roots.length > 1 && !_.isEqual(self.roots, oldRoots)) {
            return loadAllParents().then(doParentLoad);
          }
        }

        return doParentLoad();
      }).then(function() {
        self.roots = _.map(self.roots, function(root) {
          var last = root;
          while (last.calls && last.calls.length === 1 && !_.any(elements,
          function(e) {
            return e.type === last.type && e.id === last.data.id;
          })) {
            last = last.calls[0];
          }
          return last;
        });
      });
    };

    CallGraph.prototype.showSharedReferences = function(marked) {
      var self = this;
      var allNodes = this.getNodes();

      var nodes = _.chain(marked)
        .map(function(data) {
          return _.find(allNodes, function(node) {
            return node.type === data.type && node.data.id === data.id;
          });
        })
        .filter(function(node) {
          return !_.isUndefined(node);
        }).value();

      _.forEach(nodes, function(node) {
        node.unloadReferences();
        delete node.references;
      });

      var callIds = _.chain(nodes)
        .filter(function(node) {
          return node.type === 'Call';
        }).map(function(node) {
          return node.data.id;
        }).value();

      var callgroupIds = _.chain(nodes)
        .filter(function(node) {
          return node.type === 'CallGroup';
        }).map(function(node) {
          return node.data.id;
        }).value();

      var loopexecutionIds = _.chain(nodes)
        .filter(function(node) {
          return node.type === 'LoopExecution';
        }).map(function(node) {
          return node.data.id;
        }).value();

      var loopiterationIds = _.chain(nodes)
        .filter(function(node) {
          return node.type === 'LoopIteration';
        }).map(function(node) {
          return node.data.id;
        }).value();

      return loader.getSharedReferences(callIds, callgroupIds,
        loopexecutionIds, loopiterationIds).then(
      function(refs) {
        refs = _.map(refs, function(ref) {
          return self.addReference(ref);
        });

        _.forEach(nodes, function(node) {
          node.references = refs;

          _.forEach(refs, function(ref) {
            ref.addNode(node);
          });
        });
      });
    };

    CallGraph.prototype.showRecursiveSharedReferences = function(marked) {
      var self = this;
      var allNodes = this.getNodes();

      var nodes = _.map(marked, function(data) {
        return _.find(allNodes, function(node) {
          return node.type === data.type && node.data.id === data.id;
        });
      });

      _.forEach(nodes, function(node) {
        node.unloadReferences();
        delete node.references;
      });

      var callIds = _.chain(nodes)
        .filter(function(node) {
          return node.type === 'Call';
        }).map(function(node) {
          return node.data.id;
        }).value();

      var callgroupIds = _.chain(nodes)
        .filter(function(node) {
          return node.type === 'CallGroup';
        }).map(function(node) {
          return node.data.id;
        }).value();

      return loader.getRecursiveSharedReferences(callIds, callgroupIds).then(
      function(refs) {
        refs = _.map(refs, function(ref) {
          return self.addReference(ref);
        });

        _.forEach(nodes, function(node) {
          node.references = refs;

          _.forEach(refs, function(ref) {
            ref.addNode(node);
          });
        });
      });
    };

    /**************************************************************** Helpers */

    function toggleFunction(field, load, unload) {
      return function() {
        if (_.isUndefined(this[field])) {
          return load.call(this);
        } else {
          unload.call(this);
          return RSVP.resolve();
        }
      };
    }

    /******************************************************************* Node */

    function Node(callgraph, data, parent) {
      this.callgraph = callgraph;
      this.data = data;
      if (parent) {
        this.parent = parent;
      }

      this.uuid = _.uuid();
    }

    Node.prototype.getDuration = function() {
      return this.data.duration;
    };

    Node.prototype.getStart = function() {
      return this.data.start;
    };

    Node.prototype.loadRecursiveReferences = function() {
      var self = this;
      return self.data.getRecursiveReferences().then(function(references) {
        self.references = _.map(references, function(reference) {
          return self.callgraph.addReference(reference);
        });

        _.forEach(self.references, function(reference) {
          reference.addNode(self);
        });

        return self.calls;
      });
    };

    Node.prototype.unloadReferences = function() {
      var self = this;

      _.forEach(self.references, function(reference) {
        reference.removeNode(self);
      });

      delete self.references;
    };

    Node.prototype.loadCallChildren = function() {
      var self = this;

      return self.data.getCalls().then(function(children) {
        self.calls = _.map(children, function(child) {
          return self.callgraph.addCall(child, self);
        });

        return RSVP.all(_.map(self.calls, function(child) {
          return child.load();
        })).then(function() {
          return self.calls;
        });
      });
    };

    Node.prototype.loadDirectCalls = function() {
      var self = this;

      return self.data.getDirectCalls().then(function(children) {
        self.calls = _.map(children, function(child) {
          return self.callgraph.addCall(child, self);
        });

        return RSVP.all(_.map(self.calls, function(child) {
          return child.load();
        })).then(function() {
          return self.calls;
        });
      });
    };

    Node.prototype.loadCallGroupChildren = function() {
      var self = this;

      return self.data.getCallGroups().then(function(children) {
        self.calls = _.map(children, function(child) {
          return self.callgraph.addCallGroup(child, self);
        });

        return RSVP.all(_.map(self.calls, function(child) {
          if (child.data.count === 1) {
            return child.loadCalls();
          } else {
            return child.load();
          }
        })).then(function() {
          return self.calls;
        });
      });
    };

    Node.prototype.unloadChildren = function() {
      _.forEach(this.calls, function(child) {
        child.unloadChildren();
        child.unloadAssociations();
      });

      delete this.calls;
    };

    Node.prototype.unloadParent = function(keepReferences) {
      if (_.isUndefined(this.parent) || _.isNull(this.parent)) {
        return;
      }

      var oldNodes;

      if (_.isUndefined(keepReferences)) {
        oldNodes = this.callgraph.getNodes();
      }

      this.parent.unloadParent(true);
      this.parent.unloadAssociations();

      this.callgraph.roots.remove(this.parent);
      this.callgraph.addToRoots(this);

      delete this.parent;

      if (_.isUndefined(keepReferences)) {
        var newNodes = this.callgraph.getNodes();

        var removed = _.difference(oldNodes, newNodes);

        _.forEach(removed, function(node) {
          node.unloadAssociations();
        });
      }
    };

    /******************************************************************* Call */

    function Call(callgraph, call, parent) {
      Node.call(this, callgraph, call, parent);

      this.type = 'Call';
    }

    Call.prototype = Object.create(Node.prototype);

    Call.prototype.load = function() {
      var self = this;
      return self.data.getFunction().then(function(fct) {
        self.function = fct;
      });
    };

    Call.prototype.getLabel = function() {
      return this.function.name;
    };

    Call.prototype.loadChildren = function() {
      this.unloadLoopExecutions();
      this.unloadChildren();

      return this.loadCallGroupChildren();
    };

    Call.prototype.loadParent = function() {
      var self = this;

      if (self.parent || _.isNull(self.parent)) {
        return RSVP.resolve();
      }

      return self.data.getCaller().then(function(caller) {
        if (_.isNull(caller)) {
          self.parent = null;
          return RSVP.resolve();
        }

        self.parent = self.callgraph.addCall(caller);

        self.callgraph.roots.remove(self);
        if (!self.parent.parent) {
          self.callgraph.addToRoots(self.parent);
        }

        if (self.parent.calls) {
          self.parent.calls.push(self);
        } else {
          self.parent.calls = [self];
        }

        return self.parent.load();
      });
    };

    Call.prototype.unloadAssociations = function() {
      this.unloadReferences();
      this.unloadLoopExecutions();
    };

    Call.prototype.loadLoopExecutions = function() {
      var self = this;

      self.unloadChildren();

      return RSVP.hash({
        loops: self.data.getDirectLoopExecutions()
          .then(function(loopExecutions) {
          self.loopExecutions = _.map(loopExecutions, function(loopExecution) {
            return new LoopExecution(self.callgraph, loopExecution, self);
          });

          return self.loopExecutions;
        }),
        calls: self.loadDirectCalls()
      });
    };

    Call.prototype.unloadLoopExecutions = function() {
      _.forEach(this.loopExecutions, function(loopExecution) {
        loopExecution.unloadChildren();
        loopExecution.unloadAssociations();
      });

      delete this.loopExecutions;
    };

    Call.prototype.loadReferences = function() {
      var self = this;
      return self.data.getCallReferences().then(function(callreferences) {
        self.callreferences = callreferences;

        return RSVP.all(_.map(callreferences, function(callreference) {
          return callreference.getReference();
        })).then(function(references) {
          self.references = _.map(references, function(reference) {
            return self.callgraph.addReference(reference);
          });

          _.forEach(self.references, function(reference, index) {
            reference.addNode(self, self.callreferences[index]);
          });

          return self.references;
        });
      });
    };

    Call.prototype.loadRecursiveReferences = function() {
      var self = this;
      return self.data.getRecursiveCallReferences().then(function(callreferences) {
        self.callreferences = callreferences;

        return RSVP.all(_.map(callreferences, function(callreference) {
          return callreference.getReference();
        })).then(function(references) {
          self.references = _.map(references, function(reference) {
            return self.callgraph.addReference(reference);
          });

          _.forEach(self.references, function(reference, index) {
            reference.addNode(self, self.callreferences[index]);
          });

          return self.references;
        });
      });
    };

    Call.prototype.toggleChildren = toggleFunction
      ('calls',
       Call.prototype.loadChildren,
       Call.prototype.unloadChildren);
    Call.prototype.toggleReferences = toggleFunction
      ('references',
       Call.prototype.loadReferences,
       Call.prototype.unloadReferences);
    Call.prototype.toggleRecursiveReferences = toggleFunction
     ('references',
      Call.prototype.loadRecursiveReferences,
      Node.prototype.unloadReferences);
    Call.prototype.toggleLoopExecutions = toggleFunction
     ('loopExecutions',
      Call.prototype.loadLoopExecutions,
      Call.prototype.unloadLoopExecutions);
    Call.prototype.toggleParent = toggleFunction
     ('parent',
      Call.prototype.loadParent,
      Node.prototype.unloadParent);

    /********************************************************** LoopExecution */

    function LoopExecution(callgraph, loopExecution, parent) {
      Node.call(this, callgraph, loopExecution, parent);

      this.type = 'LoopExecution';
    }

    LoopExecution.prototype = Object.create(Node.prototype);

    LoopExecution.prototype.getLabel = function() {
      return this.data.id;
    };

    LoopExecution.prototype.getStart = function() {
      return this.data.id;
    };

    LoopExecution.prototype.getDuration = function() {
      return 0;
    };

    LoopExecution.prototype.loadChildren = function() {
      this.unloadLoopIterations();

      return this.loadCallChildren();
    };

    LoopExecution.prototype.loadLoopIterations = function() {
      var self = this;

      self.unloadChildren();

      return self.data.getLoopIterations().then(
        function(loopIterations) {
        self.loopIterations = _.map(loopIterations, function(loopIteration) {
          return new LoopIteration(self.callgraph, loopIteration, self);
        });

        return self.loopIterations;
      });
    };

    LoopExecution.prototype.unloadLoopIterations = function() {
      _.forEach(this.loopIterations, function(loopiteration) {
        loopiteration.unloadChildren();
        loopiteration.unloadAssociations();
      });

      delete this.loopIterations;
    };

    LoopExecution.prototype.unloadAssociations = function() {
      this.unloadReferences();
      this.unloadLoopIterations();
    };

    LoopExecution.prototype.toggleChildren = toggleFunction
      ('calls',
       LoopExecution.prototype.loadChildren,
       LoopExecution.prototype.unloadChildren);
    LoopExecution.prototype.toggleReferences = toggleFunction
      ('references',
       LoopExecution.prototype.loadReferences,
       LoopExecution.prototype.unloadReferences);
    LoopExecution.prototype.toggleLoopIterations = toggleFunction
     ('loopIterations',
      LoopExecution.prototype.loadLoopIterations,
      LoopExecution.prototype.unloadLoopIterations);

    /********************************************************** LoopIteration */

    function LoopIteration(callgraph, loopIteration, parent) {
      Node.call(this, callgraph, loopIteration, parent);

      this.type = 'LoopIteration';
    }

    LoopIteration.prototype = Object.create(Node.prototype);

    LoopIteration.prototype.getLabel = function() {
      return this.data.id;
    };

    LoopIteration.prototype.getStart = function() {
      return this.data.id;
    };

    LoopIteration.prototype.getDuration = function() {
      return 0;
    };

    LoopIteration.prototype.loadChildren = function() {
      return this.loadCallChildren();
    };

    LoopIteration.prototype.unloadAssociations = function() {
      this.unloadReferences();
    };

    LoopIteration.prototype.loadLoopExecutions = function() {
      var self = this;

      self.unloadChildren();

      return self.data.getLoopExecutions().then(function(loopExecutions) {
        self.loopExecutions = _.map(loopExecutions, function(loopExecution) {
          return new LoopExecution(self.callgraph, loopExecution, self);
        });

        return self.loopExecutions;
      });
    };

    LoopIteration.prototype.unloadLoopExecutions = function() {
      this.unloadChildren();

      _.forEach(this.loopExecutions, function(loopExecution) {
        loopExecution.unloadChildren();
        loopExecution.unloadAssociations();
      });

      delete this.loopExecutions;
    };

    LoopIteration.prototype.toggleChildren = toggleFunction
      ('calls',
       LoopIteration.prototype.loadChildren,
       LoopIteration.prototype.unloadChildren);
    LoopIteration.prototype.toggleLoopExecutions = toggleFunction
      ('loopExecutions',
       LoopIteration.prototype.loadLoopExecutions,
       LoopIteration.prototype.unloadLoopExecutions);
    LoopIteration.prototype.toggleReferences = toggleFunction
      ('references',
       LoopIteration.prototype.loadReferences,
       LoopIteration.prototype.unloadReferences);

    /************************************************************** Reference */

    function Reference(callgraph, reference) {
      this.data = reference;
      this.callgraph = callgraph;

      this.type = 'Reference';
      this.uuid = _.uuid();

      this.nodes = [];
      this.edgeDetails = [];

      callgraph.references.push(this);
    }

    Reference.prototype.getLabel = function() {
      return this.data.name;
    };

    Reference.prototype.checkUnload = function() {
      if (this.nodes.length === 0) {
        this.unload();
      }
    };

    Reference.prototype.removeNode = function(call) {
      this.nodes.remove(call);
      this.checkUnload();
    };

    Reference.prototype.unload = function() {
      var self = this;

      _.forEach(self.nodes, function(call) {
        call.references.remove(self);
      });

      self.callgraph.references.remove(self);
    };

    Reference.prototype.addNode = function(call, details) {
      this.nodes.push(call);
      this.edgeDetails.push(details);
    };

    Reference.prototype.loadLinks = function() {
      var self = this;
      var nodes = self.callgraph.getNodes();

      function process(all) {
        _.forEach(all, function(call) {
          _.forEach(nodes, function(node) {
            if (node.data === call && !_.includes(node.references, self)) {
              self.addNode(node);

              if (_.isUndefined(node.references)) {
                node.references = [];
              }

              node.references.push(self);
            }
          });
        });
      }

      return RSVP.all([
        self.data.getCalls().then(process),
        self.data.getCallGroups().then(process)
      ]);
    };

    /************************************************************** CallGroup */

    function CallGroup(callgraph, callgroup, parent) {
      Node.call(this, callgraph, callgroup, parent);

      this.type = 'CallGroup';
    }

    CallGroup.prototype = Object.create(Node.prototype);

    CallGroup.prototype.load = function() {
      var self = this;
      return self.data.getFunction().then(function(fct) {
        self.function = fct;
      });
    };

    CallGroup.prototype.getLabel = function() {
      return this.function.name;
    };

    CallGroup.prototype.getDuration = function() {
      return this.data.duration;
    };

    CallGroup.prototype.getStart = function() {
      return this.data.start;
    };

    CallGroup.prototype.loadChildren = function() {
      return this.loadCallGroupChildren();
    };

    CallGroup.prototype.loadParent = function() {
      var self = this;

      return self.data.getCaller().then(function(caller) {
        if (_.isNull(caller)) {
          self.parent = null;
          return RSVP.resolve();
        }

        self.parent = self.callgraph.addCall(caller);

        self.callgraph.roots.remove(self);
        if (!self.parent.parent) {
          self.callgraph.addToRoots(self.parent);
        }

        if (self.parent.calls) {
          self.parent.calls.push(self);
        } else {
          self.parent.calls = [self];
        }

        return self.parent.load();
      });
    };

    CallGroup.prototype.unloadAssociations = function() {
      this.unloadReferences();
    };

    CallGroup.prototype.loadCalls = function() {
      var self = this;

      return self.data.getCalls().then(function(calls) {
        self.unloadAssociations();

        if (self.parent) {
          self.parent.calls.remove(self);

          var added = _.map(calls, function(call) {
            var node = self.callgraph.addCall(call, self.parent);
            self.parent.calls.push(node);
            return node;
          });

          return RSVP.all(_.map(added, function(node) {
            return node.load();
          }));
        } else {
          self.callgraph.roots.remove(self);

          var addedRoots = _.forEach(calls, function(call) {
            var node = self.callgraph.addCall(call, self.parent);
            self.callgraph.addToRoots(node);
            return node;
          });

          return RSVP.all(_.map(addedRoots, function(node) {
            return node.load();
          }));
        }
      });
    };

    CallGroup.prototype.loadReferences = function() {
      var self = this;
      return self.data.getCallGroupReferences().then(function(callreferences) {
        self.callreferences = callreferences;

        return RSVP.all(_.map(callreferences, function(callreference) {
          return callreference.getReference();
        })).then(function(references) {
          self.references = _.map(references, function(reference) {
            return self.callgraph.addReference(reference);
          });

          _.forEach(self.references, function(reference, index) {
            reference.addNode(self, self.callreferences[index]);
          });

          return self.references;
        });
      });
    };

    CallGroup.prototype.loadRecursiveReferences = function() {
      var self = this;
      return self.data.getRecursiveCallGroupReferences().then(function(callreferences) {
        self.callreferences = callreferences;

        return RSVP.all(_.map(callreferences, function(callreference) {
          return callreference.getReference();
        })).then(function(references) {
          self.references = _.map(references, function(reference) {
            return self.callgraph.addReference(reference);
          });

          _.forEach(self.references, function(reference, index) {
            reference.addNode(self, self.callreferences[index]);
          });

          return self.references;
        });
      });
    };

    CallGroup.prototype.toggleChildren = toggleFunction
      ('calls',
       CallGroup.prototype.loadChildren,
       CallGroup.prototype.unloadChildren);
    CallGroup.prototype.toggleReferences = toggleFunction
      ('references',
       CallGroup.prototype.loadReferences,
       CallGroup.prototype.unloadReferences);
    CallGroup.prototype.toggleRecursiveReferences = toggleFunction
    ('references',
      CallGroup.prototype.loadRecursiveReferences,
      Node.prototype.unloadReferences);
    CallGroup.prototype.toggleParent = toggleFunction
      ('parent',
       CallGroup.prototype.loadParent,
       Node.prototype.unloadParent);

    return function() {
      return new CallGraph();
    };
  }]);
