var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'No': 'id',
  'Line': 'line',
  'Function': 'function'
};

module.exports = {
  router: router,
  mapping: mapping
};

var loopexecutions = require('./loopexecution');

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
