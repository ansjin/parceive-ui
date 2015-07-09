/* global setInterval */
/* global setImmediate */

/** @namespace server.db */

var sqlite3 = require('sqlite3').verbose();
var _ = require('lodash');

/** @external SQLiteDB
  * @see https://github.com/mapbox/node-sqlite3 */

/** @type {Object.<String,Array.<SQLiteDB>>}
    @memberof server.db
    @summary This cache keeps multiple databases open in order to reduce access
              time for new queries. The open databases are closed at a rate of
              1/s and are opened whenever one is not available.
 */
var cache = {};

/** @memberof server.db
    @summary This function handles the cleanup of open databases.
    @private
*/
function cleanupDB() {
  _.forEach(cache, function(dbarr, id) {
    if (dbarr.length > 0) {
      var db = dbarr.pop();
      db.oldclose();

      console.log('Closing ' + id + ' (' + dbarr.length + ' remaining)');
    }
  });
}

setInterval(cleanupDB, 1000);

/** @callback DBCallback
    @memberof server.db
    @param {String} err
    @param {SQLiteDB} db
 */

/** @memberof server.db
    @summary Open a db and replace the closing function to simply add it to
              the pool.
    @private
    @param {String} id The name of the database.
    @param {server.db.DBCallback} cb
    @return {SQLiteDB}
*/
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

/** @memberof server.db
    @summary Get a open SQLiteDB. It is only abailable after cb fires.
    @param {String} id The name of the database.
    @param {server.db.DBCallback} cb
    @return {SQLiteDB}
*/
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
