describe('Databases', function() {
  it('contain euinit.db', function() {
    return loader.getRuns().should.eventually.contain('eunit');
  });
<<<<<<< HEAD
=======
  it('contain cppcheck.db', function() {
    return loader.getRuns().should.eventually.contain('cppcheck');
  });
>>>>>>> 5463131b75fb187cc8f53dadc111056fa5860236
});

describe('eunit.db', function() {
  before(function() {
    loader.setRun('eunit');
  });

<<<<<<< HEAD
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
=======
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
>>>>>>> 5463131b75fb187cc8f53dadc111056fa5860236
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
