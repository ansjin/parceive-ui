describe('Databases', function() {
  it('contains all databases', function() {
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

function checkFunctionCaledBy(name, by) {
  it(by + ' should call ' + name, function() {
    return loader.getFunctionBySignature(name).then(function(fct) {
      return fct.getCalls();
    }).then(function(calls) {
      calls.should.have.length(1);
      return RSVP.hash({
        caller: calls[0].getCaller(),
        callgroup: calls[0].getCallGroup()
      });
    }).then(function(call) {
      return RSVP.hash({
        callgroup: call.callgroup,
        fct: call.caller.getFunction(),
        callgroupParent: call.callgroup.getParent()
      });
    }).then(function(result) {
      result.fct.signature.should.be.equal(by);
      return result.callgroupParent.getCallGroups().then(function(callgroups) {
        callgroups.should.contain(result.callgroup);
      });
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
        if (segment.type === 1) {
          loopcheck = segment.getLoopIteration().should.eventually.resolve;
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
    return loader.getInstructions().then(function(instructions) {
      return RSVP.all(_.map(instructions, function(instruction) {
        //instruction.type.should.be.above(-1);
        //instruction.type.should.be.below(3);

        var typecheck;
        switch (instruction.type) {
          case 0: //Access
          case 1: //Call
          case 2: //Allocation
            typecheck = RSVP.resolve();
        }

        return RSVP.hash({
          rtpecheck: typecheck
        });
      }));
    });
  });
}

describe('Unit Test Databases', function() {
  this.timeout(5000);

  describe('cppunit_1', function() {
    before(function() {
      loader.setRun('cppunit_1');
    });

    genericDBTests();

    checkFunctionCaledBy('foo', 'main');
    checkFunctionCaledBy('bar', 'main');
  });

  describe('cppunit_2', function() {
    before(function() {
      loader.setRun('cppunit_2');
    });

    genericDBTests();
  });

  describe('cppunit_3', function() {
    before(function() {
      loader.setRun('cppunit_3');
    });

    genericDBTests();
  });

  describe('cppunit_4', function() {
    before(function() {
      loader.setRun('cppunit_4');
    });

    genericDBTests();
  });

  describe('cppunit_5', function() {
    before(function() {
      loader.setRun('cppunit_5');
    });

    it('must have 6 levels of calls', function() {
      return loader.getFunctionBySignature('main').then(function(fct) {
        return fct.getCalls();
      }).then(function(calls) {
        return calls[0];
      }).then(function(call) {
        return call.getRecursiveCalls();
      }).then(function(calls) {
        assert(_.some(calls, function(call) {
          return call.depth === 6;
        }), 'result does not contain call of level 6');

        assert(_.all(calls, function(call) {
          return call.depth <= 6;
        }), 'result contains a call of level greater than 6');

        assert(_.all(calls, function(call) {
          return _.isObject(call.call);
        }), 'call is not an object');
      });
    });

    it('must have 6 levels of callgroups', function() {
      return loader.getFunctionBySignature('main').then(function(fct) {
        return fct.getCalls();
      }).then(function(calls) {
        return calls[0];
      }).then(function(call) {
        return call.getCallGroup();
      }).then(function(callgroup) {
        return callgroup.getRecursiveCallGroups();
      }).then(function(calls) {
        assert(_.some(calls, function(call) {
          return call.depth === 6;
        }), 'result does not contain call of level 6');

        assert(_.all(calls, function(call) {
          return call.depth <= 6;
        }), 'result contains a call of level greater than 6');

        assert(_.all(calls, function(call) {
          return _.isObject(call.callgroup);
        }), 'callgroup is not an object');
      });
    });

    it('must filter correctly', function() {
      return loader.getFunctionBySignature('main').then(function(fct) {
        return fct.getCalls();
      }).then(function(calls) {
        return calls[0];
      }).then(function(call) {
        return call.getCallGroup();
      }).then(function(callgroup) {
        return RSVP.hash({
          calls: callgroup.getRecursiveCallGroups(),
          callgroup: callgroup
        });
      }).then(function(data) {
        var minDuration = _.min(data.calls, function(call) {
          return call.callgroup.duration;
        }).callgroup.duration;

        return RSVP.hash({
          same: data.callgroup.getRecursiveCallGroups(minDuration - 1),
          less: data.callgroup.getRecursiveCallGroups(minDuration)
        }).then(function(queries) {
          queries.same.should.deep.equal(data.calls);
          queries.less.length.should.equal(queries.same.length - 1);
        });
      });
    });

    genericDBTests();
  });

  describe('cppunit_6', function() {
    before(function() {
      loader.setRun('cppunit_6');
    });

    genericDBTests();

    checkFunctionCaledBy('foo', 'main');
    checkFunctionCaledBy('bar', 'main');
  });

  describe('cppunit_7', function() {
    before(function() {
      loader.setRun('cppunit_7');
    });

    genericDBTests();
  });
});
