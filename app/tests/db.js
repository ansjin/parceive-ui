describe('Databases', function() {
  it('contain euinit.db', function() {
    return loader.getRuns().should.eventually.contain('eunit');
  });
  it('contain cppcheck.db', function() {
    return loader.getRuns().should.eventually.contain('cppcheck');
  });
});

describe('eunit.db', function() {
  before(function() {
    loader.setRun('eunit');
  });

  it('should contain 35 calls', function() {
    return loader.getCalls().should.eventually.have.length(35);
  });

  it('should contain 8 references', function() {
    return loader.getReferences().should.eventually.have.length(8);
  });

  it('should have a simple call group', function() {
    return loader.getCall('0_2').then(function(call) {
      return call.getCallGroup();
    }).should.eventually.have.property('count', 1);
  });

  it('CallGroup should have children', function() {
    return loader.getCall('0_2').then(function(call) {
      return call.getCallGroup();
    }).then(function(callgroup) {
      return callgroup.getCallGroups();
    })
    .should.eventually.have.length(1);
  });
});
