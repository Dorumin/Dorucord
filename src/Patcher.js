const os = require('node:os');
const fs = require('node:fs/promises');
const path = require('node:path');
const asar = require('asar');
const balanced = require('balanced-match');
const recursiveReadDir = require('recursive-readdir');

class DorucordPatcher {
    async patch(extractedPath) {
        const split = this.split(extractedPath);

        if (this.isWin()) {
            if (split[split.length - 4] === 'modules') {
                await this.patchCore(extractedPath);
            } else if (split[split.length - 2] === 'resources') {
                await this.patchApp(extractedPath);
            }
        } else {
            if (split[split.length - 3] === 'modules') {
                await this.patchCore(extractedPath);
                await this.patchApp(extractedPath);
            }
        }
    }

    async patchCore(extractedPath) {
        const split = this.split(extractedPath);
        // Only core module supported for now
        if (this.isWin()) {
            if (!split[split.length - 3].startsWith('discord_desktop_core')) return;
        } else {
            if (!split[split.length - 2].startsWith('discord_desktop_core')) return;
        }

        const appPath = path.join(extractedPath, 'app');
        const appPathChildren = await fs.readdir(appPath);
        const scripts = appPathChildren.filter(fileName => fileName.endsWith('.js'));
        const scriptsWithContent = await Promise.all(scripts.map(async scriptName => {
            const scriptPath = path.join(appPath, scriptName);
            const contents = await fs.readFile(scriptPath, {
                encoding: 'utf8'
            });

            return {
                path: scriptPath,
                text: contents
            };
        }));

        await Promise.all(scriptsWithContent.map(script => this.patchScript(script)));

        await asar.createPackage(extractedPath, path.join(extractedPath, '..', 'core.asar'));
    }

    async loadPlugin(plugin) {
        const pluginPath = path.join(path.dirname(__dirname), 'plugins', plugin);
        const pluginChildren = await recursiveReadDir(pluginPath)
        const pluginFiles = await Promise.all(pluginChildren.map(async scriptPath => {
            const scriptName = path.basename(scriptPath);
            const contents = await fs.readFile(scriptPath, {
                encoding: 'utf8'
            });

            return {
                path: scriptPath,
                name: scriptName,
                text: contents,
                type: path.extname(scriptName).slice(1).toLowerCase()
            };
        }));

        return {
            plugin,
            files: pluginFiles
        };
    }

    async patchApp(extractedPath) {
        const codePath = this.isWin()
            ? path.join(extractedPath, 'app_bootstrap', 'bootstrap.js')
            : path.join(extractedPath, 'app', 'mainScreen.js');

        const code = await fs.readFile(codePath, {
            encoding: 'utf8'
        });
        const pluginsList = await fs.readdir(path.join(path.dirname(__dirname), 'plugins'));
        const plugins = await Promise.all(pluginsList.map(plugin => this.loadPlugin(plugin)));
        const scripts = await fs.readdir(path.join(path.dirname(__dirname), 'scripts'));
        const styles = await fs.readdir(path.join(path.dirname(__dirname), 'styles'));
        const scriptsContents = await Promise.all(scripts
            .filter(name => !name.startsWith('!'))
            .filter(name => name.endsWith('.js'))
            .map(file => {
                return fs.readFile(path.join(path.dirname(__dirname), 'scripts', file), {
                    encoding: 'utf8'
                });
            })
        );
        const stylesContents = await Promise.all(styles
            .filter(name => !name.startsWith('!'))
            .filter(name => name.endsWith('.css'))
            .map(file => {
                return fs.readFile(path.join(path.dirname(__dirname), 'styles', file), {
                    encoding: 'utf8'
                });
            })
        );
        const jsInject = this.makeInjectable(scriptsContents.join(''));
        const cssInject = this.makeInjectable(stylesContents.join(''), `
            let style = document.createElement('style');
            style.type = 'text/css';
            style.rel = 'stylesheet';
            style.className = 'dorucord-main-stylesheet';
            style.textContent = <injected-content>;
            document.head.appendChild(style);
        `);
        const pluginsInject = this.makeInjectable(plugins, `window._plugins = <injected-content>;`);

        // require('electron').contextBridge.exposeInMainWorld('exposetest', 'test');
        let replacedCode;

        if (this.isWin()) {
            replacedCode = code.replace(/function startApp\(\) {/, `
                app.on('web-contents-created', (_, webContents) => {
                    webContents.executeJavaScript('console.log("Dorucord injection successful");');

                    webContents.executeJavaScript(${pluginsInject});
                    webContents.executeJavaScript(${jsInject});
                    webContents.executeJavaScript(${cssInject});
                });

                $&
            `);
        } else {
            replacedCode = code.replace(/mainWindow.minimize[^}]+}/, `$&

                mainWindow.webContents.executeJavaScript('console.log("Dorucord injection successful");');

                mainWindow.webContents.executeJavaScript(${pluginsInject});
                mainWindow.webContents.executeJavaScript(${jsInject});
                mainWindow.webContents.executeJavaScript(${cssInject});
            `);
        }

