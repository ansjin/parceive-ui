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
  var stmt = req.db.prepare('SELECT * FROM REFERENCE_TABLE');
  util.sendAll(stmt, mapping, res);
});

router.get('/many/:ids', function(req, res) {
  var prep = util.makeIN(req.params.ids);

  var stmt =
    req.db.prepare('SELECT * FROM REFERENCE_TABLE WHERE REFERENCE_ID in' +
                    prep.str);

  if (prep.args.length > 0) {
    stmt.bind.call(stmt, prep.args);
  }

  util.sendAll(stmt, mapping, res);
});

router.get('/:id', function(req, res) {
  var stmt =
    req.db.prepare('SELECT * FROM REFERENCE_TABLE WHERE REFERENCE_ID=?');

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
