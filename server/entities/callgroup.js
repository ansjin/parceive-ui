var express = require('express');
var _ = require('lodash');

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

router.get('/many/:ids/callgroupreferences', function(req, res) {
  util.handleManyQuery(req.db, callgroupreferences.mapping, res, req.params.ids,
    'CallGroupReference WHERE CallGroup');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'CallGroup WHERE Id');
});

var treeMapping = _.extend(mapping, {
  'Depth': 'depth'
});

router.get('/:id/recursivecallgroups', function(req, res) {
  var duration = req.params.duration ? req.params.duration : 0;
  util.handleRelationshipQuery(req.db, treeMapping, res,
    'SELECT * FROM CallGroup, CallGroupTree WHERE Descendant=Id AND Ancestor=? AND Duration > ?',
    req.params.id, duration);
});
