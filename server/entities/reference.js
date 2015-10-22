var express = require('express');
var router = express.Router();

var util = require('./util');

var accesses = require('./access');

var mapping = {
  'Reference': 'id',
  'Size': 'size',
  'Type': 'type',
  'Name': 'name',
  'Allocator': 'allocator'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM Reference');
});

router.get('/many/:ids/accesses', function(req, res) {
  util.handleManyQuery(req.db, accesses.mapping, res, req.params.ids,
    'Access WHERE Reference');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Reference WHERE Reference');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM Reference WHERE Reference=?', req.params.id);
});

router.get('/:id/accesses', function(req, res) {
  util.handleRelationshipQuery(req.db, accesses.mapping, res,
    'SELECT * FROM Access WHERE Reference=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
