const fs = require('fs');
const os = require('os');
const path = require('path');
const process = require('process');
const home = os.homedir();

module.exports = () => {
	if (os.platform == 'win32') {
		const location = path.join(home, 'AppData', 'Roaming', 'Discord');
		const dir = fs.readdirSync(location);
		const install = dir
			.filter(name => /\d+\.\d+\.\d+/.test(name))
			.sort((n1, n2) => {
				const s1 = n1.split('.'),
				s2 = n2.split('.');
				return s2[0] - s1[0] || s2[1] - s1[1] || s2[2] - s1[2];
			});

		return path.join(location, install[0]);
	}
	if (os.platform == 'darwin') {
		const location = path.join('Library', 'Application Support', 'discord');
		const dir = fs.readdirSync(location);
		const install = dir
			.filter(name => /\d+\.\d+\.\d+/.test(name))
			.sort((n1, n2) => {
				const s1 = n1.split('.'),
				s2 = n2.split('.');
				return s2[0] - s1[0] || s2[1] - s1[1] || s2[2] - s1[2];
			});

		return path.join(location, install[0]);
	}
};