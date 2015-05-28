var express = require('express');
var router = express.Router();

var util = require('./util');

var accesses = require('./access');

var mapping = {
  'ID': 'id',
  'REFERENCE_ID': 'reference',
  'SIZE': 'size',
  'MEMORY_TYPE': 'type',
  'NAME': 'name',
  'ALLOCATOR': 'allocator'
};

router.get('/', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM REFERENCE_TABLE');
  util.sendAll(stmt, mapping, res);
});

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM REFERENCE_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);
});

router.get('/:id/accesses', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM ACCESS_TABLE WHERE REFERENCE_ID=?');

  stmt.bind(req.params.id);

  util.sendAll(stmt, accesses.mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
