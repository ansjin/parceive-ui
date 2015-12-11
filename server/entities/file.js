var express = require('express');
var router = express.Router();

var util = require('./util');

var fs = require('fs');

var mapping = {
  'Id': 'id',
  'Name': 'name',
  'Path': 'path'
};

module.exports = {
  router: router,
  mapping: mapping
};

var functions = require('./function');

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM File');
});

router.get('/many/:ids/functions', function(req, res) {
  util.handleManyQuery(req.db, functions.mapping, res, req.params.ids,
    'Function WHERE File');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'File WHERE Id');
});

router.get('/:id', function(req, res) {
  util.handleOneQuery(req.db, mapping, res,
    'SELECT * FROM File WHERE Id=?', req.params.id);
});

router.get('/:id/functions', function(req, res) {
  util.handleRelationshipQuery(req.db, functions.mapping, res,
    'SELECT * FROM Function WHERE File=?', req.params.id);
});

router.get('/:id/content', function(req, res) {
  var stmt = req.db.prepare('SELECT * FROM File WHERE Id=?');

  stmt.bind(req.params.id);

  stmt.get(function(err, row) {
    if (err) {
      res.type('text/plain');
      res.status(500);
      res.send(err);
      return;
    }

    fs.readFile(row.Path, function(err, data) {
      if (err) {
        res.type('text/plain');
        res.status(500);
        res.send(err);
        return;
      }

      res.type('text/plain');
      res.send(data);
    });
  });

  stmt.finalize();
});
