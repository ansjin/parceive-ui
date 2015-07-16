/* global require */
/* global module */
/* global console */
/* global -_ */

/** @namespace server.process
  * @tutorial database */

var _ = require('lodash');

var sqlite3 = require('sqlite3').verbose();

var fs = require('fs');

/** @private
  * @type {Array.<String>}
  * @summary The databases that are curently beeing processed
  * @memberof server.process */
var runningList = [];

/** @private
  * @type {Boolean}
  * @summary Are databases being processed?
  * @memberof server.process */
var isProcessingNow = false;

/** @private
  * @summary Used for instrumentation
  * @memberof server.process */
function startProcessing(file) {
  console.log('Processing ' + file);
  runningList.push(file);
}

/** @private
  * @summary Used for instrumentation
  * @memberof server.process */
function stopProcessing(file, err) {
  console.log('Finished processing ' + file);
  if (err) {
    console.log('Processing failed due to ' + err);
  }

  var index = runningList.indexOf(file);

  if (index > -1) {
    runningList.splice(index, 1);
  }
}

/** @summary Execute the script in sql on the database. The database is closed
              before calling the callback
  * @param {String} path The path to the database
  * @param {String} sql The script
  * @param {server.db.DBCallback}
  * @memberof server.process */
function process(path, sql, cb) {
  var db = new sqlite3.Database(path, function(err) {
    if (err) {
      return cb(err);
    }

    db.exec(sql, function(err) {
      if (err) {
        return cb(err);
      }

      db.close(function(err) {
        cb(err, db);
      });
    });
  });

}

/** @callback ProcessCallback
  * @memberof server.process
  * @param {String} err */

/** @summary Process all databases in the source folder and store them in the
              destination folder.
  * @param {String} path The source folder
  * @param {String} dest The destination folder
  * @param {server.process.ProcessCallback}
  * @memberof server.process */
function processAll(path, dest, cb) {
  if (isProcessingNow) {
    cb('Already processing files');
  }

  isProcessingNow = true;

  fs.readFile('./mod.sql', 'utf8', function(err, sql) {
    if (err) {
      return cb(err);
    }
    fs.readdir(path, function(err, files) {
      if (files.length === 0) {
        isProcessingNow = false;
        return cb();
      }

      files = _.filter(files, function(file) {
        return _.endsWith(file, '.db');
      });

      var ofiles = files;

      files = _.map(files, function(file) {
        return path + file;
      });

      if (files.length === 0) {
        return cb();
      }

      var afterMove = _.after(files.length, function() {
        isProcessingNow = false;
        cb();
      });

      function moveFiles() {
        _.forEach(ofiles, function(file) {
          fs.rename(path + file, dest + file, function(err) {
            if (err) {
              return cb(err);
            }

            afterMove();
          });
        });
      }

      var afterFunc = _.after(files.length, moveFiles);

      _.forEach(files, function(file) {
        startProcessing(file);
        process(file, sql, function(err) {
          stopProcessing(file, err);

          if (err) {
            return cb(err);
          }

          afterFunc();
        });
      });
    });
  });
}

/** @return {Array.<String>} What databases are beeing processed?
  * @memberof server.process */
function getRunning() {
  return runningList;
}

/** @return {Boolean} Are there any databases being processed?
  * @memberof server.process */
function isProcessing() {
  return isProcessingNow;
}

module.exports = {
  all: processAll,
  one: process,
  isProcessing: isProcessing,
  getRunning: getRunning
};
