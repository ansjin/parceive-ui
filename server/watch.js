/* global setInterval */

/** @namespace server.watch
  * @tutorial database */

var fs = require('fs');

var processDB = require('./process');

/** @private
  * @summary Check if we are already processing. If not then start to import all
              databases.
  * @memberof server.watch */
function processIfNotProcessing() {
  if (processDB.isProcessing() === false) {
    console.log('Starting import');
    processDB.all('./import/', './data/', function(err) {
      if (err) {
        console.log('Processing failed, reason: ' + err);
      } else {
        console.log('Processing done');
      }
    });
  }
}

/** @summary Start watching.
  * @description Processing will be done every 10s or on file change.
  * @memberof server.watch */
function watch() {
  processIfNotProcessing();
  fs.watch('./import/', processIfNotProcessing);
  setInterval(processIfNotProcessing, 10000);
}

module.exports = watch;
