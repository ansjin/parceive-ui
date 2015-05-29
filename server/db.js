/* global setInterval */
/* global setImmediate */

var sqlite3 = require('sqlite3').verbose();
var _ = require('lodash');

var cache = {};

setInterval(function() {
  _.forEach(cache, function(dbarr, id) {
    if (dbarr.length > 0) {
      var db = dbarr.pop();
      db.oldclose();

      console.log('Closing ' + id + ' (' + dbarr.length + ' remaining)');
    }
  });
}, 1000);

function openDb(id, cb) {
  var path = './data/' + id + '.db';

  var db = new sqlite3.Database(path, sqlite3.OPEN_READONLY, cb);

  db.on('trace', function(sql) {
    console.log(sql);
  });

  db.oldclose = db.close;

  db.close = function() {
    cache[id].push(db);
  };

  return db;
}

function dbManager(id, cb) {
  if (!cache[id]) {
    cache[id] = [];
  }

  var db;

  if (cache[id].length === 0) {
    db = openDb(id, cb);
  } else {
    setImmediate(cb);
    db = cache[id].pop();
  }

  return db;
}

module.exports = dbManager;
