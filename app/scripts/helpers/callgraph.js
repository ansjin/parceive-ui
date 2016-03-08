angular.module('app')
  .service('CallGraphDataService',
  ['d3', 'SizeService', function(d3, SizeService) {
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
            return b.data.id - a.data.id;
          default:
            return b.data.duration - a.data.duration;
        }
      });
    }

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
      this.roots.push(node);
      return node.load();
    };

    CallGraph.prototype.addCallGroupRoot = function(callgroup) {
      var node = this.addCallGroup(callgroup);
      this.roots.push(node);
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
          edges.push([reference.nodes[i], reference]);
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
    }

    Node.prototype.getDuration = function() {
      return this.data.duration;
    };

    Node.prototype.getStart = function() {
      return this.data.start;
    };

    Node.prototype.loadReferences = function() {
      var self = this;
      return self.data.getReferences().then(function(references) {
        self.references = _.map(references, function(reference) {
          return self.callgraph.addReference(reference);
        });

        _.forEach(self.references, function(reference) {
          reference.addNode(self);
        });

        return self.calls;
      });
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
      _.forEach(this.children, function(child) {
        child.unloadChildren();
        child.unloadAssociations();
      });

      delete this.calls;
    };

    Node.prototype.unloadParent = function(keepReferences) {
      if (_.isUndefined(this.parent)) {
        return;
      }

      var oldNodes;

      if (_.isUndefined(keepReferences)) {
        oldNodes = this.callgraph.getNodes();
      }

      this.parent.unloadParent(true);
      this.parent.unloadAssociations();

      this.callgraph.roots.remove(this.parent);
      this.callgraph.roots.push(this);

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
      return this.function.signature;
    };

    Call.prototype.loadChildren = function() {
      this.unloadLoopExecutions();
      this.unloadChildren();

      return this.loadCallGroupChildren();
    };

    Call.prototype.loadParent = function() {
      var self = this;

      if (self.parent) {
        return RSVP.resolve();
      }

      return self.data.getCaller().then(function(caller) {
        self.parent = self.callgraph.addCall(caller);

        if (_.isUndefined(self.parent)) {
          return RSVP.resolve();
        }

        self.callgraph.roots.remove(self);
        self.callgraph.roots.push(self.parent);

        self.parent.calls = [self];

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
      Node.prototype.loadRecursiveReferences,
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

      this.nodes = [];

      callgraph.references.push(this);
    }

    Reference.prototype.getLabel = function() {
      return this.data.signature;
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

    Reference.prototype.addNode = function(call) {
      this.nodes.push(call);
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
      return this.function.signature;
    };

    CallGroup.prototype.getCount = function() {
      return this.data.count;
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
        self.parent = self.callgraph.addCall(caller);

        if (_.isUndefined(self.parent)) {
          return RSVP.resolve();
        }

        self.callgraph.roots.remove(self);
        self.callgraph.roots.push(self.parent);

        self.parent.calls = [self];

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
            self.callgraph.roots.push(node);
            return node;
          });

          return RSVP.all(_.map(addedRoots, function(node) {
            return node.load();
          }));
        }
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
      Node.prototype.loadRecursiveReferences,
      Node.prototype.unloadReferences);
    CallGroup.prototype.toggleParent = toggleFunction
      ('parent',
       CallGroup.prototype.loadParent,
       Node.prototype.unloadParent);

    return function() {
      return new CallGraph();
    };
  }]);
