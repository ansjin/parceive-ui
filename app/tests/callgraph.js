describe('Callgraph', function() {
  var CallGraphDataService = $injector.get('CallGraphDataService');
  var LayoutCallGraphService = $injector.get('LayoutCallGraphService');

  before(function() {
    loader.setRun('mongoose');
  });

  describe('Loading', function() {
    it('should initialize', function() {
      CallGraphDataService();
    });

    function addMainRoot(callgraph) {
      return loader.getFunctionBySignature('main').then(function(fct) {
        return fct.getCalls();
      }).then(function(calls) {
        return calls[0];
      }).then(function(call) {
        return callgraph.addCallRoot(call);
      });
    }

    it('should add root', function() {
      var callgraph = CallGraphDataService();
      return addMainRoot(callgraph).then(function() {
        callgraph.getRoots().should.have.length(1);

        LayoutCallGraphService(callgraph);
      });
    });

    it('should expand children', function() {
      var callgraph = CallGraphDataService();
      return addMainRoot(callgraph).then(function() {
        return callgraph.getRoots()[0].loadChildren();
      }).then(function() {
        callgraph.getRoots()[0].children.should.have.length(6);

        LayoutCallGraphService(callgraph);
      });
    });

    it('should expand references', function() {
      var callgraph = CallGraphDataService();
      return addMainRoot(callgraph).then(function() {
        return callgraph.getRoots()[0].loadReferences();
      }).then(function() {
        callgraph.getRoots()[0].references.should.have.length(6);

        _.forEach(callgraph.getReferences(), function(reference) {
          reference.calls.should.contain(callgraph.getRoots()[0]);
        });

        LayoutCallGraphService(callgraph);
      });
    });
  });

  describe('Layout', function() {
    it('should work on empty callgraph', function() {
      var callgraph = CallGraphDataService();
      LayoutCallGraphService(callgraph);
      callgraph.should.be.ok;
    });
  });
});
