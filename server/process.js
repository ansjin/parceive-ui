/* global require */
/* global module */
/* global console */
/* global -_ */

/** @namespace server.process
  * @tutorial database */

var _ = require('lodash');

var sqlite3 = require('sqlite3').verbose();

var fs = require('fs');
var RSVP = require('rsvp');

var readFile = RSVP.denodeify(fs.readFile);
var readdir = RSVP.denodeify(fs.readdir);
var rename = RSVP.denodeify(fs.rename);

function openDB(path) {
  return new RSVP.Promise(function(resolve, reject) {
    var db = new sqlite3.Database(path, function(err) {
      if (err) {
        reject(err);
      } else {
        db.serialize();

        resolve(db);
      }
    });
  });
}

function execDB(db, sql) {
  return new RSVP.Promise(function(resolve, reject) {
    db.exec(sql, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function closeDB(db) {
  return new RSVP.Promise(function(resolve, reject) {
    db.close(function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function process(file, sqls, source, destination, temporary) {
  console.log(file + ': starting');
  console.time(file);
  return rename(source + file, temporary + file).then(function() {
    return openDB(temporary + file);
  }).then(function(db) {
    var at = 0;

    function runSQL() {
      if (at === sqls.length) {
        return;
      }

      var sql = sqls[at++];

      console.time(file + ' ' + sql.name);
      console.log(file + ' ' + sql.name + ': starting');
      return execDB(db, sql.content).then(function() {
        console.timeEnd(file + ' ' + sql.name);
      }).then(runSQL);
    }

    return runSQL().then(function() {
      return db;
    });
  }).then(function(db) {
    return closeDB(db);
  }).then(function() {
    return rename(temporary + file, destination + file);
  }).then(function() {
    console.timeEnd(file);
  });
}

function processAll(source, destination, temporary) {
    return readdir(source).then(function(files) {
      files = _.filter(files, function(file) {
        return _.endsWith(file, '.db');
      });

      if (files.length === 0) {
        return;
      }

      console.log('Processing: ' + files);

      return readdir('./database').then(function(sqlfiles) {
        sqlfiles.sort();

        var promises = _.map(sqlfiles, function(sql) {
          return readFile('database/' + sql, 'utf8').then(function(content) {
            return {
              content: content,
              name: sql
            };
          });
        });

        return RSVP.all(promises).then(function(sqls) {
          return readFile('sql/create.sql', 'utf8').then(function(content) {
            return {
              content: content.replace(/CREATE TABLE /g,
                                       'CREATE TABLE IF NOT EXISTS '),
              name: 'create.sql'
            };
          }).then(function(createScript) {
            sqls.unshift(createScript);
            return RSVP.all(_.map(files, function(file) {
              return process(file, sqls, source, destination, temporary);
            }));
          });
        });
      });
  });
}

module.exports = {
  all: processAll,
  one: process
};
