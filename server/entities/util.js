var _ = require('lodash');

/** @namespace server.util
  * @tutorial server */

/** @function
    @memberof server.util
    @param {Object} mapping The mapping of properties from the DB to the API.
    @param {Object} row The row from the DB to be converted.
    @return {Object} All properties from row are renamed using mapping. */
function mapper(mapping, row) {
  var ret = {};

  _.forEach(mapping, function(val, key) {
    ret[val] = row[key];
  });

  return ret;
}

/** @function
    @memberof server.util
    @summary Parse the request parameters and prepare the sql fragment and the
              values that can be used to create a prepared statement
    @param {Object} str The json string that contains the array of ids
    @param {Express.Response} res
*/
function prepareDBArgs(str) {
  var data = JSON.parse(str);

  if (!_.isArray(data)) {
    return '()';
  }

  data = _.map(data, function(el) {
    if (_.isNumber(el)) {
      return el;
    } else if (_.isString(el)) {
      return '\'' + el.replace('\'', '\'\'') + '\'';
    } else {
      return;
    }
  });

  data = _.reject(data, _.isUndefined);

  return '(' + data.join()  + ')';
}

/** @function
    @memberof server.util
    @summary This function reads all the rows and sends them automatically
              using res.
    @param {String} stmt The prepared statement to execute.
    @param {Object} mapping The mapping to use to convert the DB rows.
    @param {Express.Response} res
*/
function sendAll(stmt, mapping, res) {
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
}

/** @function
    @memberof server.util
    @summary This function reads one row and sends it automatically
              using res.
    @param {String} stmt The prepared statement to execute.
    @param {Object} mapping The mapping to use to convert the DB row.
    @param {Express.Response} res
*/
function sendOne(stmt, mapping, res) {
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

/** @function
    @memberof server.util
    @summary This function reads all the rows of a many query and sends them
              automatically using res. Statement creation is also handled here.
    @param {SQLite.DB} db
    @param {Object} mapping The mapping to use to convert the DB rows.
    @param {Express.Response} res
    @param {String} ids The ids received as a parameter and need to be
                        processed
    @param {String} table The string between 'FROM' and 'IN'
    @param {String} ending A string to be added to the end of the query. Can
                            be used to extend the WHERE clause.
*/
function handleManyQuery(db, mapping, res, ids, table, ending) {
  if (!ending) {
    ending = '';
  }

  var prep = prepareDBArgs(ids);

  var stmt = db.prepare('SELECT * FROM ' + table + ' IN' + prep + ' ' + ending);

  sendAll(stmt, mapping, res);
}

/** @function
    @memberof server.util
    @summary This function reads all the rows of a relationship query and sends
              them automatically using res. Statement creation is also handled
              here.
    @param {SQLite.DB} db
    @param {Object} mapping The mapping to use to convert the DB rows.
    @param {Express.Response} res
    @param {String} sql The query
    @param {String} id The id of the entity
*/
function handleRelationshipQuery(db, mapping, res, sql, id) {
  var stmt = db.prepare(sql);

  var args = [id];

  var i;
  for (i = 5; i < arguments.length; i++) {
    args.push(arguments[i]);
  }

  stmt.bind.call(stmt, args);

  sendAll(stmt, mapping, res);
}

/** @function
    @memberof server.util
    @summary This function reads all rows of a query and sends
              them automatically using res. Statement creation is also handled
              here.
    @param {SQLite.DB} db
    @param {Object} mapping The mapping to use to convert the DB rows.
    @param {Express.Response} res
    @param {String} sql The query
*/
function handleAllQuery(db, mapping, res, sql) {
  var stmt = db.prepare(sql);
  sendAll(stmt, mapping, res);
}

/** @function
    @memberof server.util
    @summary This function reads one row of a simple query and sends
              it automatically using res. Statement creation is also handled
              here.
    @param {SQLite.DB} db
    @param {Object} mapping The mapping to use to convert the DB rows.
    @param {Express.Response} res
    @param {String} sql The query
    @param {String} id The id of the entity
*/
function handleOneQuery(db, mapping, res, sql, id) {
  var stmt = db.prepare(sql);

  stmt.bind(id);

  sendOne(stmt, mapping, res);
}

module.exports = {
  mapper: mapper,
  handleManyQuery: handleManyQuery,
  handleOneQuery: handleOneQuery,
  handleAllQuery: handleAllQuery,
  handleRelationshipQuery: handleRelationshipQuery
};
