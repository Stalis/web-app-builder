const path = require('path').posix;
const fs = require('fs');

const cwd = '.';

const paths = {
    webRoot: path.join(cwd, 'wwwroot'),
    nodeRoot: path.join(cwd, 'node_modules'),
};

paths.js = {
    root: path.join('js'),
    src: path.join(cwd, 'src', 'js'),
};

paths.css = {
    root: path.join('css'),
    src: path.join(cwd, 'src', 'css'),
};

const names = {
    js: {
        entry: 'index.js',
        common: 'common.js',
        vendor: 'vendor.js',
        bundle: 'bundle.js',
    },
    css: {
        entry: 'index.scss',
        common: 'common.scss',
        vendor: 'vendor.css',
        bundle: 'style.css',
    },
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

function scavengeFolder(baseFolder, fileName) {
    let folders = getFolders(baseFolder); 
    if (folders === null) {
        return {};
    }

    let sources = folders.map(folder => {
        let filePath = path.join(baseFolder, folder, fileName);
        if (fs.existsSync(filePath) === false) {
            return undefined;
        }

        return {
            name: folder,
            src: filePath,
        };
    }).filter(v => !!v);

    return sources;
}

function getCommonJs() {
    let file = path.join(paths.js.src, names.js.common);
    if (fs.existsSync(file)) {
        return file;
    }
}

function getJsSources() {
    let files = scavengeFolder(paths.js.src, names.js.entry);
    files.map(v => v.destFolder = path.join(paths.js.root, v.name));
    return files;
}

function getCommonCss() {
    let file = path.join(paths.css.src, names.css.common);
    if (fs.existsSync(file)) {
        return file;
    }
}

function getCssSources() {
    let files = scavengeFolder(paths.css.src, names.css.entry);
    files.map(v => v.destFolder = path.join(paths.css.root, v.name));
    return files;
}

module.exports = {
//export default {
    cwd: process.cwd(),
    paths: paths,
    names: names,
    commonJs: getCommonJs(),
    jsSources: getJsSources(),
    commonCss: getCommonCss(),
    cssSources: getCssSources(),
};