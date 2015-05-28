var _ = require('lodash');

function mapper(mapping, row) {
  var ret = {};

  _.forEach(mapping, function(val, key) {
    ret[val] = row[key];
  });

  return ret;
}

module.exports = {
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
  }
};
