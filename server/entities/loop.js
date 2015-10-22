var express = require('express');
var router = express.Router();

var util = require('./util');

var loopexecutions = require('./loopexecution');

var mapping = {
  'No': 'id',
  'Line': 'line',
  'Function': 'function'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM Loop');
});

router.get('/many/:ids/loopexecutions', function(req, res) {
  util.handleManyQuery(req.db, loopexecutions.mapping, res, req.params.ids,
    'LoopExecution WHERE No');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Loop WHERE No');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM Loop WHERE No=?', req.params.id);
});

router.get('/:id/loopexecutions', function(req, res) {
  util.handleRelationshipQuery(req.db, loopexecutions.mapping, res,
    'SELECT * FROM LoopExecution WHERE No=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
