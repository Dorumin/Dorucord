const asar = require('asar');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

module.exports = (dir, extractPath) => {
    let window = fs.readFileSync(path.join(extractPath, 'app', 'mainScreen.js')).toString();

    if (!window.includes('autorun')) {

        let js = fs
            .readdirSync(path.join(process.cwd(), 'scripts'))
            .map(file => {
                return fs.readFileSync(path.join(process.cwd(), 'scripts', file));
            })
            .join('\n')
            .replace(/\\/g, '\\\\')
            .replace(/\`/g, '\\\`')
            .replace(/\${/g, '\\${');

        window = window.replace(/mainWindow.minimize[^}]+}/, `$&

            _electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
                callback({
                    responseHeaders: {
                        ...details.responseHeaders,
                        'content-security-policy': 'default-src *'
                    },
                });
            });
            
            mainWindow.webContents.executeJavaScript('console.log("autorun?????");');

            mainWindow.webContents.executeJavaScript(\`${js}\`);
        `);

        fs.writeFileSync(path.join(extractPath, 'app', 'mainScreen.js'), window);
    }

    asar.createPackage(extractPath, path.join(dir, 'modules', 'discord_desktop_core', 'core.asar')).then(() => {
        console.log('Patched!');
        rimraf.sync(extractPath);
    });
};