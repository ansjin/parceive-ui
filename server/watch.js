/* global setInterval */

var fs = require('fs');

var processDB = require('../process');

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

module.exports = function() {
  processIfNotProcessing();
  fs.watch('./import/', processIfNotProcessing);
  setInterval(processIfNotProcessing, 10000);
};
