var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Call': 'call',
  'Type': 'type',
  'LoopIteration': 'loop'
};

module.exports = {
  router: router,
  mapping: mapping
};

var instructions = require('./instruction');

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM Segment');
});

router.get('/many/:ids/instructions', function(req, res) {
  util.handleManyQuery(req.db, instructions.mapping, res, req.params.ids,
    'Instruction WHERE Segment');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Segment WHERE Id');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM Segment WHERE ID=?', req.params.id);
});

router.get('/:id/instructions', function(req, res) {
  util.handleRelationshipQuery(req.db, instructions.mapping, res,
    'SELECT * FROM Instruction WHERE Segment=?', req.params.id);
});
