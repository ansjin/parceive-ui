var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Name': 'name',
  'Type': 'type'
};

module.exports = {
  router: router,
  mapping: mapping
};

var taginstances = require('./taginstance');
var taginstructions = require('./taginstruction');

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Tag WHERE Id');
});

router.get('/many/:ids/taginstances', function(req, res) {
  util.handleManyQuery(req.db, taginstances.mapping, res, req.params.ids,
    'TagInstance WHERE Tag');
});

router.get('/many/:ids/taginstructions', function(req, res) {
  util.handleManyQuery(req.db, taginstructions.mapping, res, req.params.ids,
    'TagInstruction WHERE Tag');
});
