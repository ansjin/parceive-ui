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
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('default', ['server']);

gulp.task('bower', function() {
  return bower();
});

gulp.task('jshint', function() {
  return gulp.src(['./app/**/*.js', '!./app/bower_components/**'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('csslint', function() {
  return gulp.src('client/styles/**/*.css')
    .pipe(csslint())
    .pipe(csslint.reporter());
});

gulp.task('lint', ['jshint', 'csslint'])

gulp.task('clean', function() {
    return gulp.src(['./build/', './dist/*', './app/bower_components'])
      .pipe(clean({force: true}));
});

gulp.task('minify-css', function() {
  return gulp.src(['./app/style/**/*.css', '!./app/bower_components/**'])
    //.pipe(minifyCSS({
    //  comments: true,
    //  spare:true
    //}))
    .pipe(sourcemaps.init())
      .pipe(concat('style.css'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./build/'))
});

gulp.task('minify-js', function() {
  return gulp.src(['./app/scripts/**/*.js'])
    //.pipe(uglify({
    //  mangle: false,
    //  compress: false,
    //  preserveComments: 'all',
    //  outSourceMap: 'code.js.map'
    //}))
    .pipe(sourcemaps.init())
      .pipe(concat('code.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./build/'))
});

gulp.task('minify-js-deps', ['bower'], function() {
  return gulp.src([
      './app/bower_components/jquery/dist/jquery.min.js', 
      './app/bower_components/angular/angular.min.js',
      './app/bower_components/angular/angular-route.min.js', 
      './app/bower_components/d3/d3.min.js'
    ])
    .pipe(concat('deps.js'))
    .pipe(gulp.dest('./build'))
}); 


gulp.task('minify-templates', function () {
  return gulp.src('./app/templates/**/*.html')
    .pipe(templateCache())
    .pipe(gulp.dest('./build'));
});

gulp.task('html', function () {
  return gulp.src('./app/index.html')
    .pipe(gulp.dest('./build'))
});


gulp.task('build', ['bower', 'minify-js', 'minify-js-deps', 'minify-css', 'minify-templates', 'html']);

gulp.task('server', ['build'], function () {
  gulp.watch('bower.json', ['bower', 'minify-js-deps', 'minify-css-deps']);

  gulp.watch(['./app/scripts/**/*.js'], ['minify-js']);
  gulp.watch(['./app/style/**/*.css'], ['minify-css']);
  gulp.watch(['./app/templates/**/*.css'], ['minify-templates']);

  gulp.watch(['./app/index.html'], ['html']);

  livereload.listen({basePath: 'build'});

  gulp.watch(['build/**']).on('change', livereload.changed);

  connect.server({
    root: 'build/',
    port: 8080
  });
});
