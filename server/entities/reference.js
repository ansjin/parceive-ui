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
  var loopexecutionIds = util.prepareDBArgs(req.query.loopexecutionIds);
  var loopiterationIds = util.prepareDBArgs(req.query.loopiterationIds);

  var callIdsL = JSON.parse(req.query.callIds).length;
  var callgroupIdsL = JSON.parse(req.query.callgroupIds).length;
  var loopexecutionIdsL = JSON.parse(req.query.loopexecutionIds).length;
  var loopiterationIdsL = JSON.parse(req.query.loopiterationIds).length;

  var stmt = req.db.prepare('SELECT * FROM Reference r WHERE ' +
		'(SELECT COUNT(c.Id) FROM Call c WHERE c.Id IN ' + callIds +
    ' AND EXISTS (SELECT cr.Id FROM CallReference cr WHERE ' +
    'cr.Call=c.Id AND cr.Reference=r.Id)) = ' + callIdsL + ' AND ' +

    '(SELECT COUNT(cg.Id) FROM CallGroup cg WHERE cg.Id IN ' + callgroupIds +
    ' AND EXISTS (SELECT cgr.Id FROM CallGroupReference cgr WHERE ' +
    'cgr.CallGroup=cg.Id AND cgr.Reference=r.Id)) = ' + callgroupIdsL +

    ' AND (SELECT COUNT(le.Id) FROM LoopExecution le WHERE le.Id IN ' +
    loopexecutionIds +
    ' AND EXISTS (SELECT ler.Id FROM LoopExecutionReference ler WHERE ' +
    'ler.LoopExecution = le.Id AND ler.Reference = r.Id)) = ' +
    loopexecutionIdsL + ' AND ' +

    '(SELECT COUNT(li.Id) FROM LoopIteration li WHERE li.Id IN ' +
    loopiterationIds +
    ' AND EXISTS (SELECT lir.Id FROM LoopIterationReference lir WHERE ' +
    'lir.LoopIteration = li.Id AND lir.Reference = r.Id)) = ' +
    loopiterationIdsL
    );

  util.sendAll(stmt, mapping, res);
});

router.get('/recursivesharedreferences', function(req, res) {
  var callIds = util.prepareDBArgs(req.query.callIds);
  var callgroupIds = util.prepareDBArgs(req.query.callgroupIds);

  var callIdsL = JSON.parse(req.query.callIds).length;
  var callgroupIdsL = JSON.parse(req.query.callgroupIds).length;

  var stmt = req.db.prepare('SELECT * FROM Reference r WHERE' +
		' (SELECT COUNT(DISTINCT ct.Ancestor) FROM CallTree ct WHERE ct.Ancestor' +
    ' IN ' + callIds + ' AND EXISTS (SELECT cr.Id FROM CallReference cr' +
    ' WHERE cr.Call = ct.Descendant AND cr.Reference=r.Id)) = ' +
    callIdsL + ' AND ' +

    '(SELECT COUNT(DISTINCT cgt.Ancestor) FROM CallGroupTree cgt' +
    ' WHERE cgt.Ancestor IN ' + callgroupIds + ' AND EXISTS (SELECT cgr.Id' +
    ' FROM CallGroupReference cgr WHERE cgr.CallGroup = cgt.Descendant AND' +
    ' cgr.Reference=r.Id)) = ' + callgroupIdsL);

  util.sendAll(stmt, mapping, res);
});
