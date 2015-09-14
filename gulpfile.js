'use strict';

var gulp = require('gulp'),
	browserSync = require('browser-sync'),
	uglify = require('gulp-uglify'),
	concat = require('gulp-concat'),
	rename = require('gulp-rename'),
	minifyCss = require('gulp-minify-css'),
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

gulp.task('scripts', function(){
	gulp.src(src.js) //, {base: 'src'})
	  .pipe(concat('all.js'))
		.pipe(uglify())
		.pipe(rename('app.min.js'))
		.pipe(gulp.dest(dest.js))
    .pipe(reload({stream: true}));
});

gulp.task('html', function(){
	gulp.src(src.html)
		.pipe(gulp.dest(dest.html))
    .pipe(reload({stream: true}));
});

gulp.task('sass', function () {
  gulp.src(src.css)
    .pipe(sass().on('error', sass.logError))
    .pipe(minifyCss())
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