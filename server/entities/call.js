var express = require('express');
var _ = require('lodash');

var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Thread': 'thread',
  'Function': 'function',
  'Instruction': 'instruction',
  'Start': 'start',
  'End': 'end',
  'Caller': 'caller',
  'CallerExecution': 'callerexecution',
  'CallerIteration': 'calleriteration',
  'CallsOther': 'callsOthers',
  'Duration': 'duration',
  'CallGroup': 'callGroup',
  'LoopCount': 'loopCount'
};

module.exports = {
  router: router,
  mapping: mapping
};

var segments = require('./segment');
var loopexecutions = require('./loopexecution');
var callgroups = require('./callgroup');
var callreferences = require('./callreference');

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM Call');
});

router.get('/many/:ids/segments', function(req, res) {
  util.handleManyQuery(req.db, segments.mapping, res, req.params.ids,
    'Segment WHERE Call');
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Call WHERE Caller');
});

router.get('/many/:ids/loopexecutions', function(req, res) {
  util.handleManyQuery(req.db, loopexecutions.mapping, res, req.params.ids,
    'LoopExecution WHERE Call');
});

router.get('/many/:ids/directloopexecutions', function(req, res) {
  util.handleManyQuery(req.db, loopexecutions.mapping, res, req.params.ids,
    'LoopExecution WHERE Call', 'AND ParentIteration IS NULL');
});

router.get('/many/:ids/directcalls', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Call WHERE Caller', 'AND CallerExecution IS NULL');
});

router.get('/many/:ids/callreferences', function(req, res) {
  util.handleManyQuery(req.db, callreferences.mapping, res, req.params.ids,
    'CallReference WHERE Call');
});

router.get('/many/:ids/callgroups', function(req, res) {
  util.handleManyQuery(req.db, callgroups.mapping, res, req.params.ids,
    'CallGroup WHERE Caller');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Call WHERE Id');
});

var treeMapping = _.extend(mapping, {
  'Depth': 'depth'
});

router.get('/:id/recursivecalls', function(req, res) {
  var duration = req.query.duration ? req.query.duration : 0;
  util.handleRelationshipQuery(req.db, treeMapping, res,
    'SELECT * FROM Call, CallTree WHERE Descendant=Id AND Ancestor=? AND Duration > ?',
    req.params.id, duration);
});
