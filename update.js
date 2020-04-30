const cp = require('child_process');
const fs = require('fs');
const path = require('path');

function getModulePack(type) {
	const files = fs.readdirSync(path.join(__dirname, type))
		.filter(file => file.endsWith('.css') || file.endsWith('.js'))
		.map(file => {
			const hidden = file.charAt(0) === '!';
			const name = hidden ? file.slice(1) : file;

			return {
				name,
				hidden
			};
		});

	return {
		type,
		files
	};
}

function makeMap(mod) {
	const map = {};

	for (const file of mod.files) {
		map[file.name] = file;
	}

	return map;
}

function getPath(mod, file, hidden) {
	return path.join(__dirname, mod.type, hidden ? `!${file.name}` : file.name);
}

function syncUp(old, cur) {
	const oldMap = makeMap(old);

	for (const file of cur.files) {
		const prev = oldMap[file.name];
		const wasHidden = prev && prev.hidden;
		const isHidden = file.hidden;

		// Should've collapsed this, but... eh, is it readable?
		if (wasHidden && !isHidden) {
			fs.renameSync(
				getPath(cur, file, isHidden),
				getPath(cur, file, wasHidden)
			);
		} else if (isHidden && !wasHidden) {
			fs.renameSync(
				getPath(cur, file, isHidden),
				getPath(cur, file, wasHidden)
			);
		}
	}
}

const oldModules = [
	getModulePack('scripts'),
	getModulePack('styles'),
];

cp.execSync('git add .', { cwd: __dirname });
cp.execSync('git reset --hard HEAD', { cwd: __dirname });
cp.execSync('git pull', { cwd: __dirname });

const newModules = [
	getModulePack('scripts'),
	getModulePack('styles'),
];

console.dir({
	oldModules,
	newModules
}, {
	depth: 10000
});

syncUp(oldModules[0], newModules[0]);
syncUp(oldModules[1], newModules[1]);

require('./installer.js');