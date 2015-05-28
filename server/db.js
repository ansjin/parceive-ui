var sqlite3 = require('sqlite3').verbose();

function dbManager(id, cb) {
  var path = './data/' + id + '.db';

  var db = new sqlite3.Database(path, sqlite3.OPEN_READONLY, cb);

  db.on('trace', function(sql) {
    console.log(sql);
  });

  return db;
}

module.exports = dbManager;
