var sqlite3 = require('sqlite3').verbose();

var cache = {};

function dbManager(id, cb) {
  if (cache[id]) {
    setImmediate(cb);
    return cache[id];
  }

  var path = './data/' + id + '.db';

  var db = new sqlite3.Database(path, sqlite3.OPEN_READONLY, cb);

  db.on('trace', function(sql) {
    console.log(sql);
  });

  cache[id] = db;

  return db;
}

module.exports = dbManager;
