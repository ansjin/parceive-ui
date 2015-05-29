var express = require('express');
var router = express.Router();

var util = require('./util');

var accesses = require('./access');

var mapping = {
  'ID': 'id',
  'SEGMENT_ID': 'segment',
  'INSTRUCTION_TYPE': 'type',
  'LINE_NUMBER': 'lineNumber'
};

router.get('/', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM INSTRUCTION_TABLE');
  util.sendAll(stmt, mapping, res);
});

router.get('/many/:ids', function(req, res) {
  var prep = util.makeIN(req.params.ids);

  var stmt =
    req.db.prepare('SELECT * FROM INSTRUCTION_TABLE WHERE ID in' + prep.str);

  if (prep.args.length > 0) {
    stmt.bind.call(stmt, prep.args);
  }

  util.sendAll(stmt, mapping, res);
});

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM INSTRUCTION_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);

});

router.get('/:id/accesses', function(req, res) {
  var stmt =
    req.db.prepare('SELECT * FROM ACCESS_TABLE WHERE INSTRUCTION_ID=?');

  stmt.bind(req.params.id);

  util.sendAll(stmt, accesses.mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
