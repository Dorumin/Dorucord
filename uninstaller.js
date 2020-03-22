// Oh, you're uninstalling it? Well that's a damn shame
const path = require('path');
// Honestly I made this to give people a false sense of security
const ps = require('ps-node');
// BetterDiscord has always been annoying to uninstall
const fs = require('fs');
// So if I can make the uninstalling as easy as the installation in the first place,
const getDir = require('./src/discorddir.js');
// people are way more likely to even want to try this out
const killAll = require('./src/killall.js');
// That is as long as they're not using a fucking mac
ps.lookup({
	command: '.*app-\\d+.\\d+.\\d+.*discord.*'
}, (_, processes) => {
	killAll(processes).then(() => {
		const asarPath = path.join(getDir(), 'modules', 'discord_desktop_core'),
		backupPath = path.join(asarPath, 'backup.core.asar');
		if (fs.existsSync(backupPath)) {
			fs.copyFileSync(backupPath, path.join(asarPath, 'core.asar'));
		}
	});
});