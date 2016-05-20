var express = require('express');
var router = express.Router();

var dbManager = require('./db');

var fs = require('fs');
var _ = require('lodash');

var accesses = require('./entities/access');
var calls = require('./entities/call');
var files = require('./entities/file');
var functions = require('./entities/function');
var instructions = require('./entities/instruction');
var references = require('./entities/reference');
var segments = require('./entities/segment');
var threads = require('./entities/thread');
var callgroups = require('./entities/callgroup');
var loops = require('./entities/loop');
var loopexecutions = require('./entities/loopexecution');
var loopiterations = require('./entities/loopiteration');
var tags = require('./entities/tag');
var taginstances = require('./entities/taginstance');

router.use('/accesses', accesses.router);
router.use('/calls', calls.router);
router.use('/files', files.router);
router.use('/functions', functions.router);
router.use('/instructions', instructions.router);
router.use('/references', references.router);
router.use('/segments', segments.router);
router.use('/threads', threads.router);
router.use('/callgroups', callgroups.router);
router.use('/loops', loops.router);
router.use('/loopexecutions', loopexecutions.router);
router.use('/loopiterations', loopiterations.router);
router.use('/tags', tags.router);
router.use('/taginstances', taginstances.router);

var dbRouter = express.Router();

dbRouter.get('/run/', function(req, res) {
  res.type('application/json');

  fs.readdir('./data', function(err, files) {
    var ret = _.chain(files)
                  .filter(function(val) {return _.endsWith(val, '.db');})
                  .map(function(val) {return val.replace(/\.db$/, '');})
                  .value();
    res.send(ret);
  });
});

dbRouter.use('/run/:db/', function(req, res, next) {
  var db = dbManager(req.params.db, function(err) {
    if (err) {
      res.status(404);
      res.send(err);
    } else {
      req.db = db;

      next();

      db.close();
    }
  });
});

dbRouter.use('/run/:db/', router);

dbRouter.use(express.static('build'));

module.exports = dbRouter;
