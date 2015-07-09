var express = require('express');
var router = express.Router();

var util = require('./util');

var instructions = require('./instruction');

var mapping = {
  'ID': 'id',
  'CALL_ID': 'call',
  'SEGMENT_NO': 'segmentNumber',
  'SEGMENT_TYPE': 'type',
  'LOOP_POINTER': 'loopPointer'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM SEGMENT_TABLE');
});

router.get('/many/:ids/instructions', function(req, res) {
  util.handleManyQuery(req.db, instructions.mapping, res, req.params.ids,
    'INSTRUCTION_TABLE WHERE SEGMENT_ID');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'SEGMENT_TABLE WHERE ID');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM SEGMENT_TABLE WHERE ID=?', req.params.id);
});

router.get('/:id/instructions', function(req, res) {
  util.handleRelationshipQuery(req.db, instructions.mapping, res,
    'SELECT * FROM INSTRUCTION_TABLE WHERE SEGMENT_ID=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
