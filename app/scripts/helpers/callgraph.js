function removeFromArray(array, element) {
  var index = array.indexOf(element);

  if (index > -1) {
    array.splice(index, 1);
  }
}

angular.module('app')
  .service('CallGraphDataService',
  ['LayoutCallGraphService', function(layout) {
    function CallGraph() {
      this.roots = [];
      this.references = [];

      this.conf = {
        sorting: 'Importance'
      };

      this.layout = function() {
        layout(this);
      };

      this.addCallRoot = function(callgroup) {
        this.roots.push(this.addCall(callgroup));
      };

      this.addCallGroupRoot = function(callgroup) {
        this.roots.push(this.addCallGroup(callgroup));
      };

      this.addCall = function(call, parent) {
        var existing = _.find(this.getCalls(), function(node) {
          return call === node.call;
        });

        if (existing) {
          return existing;
        } else {
          return new Call(this, call, parent);
        }
      };

      this.addCallGroup = function(callgroup, parent) {
        var existing = _.find(this.getCalls(), function(node) {
          return callgroup === node.callgroup;
        });

        if (existing) {
          return existing;
        } else {
          return new CallGroup(this, callgroup, parent);
        }
      };

      this.addReference = function(reference) {
        var existing = _.find(this.references, function(node) {
          return reference === node.reference;
        });

        if (existing) {
          return existing;
        } else {
          return new Reference(this, reference);
        }
      };

      this.getCalls = function() {
        var callgroups = [];

        function callCalls(callgroup) {
          callgroups.push(callgroup);

          _.forEach(callgroup.children, callCalls);
        }

        _.forEach(this.roots, callCalls);

        return callgroups;
      };

      this.getReferences = function() {
        return this.references;
      };

      this.getRoots = function() {
        return this.roots;
      };
    }

    function Call(callgraph, call, callgroup) {
      this.call = call;
      this.callgraph = callgraph;
      this.callgroup = callgroup;

      this.type = 'Call';

      this.getDuration = function() {
        return this.call.duration;
      };

      this.loadReferences = function() {
        var self = this;
        return self.call.getReferences().then(function(references) {
          self.references = _.map(references, function(reference) {
            return callgraph.addReference(reference);
          });

          _.forEach(self.references, function(reference) {
            reference.addCall(self);
          });

          return self.children;
        });
      };

      this.loadChildren = function() {
        var self = this;

        return self.call.getCallGroups().then(function(children) {
          self.children = _.map(children, function(child) {
            return self.callgraph.addCallGroup(child, self);
          });

          return self.children;
        });
      };

      this.loadParent = function() {
        var self = this;

        return self.call.getCaller().then(function(caller) {
          self.parent = self.callgraph.addCall(caller);

          removeFromArray(self.callgraph.roots, self);
          self.callgraph.roots.push(self.parent);

          return self.parent;
        });
      };

      this.unloadParent = function() {
        if (_.isUndefined(this.parent)) {
          return;
        }

        this.parent.unloadParent();
        this.parent.unloadAssociations();

        removeFromArray(this.callgraph.roots, this.parent);
        this.callgraph.roots.push(this);

        delete this.parent;
      };

      this.unloadChildren = function() {
        if (_.isUndefined(this.children)) {
          return;
        }

        _.forEach(this.chilren, function(child) {
          child.unloadChildren();
          child.unloadAssociations();
        });

        delete this.chilren;
      };

      this.unloadReferences = function() {
        if (_.isUndefined(this.references)) {
          return;
        }

        var self = this;
        _.forEach(self.references, function(reference) {
          reference.unloadCall(self);
        });

        delete self.references;
      };

      this.unloadAssociations = function() {
        this.unloadReferences();
      };

      this.unload = function() {
        this.unloadAssociations();
        this.unloadChildren();
        this.unloadParent();
      };
    }

    function Reference(callgraph, ref) {
      this.ref = ref;
      this.callgraph = callgraph;

      this.type = 'Reference';

      this.calls = [];

      callgraph.references.push(this);

      this.checkUnload = function() {
        if (this.calls.length === 0 && this.callgroups.length) {
          this.unload();
        }
      };

      this.unloadCall = function(call) {
        removeFromArray(this.calls, call);
        this.checkUnload();
      };

      this.unload = function() {
        var self = this;

        _.forEach(self.calls, function(call) {
          removeFromArray(call.references, self);
        });

        removeFromArray(callgraph.references, self);
      };

      this.addCall = function(call) {
        this.calls.push(call);
      };
    }

    function CallGroup(callgraph, callgroup, parent) {
      this.callgroup = callgroup;
      this.callgraph = callgraph;
      this.parent = parent;

      this.type = 'CallGroup';

      this.getDuration = function() {
        return this.callgroup.duration;
      };

      this.loadChildren = function() {
        var self = this;

        return self.call.getCallGroups().then(function(children) {
          self.children = _.map(children, function(child) {
            return self.callgraph.addCallGroup(child, self);
          });

          return self.children;
        });
      };

      this.loadParent = function() {
        var self = this;

        return self.call.getCaller().then(function(caller) {
          self.parent = self.callgraph.addCall(caller);

          removeFromArray(self.callgraph.roots, self);
          self.callgraph.roots.push(self.parent);

          return self.parent;
        });
      };

      this.unloadParent = function() {
        if (_.isUndefined(this.parent)) {
          return;
        }

        this.parent.unloadParent();
        this.parent.unloadAssociations();

        removeFromArray(this.callgraph.roots, this.parent);
        this.callgraph.roots.push(this);

        delete this.parent;
      };

      this.unloadChildren = function() {
        if (_.isUndefined(this.children)) {
          return;
        }

        _.forEach(this.chilren, function(child) {
          child.unloadChildren();
          child.unloadAssociations();
        });

        delete this.chilren;
      };

      this.unloadReferences = function() {
        if (_.isUndefined(this.references)) {
          return;
        }

        var self = this;
        _.forEach(self.references, function(reference) {
          reference.unloadCall(self);
        });

        delete self.references;
      };

      this.unloadAssociations = function() {
        this.unloadReferences();
      };

      this.unload = function() {
        this.unloadAssociations();
        this.unloadChildren();
        this.unloadParent();
      };

      this.loadCall = function() {
        var self = this;

        return self.callgroup.getCalls().then(function(calls) {
          self.unloadAssociations();

          if (self.parent) {
            removeFromArray(self.parent.children, self);

            _.forEach(calls, function(call) {
              self.parent.children.push(
                self.callgraph.addCall(call, self.parent));
            });
          } else {
            removeFromArray(self.callgraph.roots, self);

            _.forEach(calls, function(call) {
              self.callgraph.roots.push(
                self.callgraph.addCall(call));
            });
          }
        });
      };
    }

    return function() {
      return new CallGraph();
    };
  }]);
