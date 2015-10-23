describe('Databases', function() {
  it('contain euinit.db', function() {
    return loader.getRuns().should.eventually.contain('eunit');
  });
});

describe('eunit.db', function() {
  before(function() {
    loader.setRun('eunit');
  });

  it('should contain 4 calls', function() {
    return loader.getCalls().should.eventually.have.length(4);
  });

  it('should contain 6 references', function() {
    return loader.getReferences().should.eventually.have.length(6);
  });

  it('should have a call group', function() {
    return loader.getCall('0_2').then(function(call) {
      return call.getCallGroup();
    }).should.eventually.have.property('id', 1);
  });
});
