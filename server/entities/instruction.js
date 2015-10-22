var express = require('express');
var router = express.Router();

var util = require('./util');

var accesses = require('./access');
var calls = require('./call');

var mapping = {
  'Id': 'id',
  'Segment': 'segment',
  'Type': 'type',
  'Line': 'lineNumber'
};

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

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Instruction WHERE Id');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM Instruction WHERE ID=?', req.params.id);

});

router.get('/:id/accesses', function(req, res) {
  util.handleRelationshipQuery(req.db, accesses.mapping, res,
    'SELECT * FROM Access WHERE Instruction=?', req.params.id);
});

router.get('/:id/calls', function(req, res) {
  util.handleRelationshipQuery(req.db, calls.mapping, res,
    'SELECT * FROM Call WHERE Instruction=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
