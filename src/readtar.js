const path = require('path');
const fs = require('fs');
const asar = require('asar');

module.exports = (dir) => {
	const corePath = path.join(dir, 'modules', 'discord_desktop_core');
	const extractPath = path.join(corePath, 'extracted');
	let asarPath = path.join(corePath, 'backup.core.asar');
	if (!fs.existsSync(asarPath)) {
		fs.copyFileSync(path.join(corePath, 'core.asar'), asarPath);
	}
	asar.extractAll(asarPath, extractPath);
	return extractPath;
};