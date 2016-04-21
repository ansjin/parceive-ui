var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Prototype': 'signature',
  'Name': 'name',
  'File': 'file',
  'Line': 'startLine',
  'Duration': 'duration'
};

module.exports = {
  router: router,
  mapping: mapping
};

var calls = require('./call');
var loops = require('./loop');

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM Function');
});

router.get('/signature/:sig', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM Function WHERE Name=?', req.params.sig);
});

router.get('/many/:ids/calls', function(req, res) {
  util.handleManyQuery(req.db, calls.mapping, res, req.params.ids,
    'Call WHERE Function');
});

router.get('/many/:ids/loops', function(req, res) {
  util.handleManyQuery(req.db, loops.mapping, res, req.params.ids,
    'Loop WHERE Function');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Function  WHERE Id');
});
