var args        = require('yargs').argv;
var browserSync = require('browser-sync');
var config      = require('./gulp.config')();
var del         = require('del');
var glob        = require('glob');
var gulp        = require('gulp');
var path        = require('path');
var _           = require('lodash');
var $           = require('gulp-load-plugins')({lazy: true});

var colors = $.util.colors;
var envenv = $.util.env;
var port   = process.env.PORT || config.defaultPort;

/**
 * yargs variables can be passed in to alter the behavior, when present.
 * Example: gulp serve
 *
 * --verbose  : Various tasks will produce more output to the console.
 * --nosync   : Don't launch the browser with browser-sync when serving code.
 * --debug    : Launch debugger with node-inspector.
 * --debug-brk: Launch debugger and break on 1st line with node-inspector.
 * --startServers: Will start servers for midway tests on the test task.
 */

/**
 * List the available gulp tasks
 */
gulp.task('help', $.taskListing);
gulp.task('default', ['help']);

/***************************************************************************************************
 * Code Validation
 **************************************************************************************************/

/**
 * vet the code and create coverage report
 * @return {Stream}
 */
gulp.task('vet', function() {
    log('Analyzing source with JSHint and JSCS');

    return gulp
        .src(config.alljs)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {verbose: true}))
        .pipe($.jshint.reporter('fail'))
        .pipe($.jscs());
});

/**
 * serve the dev environment
 * --debug-brk or --debug
 * --nosync
 */
gulp.task('serve-dev', function() {
    var msg = '\n\n************************\nYou should use npm start\n************************\n';
    log(msg, 'error');
});

/**
 * Serve-dev alias
 */
gulp.task('serve', ['serve-dev']);

/***************************************************************************************************
 * Versioning
 **************************************************************************************************/

/**
 * Bump the version
 * --type=pre will bump the prerelease version *.*.*-x
 * --type=patch or no flag will bump the patch version *.*.x
 * --type=minor will bump the minor version *.x.*
 * --type=major will bump the major version x.*.*
 * --version=1.2.3 will bump to a specific version and ignore other flags
 */
gulp.task('bump', function() {
    var msg     = 'Bumping versions';
    var type    = args.type;
    var version = args.ver;
    var options = {};
    if(version) {
        options.version = version;
        msg += ' to ' + version;
    } else {
        options.type = type;
        msg += ' for a ' + type;
    }
    log(msg);

    return gulp
        .src(config.packages)
        .pipe($.print())
        .pipe($.bump(options))
        .pipe(gulp.dest(config.root));
});

/***************************************************************************************************
 * Utility Functions
 **************************************************************************************************/

/**
 * Log a message or series of messages using chalk's blue color.
 * Can pass in a string, object or array.
 */
function log(msg, type) {
    var color;

    switch(type) {
        case 'error':
            color = 'red';
            break;
        case 'success':
            color = 'green';
            break;
        default:
            color = 'blue';
            break;
    }

    if(typeof(msg) === 'object') {
        for(var item in msg) {
            if(msg.hasOwnProperty(item)) {
                $.util.log($.util.colors[color](msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors[color](msg));
    }
}

module.exports = gulp;
