/* global setInterval */

/** @namespace server.watch
  * @tutorial database */

var fs = require('fs');

var processDB = require('./process');

function process() {
  return processDB.all('./import/', './tmp/databases/', './data/');
}

/** @summary Start watching.
  * @description Processing will be done every 10s or on file change.
  * @memberof server.watch */
function watch() {
  process();
  fs.watch('./import/', process);
  setInterval(process, 10000);
}

module.exports = watch;
