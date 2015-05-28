var express = require('express');
var router = express.Router();

var util = require('./util');

var functions = require('./function');

var mapping = {
  'ID': 'id',
  'FILE_NAME': 'name',
  'FILE_PATH': 'path'
};

router.get('/', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM FILE_TABLE');
  util.sendAll(stmt, mapping, res);
});

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM FILE_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);
});

router.get('/:id/functions', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM FUNCTION_TABLE WHERE FILE_ID=?');

  stmt.bind(req.params.id);

  util.sendAll(stmt, functions.mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
