describe('Callgraph', function() {
  var CallGraphDataService = $injector.get('CallGraphDataService');

  function validateGraph(callgraph) {
    callgraph.roots.should.be.an('array');

    _.forEach(callgraph.getRoots(), function(root) {
      root.should.not.have.property('parent');
    });

    var nodes = callgraph.getNodes();
    var references = callgraph.getReferences();

    _.forEach(nodes, function(node) {
      node.type.should.match(/^(Call)|(CallGroup)$/);

      _.forEach(node.calls, function(child) {
        child.parent.should.equal(node);
      });

      _.forEach(node.references, function(reference) {
        references.should.contain(reference);
      });
    });

    _.forEach(references, function(reference) {
      reference.nodes.should.be.a('array');
      reference.nodes.should.have.length.above(0);

      _.forEach(reference.nodes, function(call) {
        nodes.should.contain(call);
      });
    });

    callgraph.layout();
  }

  before(function() {
    loader.setRun('cppunit_6');
  });

  describe('cppunit_6', function() {
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

        validateGraph(callgraph);
      });
    });

    it('should expand children', function() {
      var callgraph = CallGraphDataService();
      return addMainRoot(callgraph).then(function() {
        return callgraph.getRoots()[0].loadChildren();
      }).then(function() {
        callgraph.getRoots()[0].calls.should.have.length(2);

        validateGraph(callgraph);
      });
    });

    it('should expand references', function() {
      var callgraph = CallGraphDataService();
      return addMainRoot(callgraph).then(function() {
        return callgraph.getRoots()[0].loadReferences();
      }).then(function() {
        callgraph.getRoots()[0].references.should.have.length(4);

        _.forEach(callgraph.getReferences(), function(reference) {
          reference.nodes.should.contain(callgraph.getRoots()[0]);
        });

        validateGraph(callgraph);
      });
    });
  });
});
