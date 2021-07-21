///<binding BeforeBuild='build' Clean='clean' />
"use strict"

// Единственное, что стоит менять в этом файле. Если true - то все неминифицировано, можно красиво и спокойно отлаживать, false - все упаковано, минифицировано, ток для продакшна
const debug = process.argv.indexOf('--debug') >= 0;
const version = "0.4";

(function () {
    const headerWidth = 81;
    const headerChar = '=';
    const fullLine = new Array(headerWidth).fill(headerChar).join('');

    const header = `Gulp Web App Builder By Stalis v${version}`;

    const headerSide = new Array(Math.round((headerWidth - header.length - 2) / 2)).fill(headerChar).join('');
    const headerLine = `${headerSide} ${header} ${headerSide}`;

    console.log(fullLine);
    console.log(headerLine);
    console.log(fullLine);
    
    if (debug) {
        const buildMsg = 'DEVELOPMENT Build';
        const buildMsgSide = new Array(Math.round((headerWidth - buildMsg.length - 2) / 2)).fill(headerChar).join('');
        console.log(`\x1b[31m${buildMsgSide} ${buildMsg} ${buildMsgSide}\x1b[0m`);
    }
})();

const fs = require('fs');
const path = require('path').posix;
const resolve = require('resolve');

const { cwd, paths, names, jsSources, cssSources } = require('./.jsbuild/scavenger');

const gulp = require('gulp');
const nop = require('gulp-nop');
const concat = require('gulp-concat');
const cleanCSS = require('gulp-clean-css');
const merge = require('merge-stream');
const source = require('vinyl-source-stream');
const rimraf = require('rimraf');
const sass = require('gulp-sass');
sass.compiler = require('sass');

const browserify = require('browserify');
const babelify = require('babelify');

const _merge = require('lodash/merge');
const _get = require('lodash/get');

const defaulConfig = {
    aliases: {},
    modulesConfig: {
        '.default': {
            mode: 'bundle',
        },
    },
};
const buildrc = fs.existsSync('.buildrc') ? JSON.parse(fs.readFileSync('.buildrc')) : null;

const config = _merge(defaulConfig, buildrc); 

const packageJson = JSON.parse(fs.readFileSync('./package.json'));
const packageDependencies = Object.keys(packageJson.dependencies)  // get dependencies names
    .concat(Object.keys(config.aliases))                           // merge aliases
    .filter((item, pos, arr) => arr.indexOf(item) === pos);        // de-duplication

const vendorCss = config.vendorCss;

if (!!config.paths && !!config.paths.dist) {
    paths.js.root = path.join(cwd, config.paths.dist, paths.js.root);
    paths.css.root = path.join(cwd, config.paths.dist, paths.css.root);
    jsSources.forEach(v => v.destFolder = path.join(paths.js.root, v.name));
    cssSources.forEach(v => v.destFolder = path.join(paths.css.root, v.name));
}

const browserify_config = {
    debug: debug,
    transform: [
        babelify.configure({
            presets: ['@babel/preset-env'],
            sourceMapsAbsolute: debug,
            plugins: [ 'babel-plugin-transform-async-to-promises' ],
        }),
        'vueify',
    ],
};

function uglifyIfDebug(b) {
    return debug === true
           ? b
           : b.transform({ global: true }, 'uglifyify');
}

function resolveLib(lib) {
    let toResolve = lib;

    if (!!config.aliases) {
        if (!!config.aliases[lib]) {
            toResolve = config.aliases[lib];
        }
    }

    return resolve.sync(toResolve);
}

exports.buildJsVendor = function buildJsVendor() {
    let b = browserify(browserify_config);

    let commonJs = path.join(cwd, paths.js.src, names.js.common);
    if (fs.existsSync(commonJs)) {
        b.add(commonJs);
    }

    packageDependencies.forEach(lib => b.require(resolveLib(lib), { expose: lib, transform: false }));

    return b
        .plugin(uglifyIfDebug)
        .bundle()
        .pipe(source(names.js.vendor))
        .pipe(gulp.dest(paths.js.root));
};

exports.buildJsApps = function buildJsApps() {
    if (jsSources === null) {
        return gulp.src('.').pipe(nop());
    }

    let tasks = jsSources.map(jsModule => {
        const mode = _get(config, `modulesConfig.${jsModule.name}.mode`, 
                        config.modulesConfig['.default'].mode
        );

        let b = browserify(browserify_config);

        if (mode === 'standalone') {
            let commonJs = path.join(cwd, paths.js.src, names.js.common);
            if (fs.existsSync(commonJs)) {
                b.add(commonJs);
            }
        }

        b.add(jsModule.src);
        
        if (mode !== 'standalone') {
            b.external(packageDependencies);
        }

        if (debug) {
            console.log(`${jsModule.src} => ${jsModule.destFolder}`);
        }

        return b
            .plugin(uglifyIfDebug)
            .bundle()
            .pipe(source(names.js.bundle))
            .pipe(gulp.dest(jsModule.destFolder));
    });

    return merge(tasks);
};

exports.buildCssVendor = function buildCssVendor() {
    let vendorCssPaths = !!vendorCss
        ? vendorCss.map(p => resolve.sync(p))
        : [];

    let commonCss = path.join(cwd, paths.css.src, names.css.common);
    if (fs.existsSync(commonCss)) {
        vendorCssPaths.push(resolve.sync(commonCss));
    }
    if (vendorCssPaths.length === 0) {
        return gulp.src('.').pipe(nop());
    }

    return gulp.src(vendorCssPaths)
        .pipe(sass({
            includePaths: ['node_modules/'],
            quietDeps: true,
        }).on('error', sass.logError))
        .pipe(concat(names.css.vendor))
        .pipe(cleanCSS({ debug: debug }))
        .pipe(gulp.dest(paths.css.root));
};

exports.buildCssApps = function buildCssApps() {
    if (cssSources === null) {
        return gulp.src('.').pipe(nop());
    }

    let tasks = cssSources.map(cssModule => {
        if (debug) {
            console.log(`${cssModule.src} => ${cssModule.destFolder}`);
        }

        return gulp.src(cssModule.src)
            .pipe(sass({
                includePaths: ['node_modules/'],
                quietDeps: true,
            }).on('error', sass.logError))
            .pipe(concat(names.css.bundle))
            .pipe(cleanCSS({ debug: debug }))
            .pipe(gulp.dest(cssModule.destFolder));
    });

    return merge(tasks);
};

exports.watchJs = function watchJs() {
    gulp.watch(path.join(paths.js.src, '**', '*.js'), { ignoreInitial: false }, exports.buildJsApps);
};

exports.watchCss = function watchCss() {
    gulp.watch(path.join(paths.css.src, '**', '*.scss'), { ignoreInitial: false }, exports.buildCssApps);
};

exports.cleanJs = function cleanJs(cb) {
    rimraf(paths.js.root, cb);
};

exports.cleanCss = function cleanCss(cb) {
    rimraf(paths.css.root, cb);
};

exports.buildJs = gulp.parallel([exports.buildJsVendor, exports.buildJsApps]);
exports.buildCss = gulp.parallel([exports.buildCssVendor, exports.buildCssApps]);

exports.clean = gulp.parallel(exports.cleanJs, exports.cleanCss);
exports.build = gulp.parallel(exports.buildJs, exports.buildCss);

exports.buildSync = gulp.series([exports.buildJsVendor, exports.buildJsApps, exports.buildCssVendor, exports.buildCssApps]);

exports.default = gulp.series(exports.clean, exports.build);