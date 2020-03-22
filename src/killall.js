const ps = require('ps-node');

module.exports = (processes) => {
	if (!processes || !processes.length) return Promise.resolve();

	return new Promise(res => {
		let i = processes.length;
		console.log(`Killing ${i} Discord processes...`)
		processes.forEach(process => {
			ps.kill(process.pid, () => {
				console.log(`Killed process #${process.pid}!`)
				if (--i) return;
				res();
			});
		});
	});
}