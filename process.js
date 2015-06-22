/* global require */
/* global module */
/* global console */
/* global -_ */

var _ = require('lodash');

var sqlite3 = require('sqlite3').verbose();

var fs = require('fs');
var mv = require('mv');

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
  fs.readFile('./mod.sql', 'utf8', function(err, sql) {
    if (err) {
      return cb(err);
    }
    fs.readdir(path, function(err, files) {
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

      var afterMove = _.after(files.length, cb);

      function moveFiles() {
        _.forEach(ofiles, function(file) {
          fs.rename(path + file, dest + file, function(err) {
            console.log(path + file, dest + file);

            if (err) {
              return cb(err);
            }

            afterMove();
          });
        });
      }

      var afterFunc = _.after(files.length, moveFiles);

      _.forEach(files, function(file) {
        console.log('Processing ' + file);
        process(file, sql, function(err) {
          if (err) {
            return cb(err);
          }

          console.log('Finished processing ' + file);
          afterFunc();
        });
      });
    });
  });
}

module.exports = {
  all: processAll,
  one: process
};
