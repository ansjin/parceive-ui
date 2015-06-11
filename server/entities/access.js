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
  var stmt = req.db.prepare('SELECT * FROM ACCESS_TABLE');
  util.sendAll(stmt, mapping, res);
});

router.get('/many/:ids', function(req, res) {
  util.buildINStatement(req.db, mapping, res, req.params.ids,
    'ACCESS_TABLE WHERE ID');
});

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM ACCESS_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
