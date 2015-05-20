// gulp
var gulp = require('gulp');

//util
var util = require('gulp-util');
var _ = require('lodash');

// plugins
var connect = require('gulp-connect');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var clean = require('gulp-clean');
var bower = require('gulp-bower');
var csslint = require('gulp-csslint');
var livereload = require('gulp-livereload');
var templateCache = require('gulp-angular-templatecache');
var rename = require('gulp-rename');
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

//utilities

var objectFieldsToBool = function(r, n, k) {
  if(r[k] === "true") r[k] = true;
  else if(r[k] === "false") r[k] = false;
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
      if(opts.failonlint) throw err;
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
      .pipe(clean({force: true}));
});

gulp.task('minify-css', function() {
  var scss = gulp.src(['./app/style/**/*.scss'])
    .pipe(gulpif(opts.sourcemaps, sourcemaps.init()))
      .pipe(sass({
        includePaths: ['./app/style/', './app/bower_components/', './app/bower_components/bootstrap-sass/assets/stylesheets']
      }).on('error', sass.logError))
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
    .pipe(order(opts.code_order))
    .pipe(header("(function(){ \"use strict\"\n"))
    .pipe(footer("})();"))
    .pipe(gulpif(opts.sourcemaps, sourcemaps.init()))
      .pipe(gulpif(opts.minify, uglify()))
      .pipe(concat('code.js'))
    .pipe(gulpif(opts.sourcemaps, sourcemaps.write()))
    .pipe(gulp.dest('./build/'));
});

gulp.task('minify-js-deps', ['bower'], function() {
  return gulp.src(env.js_deps)
    .pipe(gulpif(opts.minify, uglify()))
    .pipe(concat('deps.js'))
    .pipe(gulp.dest('./build'));
});

gulp.task('minify-css-deps', ['bower'], function() {
  return gulp.src(env.css_deps)
    .pipe(gulpif(opts.minify, minifyCSS()))
    .pipe(concat('deps.css'))
    .pipe(gulp.dest('./build'));
});

gulp.task('minify-templates', function () {
  return gulp.src('./app/templates/**/*.html')
    .pipe(templateCache({module: "app"}))
    .pipe(gulp.dest('./build'));
});

gulp.task('html', function () {
  return gulp.src('./app/index.html')
    .pipe(gulp.dest('./build'));
});


gulp.task('build', ['bower', 'lint', 'minify-js', 'minify-js-deps', 'minify-css-deps', 'minify-css', 'minify-templates', 'html']);

gulp.task('server', ['build'], function () {
  gulp.watch('bower.json', ['bower', 'minify-js-deps', 'minify-css-deps']);
  gulp.watch('build.json', ['build']);

  gulp.watch(['app/scripts/**/*.js'], ['minify-js', 'jshint']);
  gulp.watch(['app/style/**/*.css', 'app/style/**/*.scss'], ['minify-css', 'csslint']);
  gulp.watch(['app/templates/**/*.html'], ['minify-templates']);

  gulp.watch(['app/index.html'], ['html']);

  livereload.listen({basePath: 'build'});

  gulp.watch(['build/**']).on('change', livereload.changed);

  connect.server({
    root: 'build/',
    port: 8080
  });
});
