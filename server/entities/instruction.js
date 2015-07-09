var express = require('express');
var router = express.Router();

var util = require('./util');

var accesses = require('./access');
var calls = require('./call');

var mapping = {
  'ID': 'id',
  'SEGMENT_ID': 'segment',
  'INSTRUCTION_TYPE': 'type',
  'LINE_NUMBER': 'lineNumber'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM INSTRUCTION_TABLE');
});

router.get('/many/:ids/accesses', function(req, res) {
  util.handleManyQuery(req.db, accesses.mapping, res, req.params.ids,
    'ACCESS_TABLE WHERE INSTRUCTION_ID');
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, calls.mapping, res, req.params.ids,
    'CALL_TABLE WHERE INSTRUCTION_ID');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'INSTRUCTION_TABLE WHERE ID');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM INSTRUCTION_TABLE WHERE ID=?', req.params.id);

});

router.get('/:id/accesses', function(req, res) {
  util.handleRelationshipQuery(req.db, accesses.mapping, res,
    'SELECT * FROM ACCESS_TABLE WHERE INSTRUCTION_ID=?', req.params.id);
});

router.get('/:id/calls', function(req, res) {
  util.handleRelationshipQuery(req.db, calls.mapping, res,
    'SELECT * FROM CALL_TABLE WHERE INSTRUCTION_ID=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
