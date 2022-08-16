const path = require('path');
const fs = require('fs');
const asar = require('asar');
const os = require('os');

module.exports = (dir) => {
	if (os.platform() === 'win32') {
		const corePath = path.join(dir, 'resources')
		const extractPath = path.join(corePath, 'extracted');
		let asarPath = path.join(corePath, 'backup.app.asar');
		if (!fs.existsSync(asarPath)) {
			fs.copyFileSync(path.join(corePath, 'app.asar'), asarPath);
		}

		asar.extractAll(asarPath, extractPath);
		return extractPath;
	} else {
		const corePath = path.join(dir, 'modules', 'discord_desktop_core');
		const extractPath = path.join(corePath, 'extracted');
		let asarPath = path.join(corePath, 'backup.core.asar');
		if (!fs.existsSync(asarPath)) {
			fs.copyFileSync(path.join(corePath, 'core.asar'), asarPath);
		}
		asar.extractAll(asarPath, extractPath);
		return extractPath;
	}
};