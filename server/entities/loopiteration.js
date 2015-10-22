var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Execution': 'execution',
  'Iteration': 'iteration',
  'Segment': 'segment'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM LoopIteration');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'LoopIteration WHERE Id');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM LoopIteration WHERE Id=?', req.params.id);
});

module.exports = {
  router: router,
  mapping: mapping
};
