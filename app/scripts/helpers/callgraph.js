angular.module('app')
  .service('CallGraphDataService',
  ['LayoutCallGraphService', 'SizeService', function(layout, SizeService) {
    function CallGraph() {
      this.roots = [];
      this.references = [];

      this.conf = {
        sorting: 'Importance',
        textSize: 10
      };
    }

    CallGraph.prototype.layout = function() {
      layout(this);
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
        return call === node.call;
      });

      if (existing) {
        return existing;
      } else {
        return new Call(this, call, parent);
      }
    };

    CallGraph.prototype.addCallGroup = function(callgroup, parent) {
      var existing = _.find(this.getNodes(), function(node) {
        return callgroup === node.callgroup;
      });

      if (existing) {
        return existing;
      } else {
        return new CallGroup(this, callgroup, parent);
      }
    };

    CallGraph.prototype.addReference = function(reference) {
      var existing = _.find(this.references, function(node) {
        return reference === node.reference;
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

        _.forEach(node.children, processNode);
        _.forEach(node.loopExecutions, processNode);
        _.forEach(node.loopIterations, processNode);
      }

      _.forEach(this.roots, processNode);

      return nodes;
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

    /******************************************************************* Call */

    function Call(callgraph, call, callgroup) {
      this.call = call;
      this.callgraph = callgraph;
      this.callgroup = callgroup;

      this.type = 'Call';
    }

    Call.prototype.load = function() {
      var self = this;
      return self.call.getFunction().then(function(fct) {
        self.function = fct;
      });
    };

    Call.prototype.getDuration = function() {
      return this.call.duration;
    };

    Call.prototype.getStart = function() {
      return this.call.start;
    };

    Call.prototype.getLabel = function() {
      return this.function.signature;
    };

    Call.prototype.loadReferences = function() {
      var self = this;
      return self.call.getReferences().then(function(references) {
        self.references = _.map(references, function(reference) {
          return self.callgraph.addReference(reference);
        });

        _.forEach(self.references, function(reference) {
          reference.addCall(self);
        });

        return self.children;
      });
    };

    Call.prototype.loadChildren = function() {
      var self = this;

      self.unloadLoopExecutions();

      return self.call.getCallGroups().then(function(children) {
        self.children = _.map(children, function(child) {
          return self.callgraph.addCallGroup(child, self);
        });

        return RSVP.all(_.map(self.children, function(child) {
          return child.load();
        })).then(function() {
          return self.children;
        });
      });
    };

    Call.prototype.loadParent = function() {
      var self = this;

      return self.call.getCaller().then(function(caller) {
        self.parent = self.callgraph.addCall(caller);

        self.callgraph.roots.remove(self);
        self.callgraph.roots.push(self.parent);

        return self.parent;
      });
    };

    Call.prototype.unloadParent = function() {
      if (_.isUndefined(this.parent)) {
        return;
      }

      this.parent.unloadParent();
      this.parent.unloadAssociations();

      this.callgraph.roots.remove(this.parent);
      this.callgraph.roots.push(this);

      delete this.parent;
    };

    Call.prototype.unloadChildren = function() {
      if (_.isUndefined(this.children)) {
        return;
      }

      _.forEach(this.chilren, function(child) {
        child.unloadChildren();
        child.unloadAssociations();
      });

      delete this.children;
    };

    Call.prototype.unloadReferences = function() {
      if (_.isUndefined(this.references)) {
        return;
      }

      var self = this;
      _.forEach(self.references, function(reference) {
        reference.unloadCall(self);
      });

      delete self.references;
    };

    Call.prototype.unloadAssociations = function() {
      this.unloadReferences();
      this.unloadLoopExecutions();
    };

    Call.prototype.loadLoopExecutions = function() {
      var self = this;

      self.unloadChildren();

      return self.call.getLoopExecutions().then(function(loopExecutions) {
        self.loopExecutions = _.map(loopExecutions, function(loopExecution) {
          return new LoopExecution(self.callgraph, loopExecution, self);
        });

        return self.loopExecutions;
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
      ('children',
       Call.prototype.loadChildren,
       Call.prototype.unloadChildren);
    Call.prototype.toggleReferences = toggleFunction
      ('references',
       Call.prototype.loadReferences,
       Call.prototype.unloadReferences);
    Call.prototype.toggleLoopExecutions = toggleFunction
     ('loopExecutions',
      Call.prototype.loadLoopExecutions,
      Call.prototype.unloadLoopExecutions);

    /********************************************************** LoopExecution */

    function LoopExecution(callgraph, loopExecution, parent) {
      this.callgraph = callgraph;
      this.loopExecution = loopExecution;
      this.parent = parent;

      this.type = 'LoopExecution';
    }

    LoopExecution.prototype.getLabel = function() {
      return this.loopExecution.id;
    };

    LoopExecution.prototype.getStart = function() {
      return this.loopExecution.id;
    };

    LoopExecution.prototype.getDuration = function() {
      return 0;
    };

    LoopExecution.prototype.loadChildren = function() {
      var self = this;

      self.unloadLoopIterations();

      return self.loopExecution.getCallGroups().then(function(children) {
        self.children = _.map(children, function(child) {
          return self.callgraph.addCallGroup(child, self);
        });

        return RSVP.all(_.map(self.children, function(child) {
          return child.load();
        })).then(function() {
          return self.children;
        });
      });
    };

    LoopExecution.prototype.unloadChildren = function() {
      if (_.isUndefined(this.children)) {
        return;
      }

      _.forEach(this.chilren, function(child) {
        child.unloadChildren();
        child.unloadAssociations();
      });

      delete this.children;
    };

    LoopExecution.prototype.loadLoopIterations = function() {
      var self = this;

      self.unloadChildren();

      return self.loopExecution.getLoopIterations().then(
        function(loopIterations) {
        self.loopIterations = _.map(loopIterations, function(loopIteration) {
          return new LoopIteration(self.callgraph, loopIteration, self);
        });

        return self.loopIterations;
      });
    };

    LoopExecution.prototype.loadReferences = function() {
      var self = this;
      return self.loopExecution.getReferences().then(function(references) {
        self.references = _.map(references, function(reference) {
          return self.callgraph.addReference(reference);
        });

        _.forEach(self.references, function(reference) {
          reference.addCall(self);
        });

        return self.children;
      });
    };

    LoopExecution.prototype.unloadReferences = function() {
      if (_.isUndefined(this.references)) {
        return;
      }

      var self = this;
      _.forEach(self.references, function(reference) {
        reference.unloadCall(self);
      });

      delete self.references;
    };

    LoopExecution.prototype.unloadLoopIterations = function() {
      _.forEach(this.loopIterations, function(loopiteration) {
        loopiteration.unloadChildren();
        loopiteration.unloadAssociations();
      });

      delete this.loopIterations;
    };

    LoopExecution.prototype.unloadParent = function() {
      this.parent.unloadParent();
      this.parent.unloadAssociations();

      delete this.parent;
    };

    LoopExecution.prototype.unloadAssociations = function() {
      this.unloadReferences();
      this.unloadLoopIterations();
    };

    LoopExecution.prototype.toggleChildren = toggleFunction
      ('children',
       LoopExecution.prototype.loadChildren,
       LoopExecution.prototype.unloadChildren);
    LoopExecution.prototype.toggleReferences = toggleFunction
      ('references',
       LoopExecution.prototype.loadReferences,
       LoopExecution.prototype.unloadReferences);
    LoopExecution.prototype.toggleLoopIterations = toggleFunction
     ('loopExecutions',
      LoopExecution.prototype.loadLoopIterations,
      LoopExecution.prototype.unloadLoopIterations);

    /********************************************************** LoopIteration */

    function LoopIteration(callgraph, loopIteration, parent) {
      this.callgraph = callgraph;
      this.loopIteration = loopIteration;
      this.parent = parent;

      this.type = 'LoopIteration';
    }

    LoopIteration.prototype.getLabel = function() {
      return this.loopIteration.id;
    };

    LoopIteration.prototype.getStart = function() {
      return this.loopIteration.id;
    };

    LoopIteration.prototype.getDuration = function() {
      return 0;
    };

    LoopIteration.prototype.loadReferences = function() {
      var self = this;
      return self.loopIteration.getReferences().then(function(references) {
        self.references = _.map(references, function(reference) {
          return self.callgraph.addReference(reference);
        });

        _.forEach(self.references, function(reference) {
          reference.addCall(self);
        });

        return self.children;
      });
    };

    LoopIteration.prototype.unloadReferences = function() {
      var self = this;
      _.forEach(self.references, function(reference) {
        reference.unloadCall(self);
      });

      delete self.references;
    };

    LoopIteration.prototype.loadChildren = function() {
      var self = this;

      return self.loopIteration.getCallGroups().then(function(children) {
        self.children = _.map(children, function(child) {
          return self.callgraph.addCallGroup(child, self);
        });

        return RSVP.all(_.map(self.children, function(child) {
          return child.load();
        })).then(function() {
          return self.children;
        });
      });
    };

    LoopIteration.prototype.unloadChildren = function() {
      _.forEach(this.chilren, function(child) {
        child.unloadChildren();
        child.unloadAssociations();
      });

      delete this.children;
    };

    LoopIteration.prototype.unloadParent = function() {
      this.parent.unloadParent();
      this.parent.unloadAssociations();

      delete this.parent;
    };

    LoopIteration.prototype.unloadAssociations = function() {
      this.unloadReferences();
    };

    LoopIteration.prototype.toggleChildren = toggleFunction
      ('children',
       LoopIteration.prototype.loadChildren,
       LoopIteration.prototype.unloadChildren);
    LoopIteration.prototype.toggleReferences = toggleFunction
      ('references',
       LoopIteration.prototype.loadReferences,
       LoopIteration.prototype.unloadReferences);

    /************************************************************** Reference */

    function Reference(callgraph, reference) {
      this.reference = reference;
      this.callgraph = callgraph;

      this.type = 'Reference';

      this.calls = [];

      callgraph.references.push(this);
    }

    Reference.prototype.getLabel = function() {
      return this.reference.signature;
    };

    Reference.prototype.checkUnload = function() {
      if (this.calls.length === 0 && this.callgroups.length) {
        this.unload();
      }
    };

    Reference.prototype.unloadCall = function(call) {
      this.calls.remove(call);
      this.checkUnload();
    };

    Reference.prototype.unload = function() {
      var self = this;

      _.forEach(self.calls, function(call) {
        call.references.remove(self);
      });

      self.callgraph.references.remove(self);
    };

    Reference.prototype.addCall = function(call) {
      this.calls.push(call);
    };

    /************************************************************** CallGroup */

    function CallGroup(callgraph, callgroup, parent) {
      this.callgroup = callgroup;
      this.callgraph = callgraph;
      this.parent = parent;

      this.type = 'CallGroup';
    }

    CallGroup.prototype.load = function() {
      var self = this;
      return self.callgroup.getFunction().then(function(fct) {
        self.function = fct;
      });
    };

    CallGroup.prototype.getLabel = function() {
      return this.function.signature;
    };

    CallGroup.prototype.getDuration = function() {
      return this.callgroup.duration;
    };

    LoopIteration.prototype.getStart = function() {
      return this.callgroup.start;
    };

    CallGroup.prototype.loadChildren = function() {
      var self = this;

      return self.callgroup.getCallGroups().then(function(children) {
        self.children = _.map(children, function(child) {
          return self.callgraph.addCallGroup(child, self);
        });

        return RSVP.all(_.map(self.children, function(child) {
          return child.load();
        })).then(function() {
          return self.children;
        });
      });
    };

    CallGroup.prototype.loadParent = function() {
      var self = this;

      return self.call.getCaller().then(function(caller) {
        self.parent = self.callgraph.addCall(caller);

        self.callgraph.roots.remove(self);
        self.callgraph.roots.push(self.parent);

        return self.parent;
      });
    };

    CallGroup.prototype.unloadParent = function() {
      if (_.isUndefined(this.parent)) {
        return;
      }

      this.parent.unloadParent();
      this.parent.unloadAssociations();

      this.callgraph.roots.remove(this.parent);
      this.callgraph.roots.push(this);

      delete this.parent;
    };

    CallGroup.prototype.unloadChildren = function() {
      if (_.isUndefined(this.children)) {
        return;
      }

      _.forEach(this.chilren, function(child) {
        child.unloadChildren();
        child.unloadAssociations();
      });

      delete this.chilren;
    };

    CallGroup.prototype.unloadReferences = function() {
      if (_.isUndefined(this.references)) {
        return;
      }

      var self = this;
      _.forEach(self.references, function(reference) {
        reference.unloadCall(self);
      });

      delete self.references;
    };

    CallGroup.prototype.unloadAssociations = function() {
      this.unloadReferences();
    };

    CallGroup.prototype.loadCalls = function() {
      var self = this;

      return self.callgroup.getCalls().then(function(calls) {
        self.unloadAssociations();

        if (self.parent) {
          self.parent.children.remove(self);

          var added = _.map(calls, function(call) {
            var node = self.callgraph.addCall(call, self.parent);
            self.parent.children.push(node);
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
      ('children',
       CallGroup.prototype.loadChildren,
       CallGroup.prototype.unloadChildren);
    CallGroup.prototype.toggleReferences = toggleFunction
      ('references',
       CallGroup.prototype.loadReferences,
       CallGroup.prototype.unloadReferences);

    return function() {
      return new CallGraph();
    };
  }]);
