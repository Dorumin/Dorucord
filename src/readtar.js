const path = require('path');
const fs = require('fs');
const asar = require('asar');

module.exports = (dir) => {
	const corePath = path.join(dir, 'resources')
	const extractPath = path.join(corePath, 'extracted');
	let asarPath = path.join(corePath, 'backup.app.asar');
	if (!fs.existsSync(asarPath)) {
		fs.copyFileSync(path.join(corePath, 'app.asar'), asarPath);
	}

	asar.extractAll(asarPath, extractPath);
	return extractPath;
};
