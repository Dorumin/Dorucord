const asar = require('asar');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

module.exports = (dir, extractPath) => {
    let window = fs.readFileSync(path.join(extractPath, 'app', 'mainScreen.js')).toString();
    let js = fs
        .readdirSync(path.join(path.dirname(__dirname), 'scripts'))
        .map(file => {
            return fs.readFileSync(path.join(path.dirname(__dirname), 'scripts', file));
        })
        .join('\n')
        .replace(/\\/g, '\\\\')
        .replace(/\`/g, '\\\`')
        .replace(/\${/g, '\\${');
    let css = fs
        .readdirSync(path.join(path.dirname(__dirname), 'styles'))
        .map(file => {
            return fs.readFileSync(path.join(path.dirname(__dirname), 'styles', file));
        })
        .join('\n')
        .replace(/\\/g, '\\\\')
        .replace(/\`/g, '\\\`')
        .replace(/\${/g, '\\${')
        .replace(/\*(\w+)/g, '[class*="$1-"]');


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

        mainWindow.webContents.executeJavaScript(\`console.log(\\\`${css}\\\`)\`);

        mainWindow.webContents.executeJavaScript(\`
            let style = document.createElement('style');
            style.type = 'text/css';
            style.rel = 'stylesheet';
            document.head.appendChild(style);
            style.textContent = \\\`${css}\\\`;
            for (let rule of style.sheet.rules) {
                if (!rule.selectorText.includes('#app-mount')) {
                    rule.selectorText = '#app-mount ' + rule.selectorText
                }
            }
        \`);
    `);

    fs.writeFileSync(path.join(extractPath, 'app', 'mainScreen.js'), window);

    asar.createPackage(extractPath, path.join(dir, 'modules', 'discord_desktop_core', 'core.asar')).then(() => {
        console.log('Patched!');
        rimraf.sync(extractPath);
    });
};