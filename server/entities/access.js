var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Instruction': 'instruction',
  'Position': 'position',
  'Reference': 'reference',
  'Type': 'type',
  'State': 'state'
};

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM Access');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Access WHERE Id');
});

module.exports = {
  router: router,
  mapping: mapping
};
