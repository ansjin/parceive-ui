var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Size': 'size',
  'Type': 'type',
  'Name': 'name',
  'Allocator': 'allocator'
};

module.exports = {
  router: router,
  mapping: mapping
};

var accesses = require('./access');

router.get('/', function(req, res) {
  util.handleAllQuery(req.db, mapping, res, 'SELECT * FROM Reference');
});

router.get('/many/:ids/accesses', function(req, res) {
  util.handleManyQuery(req.db, accesses.mapping, res, req.params.ids,
    'Access WHERE Id');
});

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'Reference WHERE Id');
});

router.get('/sharedreferences', function(req, res) {
  var callIds = util.prepareDBArgs(req.query.callIds);
  var callgroupIds = util.prepareDBArgs(req.query.callgroupIds);

  var callIdsL = JSON.parse(req.query.callIds).length;
  var callgroupIdsL = JSON.parse(req.query.callgroupIds).length;

  var stmt = req.db.prepare('SELECT * FROM Reference r WHERE ' +
		'(SELECT COUNT(c.Id) FROM Call c WHERE c.Id IN ' + callIds +
    ' AND EXISTS (SELECT cr.Id FROM CallReference cr WHERE ' +
    'cr.Call=c.Id AND cr.Reference=r.Id)) = ' + callIdsL + ' AND ' +
    '(SELECT COUNT(cg.Id) FROM CallGroup cg WHERE cg.Id IN ' + callgroupIds +
    ' AND EXISTS (SELECT cgr.Id FROM CallGroupReference cgr WHERE ' +
    'cgr.CallGroup=cg.Id AND cgr.Reference=r.Id)) = ' + callgroupIdsL);

  util.sendAll(stmt, mapping, res);
});
