var express = require('express');
var router = express.Router();

var util = require('./util');

var accesses = require('./access');

var mapping = {
  'REFERENCE_ID': 'id',
  'SIZE': 'size',
  'MEMORY_TYPE': 'type',
  'NAME': 'name',
  'ALLOCATOR': 'allocator'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM REFERENCE_TABLE');
});

router.get('/many/:ids/accesses', function(req, res) {
  util.handleManyQuery(req.db, accesses.mapping, res, req.params.ids,
    'ACCESS_TABLE WHERE REFERENCE_ID');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'REFERENCE_TABLE WHERE REFERENCE_ID');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM REFERENCE_TABLE WHERE REFERENCE_ID=?', req.params.id);
});

router.get('/:id/accesses', function(req, res) {
  util.handleRelationshipQuery(req.db, accesses.mapping, res,
    'SELECT * FROM ACCESS_TABLE WHERE REFERENCE_ID=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
