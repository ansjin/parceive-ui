/* global require */
/* global console */
/* global -_ */
/* global process */

// gulp
var gulp = require('gulp');

//util
var util = require('gulp-util');
var _ = require('lodash');
var os = require('os');

// plugins
var connect = require('gulp-connect');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var rimraf = require('gulp-rimraf');
var bower = require('gulp-bower');
var csslint = require('gulp-csslint');
var livereload = require('gulp-livereload');
var templateCache = require('gulp-angular-templatecache');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var gulpif = require('gulp-if');
var order = require('gulp-order');
var header = require('gulp-header');
var footer = require('gulp-footer');
var jscs = require('gulp-jscs');
var map = require('map-stream');
var sass = require('gulp-sass');
var merge = require('merge-stream');
var express = require('express');
var shell = require('gulp-shell');

var processDB = require('./server/process');

//utilities

var objectFieldsToBool = function(r, n, k) {
  if (r[k] === 'true') {
    r[k] = true;
  } else if (r[k] === 'false') {
    r[k] = false;
  }
};

//options

var env = require('./build.json');

var opts = _.defaults(
  //gulp-if treats strings as glob patterns, force bools here
  _.transform(util.env, objectFieldsToBool, util.env),
  env.opts);

//tasks

gulp.task('default', ['server']);

gulp.task('bower', function() {
  return bower();
});

gulp.task('jshint', function() {
  return gulp.src(['./app/**/*.js', '!./app/bower_components/**'])
    .pipe(jshint())
    .pipe(jscs())
    .on('error', function(err) {
      if (opts.failonlint) {
        throw err;
      }
      console.log(err.message);
      this.emit('end');
    })
    .pipe(jshint.reporter('default'))
    .pipe(map(function(file, cb) {
      if (!file.jshint.success && opts.failonlint) {
        cb(file.jshint.results[0].reason, null);
      }

      cb(null, file);
    }));
});

gulp.task('csslint', function() {
  return gulp.src('client/styles/**/*.css')
    .pipe(csslint())
    .pipe(csslint.reporter());
});

gulp.task('lint', ['jshint', 'csslint']);

gulp.task('clean', function() {
  return gulp.src(['./build/', './dist/*', './app/bower_components'])
    .pipe(rimraf({force: true}));
});

gulp.task('minify-css', ['bower'], function() {
  var scss = gulp.src(['./app/style/**/*.scss'])
    .pipe(gulpif(opts.sourcemaps, sourcemaps.init()))
      .pipe(sass({
        includePaths: ['./app/style/', './app/bower_components/',
          './app/bower_components/bootstrap-sass/assets/stylesheets']
      }).on('error', function() {
        sass.logError.apply(this, arguments);
        this.emit('end');
      }))
    .pipe(gulpif(opts.sourcemaps, sourcemaps.write()));

  return merge(scss, gulp.src(['./app/style/**/*.css']))
    .pipe(gulpif(opts.sourcemaps, sourcemaps.init()))
      .pipe(concat('style.css'))
      .pipe(gulpif(opts.minify, minifyCSS()))
    .pipe(gulpif(opts.sourcemaps, sourcemaps.write()))
    .pipe(gulp.dest('./build/'));
});

gulp.task('minify-js', function() {
  return gulp.src(['./app/scripts/**/*.js'])
    .pipe(order(env.codeOrder, {base: '.'}))
    .pipe(header('(function(){ "use strict"\n'))
    .pipe(footer('})();'))
    .pipe(gulpif(opts.sourcemaps, sourcemaps.init()))
      .pipe(gulpif(opts.minify, uglify()))
      .pipe(concat('code.js'))
    .pipe(gulpif(opts.sourcemaps, sourcemaps.write()))
    .pipe(gulp.dest('./build/'));
});

