var express = require('express');
var router = express.Router();

var util = require('./util');

var mapping = {
  'Id': 'id',
  'Tag': 'tag',
  'Start': 'start',
  'End': 'end',
  'Duration': 'duration',
  'Thread': 'thread',
  'StartTime': 'startTime',
  'EndTime': 'endTime',
  'DurationMs': 'durationMs'
};

module.exports = {
  router: router,
  mapping: mapping
};

router.get('/many/:ids', function(req, res) {
  util.handleManyQuery(req.db, mapping, res, req.params.ids,
    'TagInstance WHERE Id');
});

var conflictMapping = {
  't1': 'task1',
  'a1': 'access1',
  't2': 'task2',
  'a2': 'access2'
};

router.get('/:id/sectionconflicts', function(req, res) {
  var stmt = req.db.prepare(
    'SELECT ? WHERE 1=2'
    );

  stmt.bind(req.params.id);

  util.sendAll(stmt, conflictMapping, res);
});

router.get('/:id/tasks', function(req, res) {
  var stmt = req.db.prepare(
      'WITH StartEnd AS (' +
       'SELECT ti.Start Start, ti.End End FROM TagInstance ti WHERE ti.Id == ?' +
      ')' +
      'SELECT * FROM TagInstance task WHERE ' +
        '(SELECT tag.Type FROM Tag WHERE Tag.Id == task.Tag) == 10 AND task.Start >= (SELECT Start FROM StartEnd) AND task.End <= (SELECT End FROM StartEnd)'
    );

  stmt.bind(req.params.id);

  util.sendAll(stmt, mapping, res);
});

router.get('/sections', function(req, res) {
  var stmt = req.db.prepare(
      'SELECT * FROM TagInstance WHERE (SELECT Type FROM Tag WHERE Id == Tag) == 2'
    );

  util.sendAll(stmt, mapping, res);
});