        // if (replacedCode !== code) {
        //     console.log('Updating app successful');
        // }

    	await fs.writeFile(codePath, replacedCode);

        if (this.isWin()) {
            await asar.createPackage(extractedPath, path.join(extractedPath, '..', 'app.asar'));
        } else {
            await asar.createPackage(extractedPath, path.join(extractedPath, '..', 'core.asar'));
        }
    }

    isWin() {
        return os.platform() === 'win32';
    }

    makeInjectable(injectable, wrapper) {
        // Make stringified JS-interpretable object of injection
        // Can be an object or a string. String will be "wrapped"
        const injected = JSON.stringify(injectable);

        if (!wrapper) {
            return injected;
        } else {
            const expanded = JSON.stringify(wrapper.replace('<injected-content>', injected));

            return expanded;
        }
    }

    wrapJavaScript(code) {
        // Make sure passed in code is valid, or else the errors will be confusing af
        return `(function() { ${code} })();`
    }

    async patchScript(script) {
        // console.log(`Patching script: ${script.path}`);

        // TODO: Patching core's webPreferences does not work. Not sure why.
        // Instead, we patch settings.json to enable devtools the official way
        const indexOfWebPrefs = script.text.indexOf('webPreferences:');
        let changedText = false;
        if (indexOfWebPrefs !== -1) {
            const match = balanced('{', '}', script.text.slice(indexOfWebPrefs));
            if (!match) return;

            // match.start is the start of body, therefore does not account for starting {
            let replacedBody = '{' + match.body.trimEnd().replace(/,$/, '') + `,\n/***DORUCORD***/\nnodeIntegration: true, devTools: true }`;

            // match.end is the end of body, therefore we need to + 1 to skip final }
            // alternatively, we could have not included it in replacedBody
            script.text = script.text.slice(0, indexOfWebPrefs + match.start) + replacedBody + script.text.slice(indexOfWebPrefs + match.end + 1);
            changedText = true;
        }

        // Expose require to render process
        const indexOfExposure = script.text.indexOf('contextBridge.exposeInMainWorld');
        if (indexOfExposure !== -1) {
            // console.log(`Found exposure: ${script.path}`);
            const exposeScript = `
                /* DORUCORD EXPOSURE */
                contextBridge.exposeInMainWorld('require', require);
                contextBridge.exposeInMainWorld('process', {
                    _rawKeys: Object.keys(process),
                    pid: process.pid,
                    ppid: process.ppid,
                    // process.env explodes contextBridge when exposing
                    env: Object.assign({}, process.env),
                    kill: process.kill,
                    exit: process.exit,
                    cwd: process.cwd,
                    features: process.features,
                    config: process.config,
                    title: process.title
                });
            `;
            script.text = script.text.slice(0, indexOfExposure) + exposeScript + script.text.slice(indexOfExposure);
            changedText = true;
        }

        if (changedText) {
            await fs.writeFile(script.path, script.text);
        }
    }

    split(extractedPath) {
        const split = extractedPath.split(path.sep);

        return split;
    }
}

module.exports = DorucordPatcher;