gulp.task('minify-js-tests', function() {
  return gulp.src(['./app/tests/**/*.js'])
    .pipe(order(env.testOrder, {base: '.'}))
    .pipe(gulpif(opts.sourcemaps, sourcemaps.init()))
      .pipe(gulpif(opts.minify, uglify()))
      .pipe(concat('tests.js'))
    .pipe(gulpif(opts.sourcemaps, sourcemaps.write()))
    .pipe(gulp.dest('./build/'));
});

gulp.task('minify-js-deps', ['bower'], function() {
  return gulp.src(env.jsDeps)
    .pipe(gulpif(opts.minify, uglify()))
    .pipe(concat('deps.js'))
    .pipe(gulp.dest('./build'));
});

gulp.task('minify-css-deps', ['bower'], function() {
  return gulp.src(env.cssDeps)
    .pipe(gulpif(opts.minify, minifyCSS()))
    .pipe(concat('deps.css'))
    .pipe(gulp.dest('./build'));
});

gulp.task('minify-templates', function() {
  return gulp.src('./app/templates/**/*.html')
    .pipe(templateCache({module: 'app'}))
    .pipe(gulp.dest('./build'));
});

gulp.task('html', function() {
  return gulp.src('./app/index.html')
    .pipe(gulp.dest('./build'));
});

gulp.task('doc', function() {
  var cmd = 'node_modules/jsdoc/jsdoc.js -c docconf.json';
  if (os.platform() === 'win32') {
    cmd = 'node node_modules\\jsdoc\\jsdoc.js -c docconf.json';
  }
  return gulp.src('')
    .pipe(shell([cmd]));
});

gulp.task('db', function(cb) {
  processDB.all('./import/', './data/', './tmp/databases/').then(function(){
    cb();
  }, function(err) {
    cb(err);
  });
});

gulp.task('build', ['bower', 'lint', 'minify-js', 'minify-js-deps',
                    'minify-css-deps', 'minify-css', 'minify-templates',
                    'html', 'db', 'doc']);

gulp.task('test-deps', function() {
  return gulp.src([
      './app/test.html',
      './app/bower_components/mocha/mocha.js',
      './app/bower_components/mocha/mocha.css',
      './app/bower_components/chai/chai.js',
      './app/bower_components/chai-as-promised/lib/chai-as-promised.js',
    ])
    .pipe(gulp.dest('./build'));
});

gulp.task('test-build', ['minify-js-tests', 'test-deps']);

gulp.task('tests', ['build', 'test-build'], function(cb) {
  var entities = require('./server/entities');

  var app = express();

  app.use(entities);

  var server = app.listen(12345, function() {
    var exec = require('child_process').exec;

    exec('./node_modules/mocha-phantomjs/bin/mocha-phantomjs ' +
        'http://localhost:12345/test.html', function(error, stdout/*, stderr*/) {
      console.log(stdout);

      server.close();

      cb();

      process.nextTick(function() {
        process.exit(error ? error.code : 0);
      });
    });
  });
});

gulp.task('server', ['build', 'test-build'], function() {
  //server
  var entities = require('./server/entities');

  var dbRoute = express();

  dbRoute.use(entities);

  gulp.watch('bower.json', ['bower', 'minify-js-deps', 'minify-css-deps']);
  gulp.watch('build.json', ['build']);

  gulp.watch(['app/scripts/**/*.js'], ['minify-js', 'jshint', 'doc']);
  gulp.watch(['app/style/**/*.css', 'app/style/**/*.scss'], ['minify-css',
                                                             'csslint']);
  gulp.watch(['app/templates/**/*.html'], ['minify-templates']);

  gulp.watch(['app/tests/**/*.js'], ['test-build']);

  gulp.watch(['server/**/*.js', 'tutorials/*.md'], ['doc']);

  gulp.watch(['app/index.html'], ['html']);

  gulp.watch(['import/*.db'], ['db']);

  livereload.listen({basePath: 'build'});

  gulp.watch(['build/**']).on('change', livereload.changed);

  connect.server({
    root: 'build/',
    port: 8080,
    middleware: function() {
      return [dbRoute];
    }
  });
});
