// gulp
var gulp = require('gulp');

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

gulp.task('default', ['server']);

gulp.task('bower', function() {
  return bower();
});

gulp.task('jshint', function() {
  gulp.src(['./app/**/*.js', '!./app/bower_components/**'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('csslint', function() {
  gulp.src('client/styles/**/*.css')
    .pipe(csslint())
    .pipe(csslint.reporter());
});

gulp.task('lint', ['jshint', 'csslint'])

gulp.task('clean', function() {
    gulp.src(['./build/', './dist/*', './app/bower_components'])
      .pipe(clean({force: true}));
});

gulp.task('minify-css', function() {
  gulp.src(['./app/**/*.css', '!./app/bower_components/**'])
    .pipe(minifyCSS({
      comments: true,
      spare:true
    }))
    .pipe(gulp.dest('./build/'))
});

gulp.task('minify-js', function() {
  gulp.src(['./app/**/*.js', '!./app/bower_components/**'])
    .pipe(uglify({
      mangle: false,
      compress: false,
      preserveComments: 'all',
      outSourceMap: 'out.js.map'
    }))
    .pipe(gulp.dest('./build/'))
});

gulp.task('templates', function () {
    gulp.src('./app/templates/**/*.html')
        .pipe(templateCache())
        .pipe(gulp.dest('./build'));
});

gulp.task('html', function () {
  gulp.src('./app/index.html')
    .pipe(gulp.dest('./build'))
});


gulp.task('build', ['lint', 'minify-js', 'minify-css', 'templates', 'html']);

gulp.task('server', ['build'], function () {
  gulp.watch('bower.json', ['bower']);
  gulp.watch('app/**', ['build']);

  livereload.listen({basePath: 'build'});

  gulp.watch(['build/**']).on('change', livereload.changed);

  connect.server({
    root: 'build/',
    port: 8080
  });
});
