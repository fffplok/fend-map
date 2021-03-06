'use strict';

var gulp = require('gulp'),
	browserSync = require('browser-sync'),
	uglify = require('gulp-uglify'),
	concat = require('gulp-concat'),
	rename = require('gulp-rename'),
	sass = require('gulp-sass'),

	reload = browserSync.reload,

	src = {
		js: './src/js/*.js',
		css: './src/scss/*.scss',
		html: './src/index.html',
		proxy: 'localhost/udacity/fend-map/dist'
	},

	dest = {
		js: './dist/js',
		css: './dist/css',
		html: './dist'
	};

function logError(err) {
	console.log(err);
	this.emit('end');
}

gulp.task('scripts', function(){
	gulp.src(src.js)
	  .pipe(concat('all.js'))
		.pipe(uglify())
		.pipe(rename('app.min.js'))
		.pipe(gulp.dest(dest.js))
    .pipe(reload({stream: true}));
});

gulp.task('html', function(){
	gulp.src(src.html)
		.pipe(gulp.dest(dest.html));
    //.pipe(reload({stream: true}));
});

gulp.task('sass', function () {
  gulp.src(src.css)
    .pipe(sass({outputStyle: 'compressed'}).on('error', logError)) //sass.logError))
    .pipe(rename('styles.min.css'))
    .pipe(gulp.dest(dest.css))
    .pipe(reload({stream: true}));
});

gulp.task('serve', ['html','sass','scripts'], function() {
    // proxy server
    browserSync.init({
        proxy: src.proxy
    });

  gulp.watch(src.html, ['html']);
  gulp.watch(src.css, ['sass']);
  gulp.watch(src.js, ['scripts']);
});

gulp.task('default', ['serve']);