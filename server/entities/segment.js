var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'ID': 'id',
  'CALL_ID': 'call',
  'SEGMENT_NO': 'segmentNumber',
  'SEGMENT_TYPE': 'type',
  'LOOP_POINTER': 'loopPointer'
};

router.get('/', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM SEGMENT_TABLE');
  util.sendAll(stmt, mapping, res);
});

router.get('/:id', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM SEGMENT_TABLE WHERE ID=?');

  stmt.bind(req.params.id);

  util.sendOne(stmt, mapping, res);
});

module.exports = {
  router: router,
  mapping: mapping
};
