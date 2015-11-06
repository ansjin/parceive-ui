function removeFromArray(array, element) {
  var index = array.indexOf(element);

  if (index > -1) {
    array.splice(index, 1);
  }
}

angular.module('app')
  .service('CallGraphDataService',
  [function() {
    function CallGraph() {
      this.roots = [];
      this.references = [];

      this.addRoot = function(callgroup) {
        this.roots = new CallGroup(this, callgroup);
      };

      this.addReference = function(reference) {
        var existing = _.find(this.references, function(ref) {
          return reference === ref.reference;
        });

        if (existing) {
          return existing;
        } else {
          return new Reference(this, reference);
        }
      };

      this.getCallGroups = function() {
        var callgroups = [];

        function callCallGroupRecursive(callgroup) {
          callgroups.push(callgroup);

          _.forEach(callgroup.children, callCallGroupRecursive);
        }

        _.forEach(this.roots, callCallGroupRecursive);

        return callgroups;
      };

      this.getCalls = function() {
        var calls = [];

        function callCallGroupRecursive(callgroup) {
          _.forEach(callgroup.calls, function(call) {
            calls.push(call);
          });

          _.forEach(callgroup.children, callCallGroupRecursive);
        }

        _.forEach(this.roots, callCallGroupRecursive);

        return calls;
      };
    }

    function Call(callgraph, call, callgroup) {
      this.call = call;
      this.callgraph = callgraph;
      this.callgroup = callgroup;

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

        return self.call.getChildren().then(function(children) {
          return RSVP.all(_.map(children, function(child) {
            return child.getCallGroup();
          })).then(function(callgroups) {
            self.children = _.uniq(callgroups, false);

            return self.children;
          });
        });
      };

      this.unloadChildren = function() {
        _.forEach(this.chilren, function(child) {
          child.unloadCalls();
          child.unloadReferences();
          child.unloadChildren();
        });

        delete this.chilren;
      };

      this.unloadReferences = function() {
        _.forEach(this.callgroup.references, function(reference) {
          reference.unloadCall();
        });

        delete this.references;
      };

      this.unload = function() {
        this.unloadReferences();
        this.unloadChildren();
      };
    }

    function Reference(callgraph, ref) {
      this.ref = ref;
      this.callgraph = callgraph;

      this.calls = [];
      this.callgroups = [];

      callgraph.refences.push(this);

      this.checkUnload = function() {
        if (this.calls.length === 0 && this.callgroups.length) {
          this.unload();
        }
      };

      this.unloadCall = function(call) {
        removeFromArray(this.calls, call);
        this.checkUnload();
      };

      this.unloadCallGroup = function(callgroup) {
        removeFromArray(this.callgroups, callgroup);
        this.checkUnload();
      };

      this.unload = function() {
        removeFromArray(callgraph.references, this);
      };

      this.addCall = function(call) {
        this.calls.push(call);
      };

      this.addCallGroup = function(callgroup) {
        this.callgroups.push(callgroup);
      };
    }

    function CallGroup(callgraph, callgroup, parent) {
      this.callgroup = callgroup;
      this.callgraph = callgraph;
      this.parent = parent;

      this.loadChildren = function() {
        var self = this;
        return self.callgroup.getChildren().then(function(children) {
          self.children = _.map(children, function(child) {
            return new CallGroup(callgraph, child, self);
          });

          return self.children;
        });
      };

      this.loadParent = function() {
        var self = this;

        return self.callgroup.getParent().then(function(parent) {
          self.parent = new CallGroup(callgraph, parent);

          removeFromArray(self.callgraph.roots, self);
          self.callgraph.roots.push(self.parent);

          return self.parent;
        });
      };

      this.loadCalls = function() {
        var self = this;
        return self.callgroup.getCalls().then(function(calls) {
          self.calls = _.map(calls, function(call) {
            return new Call(callgraph, call, self);
          });

          return self.calls;
        });
      };

      this.loadReferences = function() {
        var self = this;
        var promise;
        if (_.isUndefined(self.chilren)) {
          promise = self.loadCalls();
        } else {
          promise = RSVP.resolve(self.calls);
        }

        return promise.then(function(calls) {
          return RSVP.all(_.map(calls, function(call) {
            return call.loadReferences();
          }));
        }).then(function(references) {
          self.references = _.flatten(references);

          _.forEach(self.references, function(reference) {
            reference.addCallGroup(self);
          });

          return self.references;
        });
      };

      this.unloadReferences = function() {
        var self = this;
        _.forEach(this.references, function(reference) {
          reference.unloadCallGroup(self);
        });

        _.forEach(this.calls, function(call) {
          call.unloadReferences();
        });
      };

      this.unloadCalls = function() {
        _.forEach(this.calls, function(call) {
          call.unload();
        });

        delete this.calls;
      };

      this.unloadChildren = function() {
        _.forEach(this.chilren, function(child) {
          child.unloadCalls();
          child.unloadReferences();
          child.unloadChildren();
        });

        delete this.chilren;
      };

      this.unloadParent = function() {
        parent.unloadParent();
        parent.unloadReferences();
        parent.unloadChildren();

        this.callgraph.roots.push(this);

        delete this.parent;
      };
    }

    return function() {
      return new CallGraph();
    };
  }]);
