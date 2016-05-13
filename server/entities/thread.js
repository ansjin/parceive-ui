var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'CreateInstruction': 'createInstruction',
  'JoinInstruction': 'joinInstruction',
  'StartTime': 'startTime',
  'EndTime': 'endTime',
  'EndTSC': 'endTSC',
  'Process': 'process'
};

module.exports = {
  router: router,
  mapping: mapping
};

var calls = require('./call');

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM Thread');
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, calls.mapping, res, req.params.ids,
    'Call WHERE Thread');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Thread WHERE Id');
});
