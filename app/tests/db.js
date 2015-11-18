describe('Databases', function() {
  it('contain all databases', function() {
    return loader.getRuns().then(function(runs) {
      var i;
      for (i = 1; i <= 7; i++) {
        runs.should.contain('cppunit_' + i);
      }
    });
  });
});

function checkFunctionCallOnce(name) {
  it('should call ' + name + ' once', function() {
    return loader.getFunctionBySignature(name).then(function(fct) {
      return fct.getCalls().should.eventually.have.length(1);
    });
  });
}

function genericDBTests() {
  checkFunctionCallOnce('main');

  it('must have valid calls', function() {
    return loader.getCalls().then(function(calls) {
      return RSVP.all(_.map(calls, function(call) {
        call.end.should.be.above(call.start);
        return RSVP.hash({
          segments: call.getSegments().should.eventually.have.length.above(0)
        });
      }));
    });
  });

  it('must have valid segments', function() {
    return loader.getSegments().then(function(segments) {
      return RSVP.all(_.map(segments, function(segment) {
        segment.type.should.be.above(-1);
        segment.type.should.be.below(2);

        var loopcheck;
        if(segment.type === 1) {
          loopcheck = segment.getLoop().should.eventually.resolve;
        } else {
          loopcheck = RSVP.resolve();
        }

        return RSVP.hash({
          loop: loopcheck
        });
      }));
    });
  });

  it('must have valid instructions', function() {
    return loader.getInstruction().then(function(instructions) {
      return RSVP.all(_.map(instructions, function(instruction) {
        instruction.type.should.be.above(-1);
        instruction.type.should.be.below(3);

        var typecheck;
        switch (instruction.type) {
          case 0: //Access
          case 1: //Call
          case 2: //Allocation
        }
      }));
    });
  });
}

describe('Unit Test Databases', function() {
  describe('cppunit_1', function() {
    before(function() {
      loader.setRun('cppunit_1');
    });

    genericDBTests();

    checkFunctionCallOnce('foo');
    checkFunctionCallOnce('bar');
  });
});

describe('Unit Test Databases', function() {
  describe('cppunit_2', function() {
    before(function() {
      loader.setRun('cppunit_2');
    });

    genericDBTests();
  });
});

describe('Unit Test Databases', function() {
  describe('cppunit_3', function() {
    before(function() {
      loader.setRun('cppunit_3');
    });

    genericDBTests();
  });
});

describe('Unit Test Databases', function() {
  describe('cppunit_4', function() {
    before(function() {
      loader.setRun('cppunit_4');
    });

    genericDBTests();
  });
});

describe('Unit Test Databases', function() {
  describe('cppunit_5', function() {
    before(function() {
      loader.setRun('cppunit_5');
    });

    genericDBTests();
  });
});

describe('Unit Test Databases', function() {
  describe('cppunit_6', function() {
    before(function() {
      loader.setRun('cppunit_6');
    });

    genericDBTests();
  });
});

describe('Unit Test Databases', function() {
  describe('cppunit_7', function() {
    before(function() {
      loader.setRun('cppunit_7');
    });

    genericDBTests();
  });
});
