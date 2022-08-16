const asar = require('asar');
const path = require('path');
const fs = require('fs');
const os = require('os');
const rimraf = require('rimraf');

module.exports = (dir, extractPath) => {
	let code = os.platform() === 'win32'
		? fs.readFileSync(path.join(extractPath, 'app_bootstrap', 'bootstrap.js')).toString()
		: fs.readFileSync(path.join(extractPath, 'app', 'mainScreen.js')).toString();
	let js = fs
		.readdirSync(path.join(path.dirname(__dirname), 'scripts'))
		.filter(name => !name.startsWith('!'))
		.filter(name => name.endsWith('.js'))
		.map(file => {
			return fs.readFileSync(path.join(path.dirname(__dirname), 'scripts', file));
		})
		.join('\n')
		.replace(/\\/g, '\\\\')
		.replace(/\`/g, '\\\`')
		.replace(/\${/g, '\\${');
	let css = fs
		.readdirSync(path.join(path.dirname(__dirname), 'styles'))
		.filter(name => !name.startsWith('!'))
		.filter(name => name.endsWith('.css'))
		.map(file => {
			return fs.readFileSync(path.join(path.dirname(__dirname), 'styles', file));
		})
		.join('\n')
		.replace(/\\/g, '\\\\')
		.replace(/\`/g, '\\\`')
		.replace(/\${/g, '\\${')
		.replace(/\*(\w+)/g, '[class*="$1-"]');

	code = code.replace(/function startApp\(\) {/, `
		app.on('web-contents-created', (_, webContents) => {
			webContents.executeJavaScript('console.log("autorun?");');

			webContents.executeJavaScript(\`${js}\`);

			webContents.executeJavaScript(\`console.log(\\\`${css}\\\`)\`);

			webContents.executeJavaScript(\`
				let style = document.createElement('style');
				style.type = 'text/css';
				style.rel = 'stylesheet';
				document.head.appendChild(style);
				style.textContent = \\\`${css}\\\`;
			\`);
		});

		$&
	`);

	// code = code.replace(/mainWindow.minimize[^}]+}/, `$&

	// 	_electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
	// 		const keys = Object.keys(details).join('|');
	// 		const serialized = JSON.stringify(details);

	// 		if (details.responseHeaders['content-security-policy']) {
	// 			details.responseHeaders['content-security-policy'] = details.responseHeaders['content-security-policy'];
	// 		}

	// 		callback(details);
	// 	});

	// 	mainWindow.webContents.executeJavaScript('console.log("autorun?????");');

	// 	mainWindow.webContents.executeJavaScript(\`${js}\`);

	// 	mainWindow.webContents.executeJavaScript(\`console.log(\\\`${css}\\\`)\`);

	// 	mainWindow.webContents.executeJavaScript(\`
	// 		let style = document.createElement('style');
	// 		style.type = 'text/css';
	// 		style.rel = 'stylesheet';
	// 		document.head.appendChild(style);
	// 		style.textContent = \\\`${css}\\\`;
	// 	\`);
	// `);

	if (os.platform() === 'win32') {
		fs.writeFileSync(path.join(extractPath, 'app_bootstrap', 'bootstrap.js'), code);

		asar.createPackage(extractPath, path.join(dir, 'resources', 'app.asar')).then(() => {
			console.log('Patched!');
			// rimraf.sync(extractPath);
		});
	} else {
		code = code.replace(/mainWindow.minimize[^}]+}/, `$&

			_electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
				// const keys = Object.keys(details).join('|');
				// const serialized = JSON.stringify(details);

				if (details.responseHeaders['content-security-policy']) {
					details.responseHeaders['content-security-policy'] = details.responseHeaders['content-security-policy'];
				}

				callback(details);
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
			\`);
		`);

		fs.writeFileSync(path.join(extractPath, 'app', 'mainScreen.js'), code);

		asar.createPackage(extractPath, path.join(dir, 'modules', 'discord_desktop_core', 'core.asar')).then(() => {
			console.log('Patched!');
			rimraf.sync(extractPath);
		});
	}
};
