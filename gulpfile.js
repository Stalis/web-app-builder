///<binding BeforeBuild='build' Clean='clean' />
"use strict"

// Единственное, что стоит менять в этом файле. Если true - то все неминифицировано, можно красиво и спокойно отлаживать, false - все упаковано, минифицировано, ток для продакшна
const debug = true;
const version = "0.2";

(function() {
    const headerWidth = 81;
    const headerChar = '=';
    const fullLine = new Array(headerWidth).fill(headerChar).join('');

    const header =  `Gulp Web App Builder By Stalis v${version}`;
    
    const headerSide = new Array(Math.round((headerWidth - header.length - 2) / 2)).fill(headerChar).join('');
    const headerLine = `${headerSide} ${header} ${headerSide}`;

    console.log(fullLine);
    console.log(headerLine);
    console.log(fullLine);
})();

const fs = require('fs');
const path = require('path').posix;
const resolve = require('resolve');

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


const buildrc = fs.existsSync('.buildrc') 
                    ? JSON.parse(fs.readFileSync('.buildrc')) 
                    : { aliases: {} };
const packageJson = JSON.parse(fs.readFileSync('./package.json'));
const packageDependencies = Object.keys(packageJson.dependencies)                           // get dependencies names
                                  .concat(Object.keys(buildrc.aliases))                     // merge aliases
                                  .filter((item, pos, arr) => arr.indexOf(item) === pos);   // de-duplication

const vendorCss = buildrc.vendorCss;

const paths = {
    webRoot: path.join(__dirname, 'wwwroot'),
    nodeRoot: path.join(__dirname, 'node_modules'),
};

paths.js = {
    root: path.join(paths.webRoot, 'dist', 'js'),
    src: path.join(paths.webRoot, 'src', 'js'),
};

paths.css = {
    root: path.join(paths.webRoot, 'dist', 'css'),
    src: path.join(paths.webRoot, 'src', 'css'),
};

const names = {
    js: {
        entry: 'index.js',
        common: 'common.js',
        vendor: 'vendor.js',
        bundle: 'bundle.js',
    },
    css: {
        entry: 'index.css',
        common: 'common.css',
        vendor: 'vendor.css',
        bundle: 'style.css',
    },
};

const browserify_config = {
    debug: debug,
    transform: [
        babelify.configure({
            presets: ['@babel/preset-env'],
            sourceMapsAbsolute: debug,
        }),
        debug ? undefined : 'uglifyify',
    ],
};

function getFolders(dir) {
    try {
        return fs.readdirSync(dir)
            .filter(function (file) {
                return fs.statSync(path.join(dir, file)).isDirectory();
            });
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error(`No directory: ${dir}`)
        } else {
            console.error(err);
        }
        return null;
    }
}

function resolveLib(lib) {
    let toResolve = lib;

    if (!!buildrc.aliases) {
        if (!!buildrc.aliases[lib]) {
            toResolve = buildrc.aliases[lib];
        }
    }

    return resolve.sync(toResolve);
}

gulp.task('build:js:vendor', function () {
    let b = browserify(browserify_config);

    let commonJs = path.join(paths.js.src, names.js.common);
    if (fs.existsSync(commonJs)) {
        b.add(commonJs);
    }

    packageDependencies.forEach(lib => b.require(resolveLib(lib), { expose: lib, transform: false }));
    
    return b.bundle()
        .pipe(source(names.js.vendor))
        .pipe(gulp.dest(paths.js.root));
});

gulp.task('build:js:apps', function () {
    let folders = getFolders(paths.js.src);
    if (folders === null) {
        return gulp.src('.').pipe(nop());
    }

    let tasks = folders.map(folder => {
        let srcJsPath = path.join(paths.js.src, folder, names.js.entry);
        if (fs.existsSync(srcJsPath) === false) {
            return gulp.src('.').pipe(nop());
        }

        let destFolderPath = path.join(paths.js.root, folder);

        let b = browserify(srcJsPath, browserify_config);
        b.external(packageDependencies);

        return b.bundle()
            .pipe(source(names.js.bundle))
            .pipe(gulp.dest(destFolderPath));
    });

    return merge(tasks);
});



gulp.task('build:css:vendor', function () {
    let vendorCssPaths = vendorCss?.map(p => resolve.sync(p)) ?? [];

    let commonCss = path.join(paths.css.src, names.css.common);
    if (fs.existsSync(commonCss)) {
        console.log(commonCss);
        vendorCssPaths.push(resolve.sync(commonCss));
    }
    if (vendorCssPaths.length === 0) {
        return gulp.src('.').pipe(nop());
    }

    return gulp.src(vendorCssPaths)
        .pipe(concat(names.css.vendor))
        .pipe(cleanCSS({ debug: debug }))
        .pipe(gulp.dest(paths.css.root));
});

gulp.task('build:css:apps', function () {
    let folders = getFolders(paths.css.src);
    if (folders === null) {
        return gulp.src('.').pipe(nop());
    }

    let tasks = folders.map(folder => {
        
        let srcCssPath = path.join(paths.css.src, folder, names.css.entry);
        if (fs.existsSync(srcCssPath) === false) {
            return gulp.src('.').pipe(nop());
        }

        let destFolderPath = path.join(paths.css.root, folder);
        
        return gulp.src(srcCssPath)
            .pipe(concat(names.css.bundle))
            .pipe(cleanCSS({ debug: debug }))
            .pipe(gulp.dest(destFolderPath));
    })
    return merge(tasks);
});



gulp.task('watch:js', function () {
    gulp.watch(path.join(paths.js.src, '**', '*.js'), gulp.series('build:js:apps'));
});

gulp.task('watch:css', function () {
    gulp.watch(path.join(paths.css.src, '**', '*.css'), gulp.series(['build:css:apps']));
});

gulp.task('clean:js', function (cb) {
    rimraf(paths.js.root, cb);
});

gulp.task('clean:css', function (cb) {
    rimraf(paths.css.root, cb);
});

gulp.task('clean', gulp.parallel(['clean:js', 'clean:css' ]));

gulp.task('build:js', gulp.parallel(['build:js:vendor', 'build:js:apps']));
gulp.task('build:css', gulp.parallel([ 'build:css:vendor', 'build:css:apps' ]));
gulp.task('build', gulp.parallel(['build:js', 'build:css' ]));