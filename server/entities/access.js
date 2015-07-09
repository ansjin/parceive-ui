var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'ID': 'id',
  'INSTRUCTION_ID': 'instruction',
  'POSITION': 'position',
  'REFERENCE_ID': 'reference',
  'ACCESS_TYPE': 'type',
  'MEMORY_STATE': 'state'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM ACCESS_TABLE');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'ACCESS_TABLE WHERE ID');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM ACCESS_TABLE WHERE ID=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
