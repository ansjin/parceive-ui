/* global require */
/* global console */

var express = require('express');

var entities = require('./server/entities');

var watch = require('./server/watch');

var fs = require('fs');

watch();

var app = express();

app.use(entities);
var server = app.listen(3000, function() {

  var host = server.address().address;
  var port = server.address().port;

  console.log('App listening at http://%s:%s', host, port);
});
