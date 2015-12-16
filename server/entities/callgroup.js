var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Function': 'function',
  'Caller': 'caller',
  'Count': 'count',
  'Parent': 'parent',
  'Duration': 'duration',
  'Start': 'start',
  'End': 'end'
};

module.exports = {
  router: router,
  mapping: mapping
};

var calls = require('./call');
var callgroupreferences = require('./callgroupreference');

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM CallGroup');
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, calls.mapping, res, req.params.ids,
    'Call WHERE CallGroup');
});

router.get('/many/:ids/callgroups', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'CallGroup WHERE Parent');
});

router.get('/many/:ids/callgroupferences', function(req, res) {
  util.handleManyQuery(req.db, callgroupreferences.mapping, res, req.params.ids,
    'CallGroupReference WHERE CallGroup');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'CallGroup WHERE Id');
});
