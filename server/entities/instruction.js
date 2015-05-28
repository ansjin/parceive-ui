var express = require('express');
var router = express.Router();

var util = require('./util');

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

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM INSTRUCTION_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
