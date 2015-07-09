/* global require */
/* global module */
/* global console */
/* global -_ */

var _ = require('lodash');

var sqlite3 = require('sqlite3').verbose();

var fs = require('fs');

var runningList = [];
var isProcessing = false;

function startProcessing(file) {
  console.log('Processing ' + file);
  runningList.push(file);
}

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
        cb(err);
      });
    });
  });

}

function processAll(path, dest, cb) {
  if (isProcessing) {
    cb('Already processing files');
  }

  isProcessing = true;

  fs.readFile('./mod.sql', 'utf8', function(err, sql) {
    if (err) {
      return cb(err);
    }
    fs.readdir(path, function(err, files) {
      if (files.length === 0) {
        isProcessing = false;
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
        isProcessing = false;
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

module.exports = {
  all: processAll,
  one: process,
  getRunngin: function() {
    return runningList;
  },
  isProcessing: function() {
    return isProcessing;
  }
};
