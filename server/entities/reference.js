var express = require('express');
var router = express.Router();

var util = require('./util');

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

module.exports = {
  router: router,
  mapping: mapping
};
