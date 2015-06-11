var _ = require('lodash');

function mapper(mapping, row) {
  var ret = {};

  _.forEach(mapping, function(val, key) {
    ret[val] = row[key];
  });

  return ret;
}

var util = {
  mapper: mapper,

  sendAll: function(stmt, mapping, res) {
    res.type('application/json');

    var result = [];

    stmt.each(function(err, row) {
      if (!err) {
        result.push(mapper(mapping, row));
      }
    }, function(err) {
      if (err) {
        res.status(500);
        res.send(err);
      } else {
        res.send(result);
      }
    });

    stmt.finalize();
  },

  sendOne: function(stmt, mapping, res) {
    res.type('application/json');
    stmt.get(function(err, row) {
      if (err) {
        res.status(500);
        res.send(err);
      } else {
        if (row) {
          res.send(mapper(mapping, row));
        } else {
          res.status(404);
          res.send({'err': 'Not found'});
        }
      }
    });

    stmt.finalize();
  },

  makeIN: function(str) {
    var data = JSON.parse(str);

    if (!_.isArray(data)) {
      return '()';
    }

    var args = [];

    data = _.map(data, function(el) {
      if (_.isNumber(el)) {
        return el;
      } else if (_.isString(el)) {
        args.push(el);
        return '?';
      } else {
        return;
      }
    });

    data = _.reject(data, _.isUndefined);

    return {
      str: '(' + data.join()  + ')',
      args: args
    };
  },

  buildINStatement: function(db, mapping, res, ids, table) {
    var prep = util.makeIN(ids);

    var stmt = db.prepare('SELECT * FROM ' + table + ' IN' + prep.str);

    if (prep.args.length > 0) {
      stmt.bind.call(stmt, prep.args);
    }

    util.sendAll(stmt, mapping, res);
  }
};

module.exports = util;
