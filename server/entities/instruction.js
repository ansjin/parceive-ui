var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Segment': 'segment',
  'Type': 'type',
  'Line': 'lineNumber'
};

module.exports = {
  router: router,
  mapping: mapping
};

var accesses = require('./access');
var calls = require('./call');
var instructiontaginstances = require('./instructiontaginstance');

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM Instruction');
});

router.get('/many/:ids/accesses', function(req, res) {
  util.handleManyQuery(req.db, accesses.mapping, res, req.params.ids,
    'Access WHERE Instruction');
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, calls.mapping, res, req.params.ids,
    'Call WHERE Instruction');
});

router.get('/many/:ids/instructiontaginstances', function(req, res) {
  util.handleManyQuery(req.db, instructiontaginstances.mapping, res,
    req.params.ids, 'InstructionTagIstance WHERE Instruction');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Instruction WHERE Id');
});
