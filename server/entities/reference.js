var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Size': 'size',
  'Type': 'type',
  'Name': 'name',
  'Allocator': 'allocator'
};

module.exports = {
  router: router,
  mapping: mapping
};

var accesses = require('./access');

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM Reference');
});

router.get('/many/:ids/accesses', function(req, res) {
  util.handleManyQuery(req.db, accesses.mapping, res, req.params.ids,
    'Access WHERE Id');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Reference WHERE Id');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM Reference WHERE Id=?', req.params.id);
});

router.get('/:id/accesses', function(req, res) {
  util.handleRelationshipQuery(req.db, accesses.mapping, res,
    'SELECT * FROM Access WHERE Id=?', req.params.id);
});
