function findAllImplementers(Class) {
	const classes = Object.getOwnPropertyNames(window)
		.map(key => window[key]);

	return classes.filter(cls => {
		if (!cls) return;

		let i = 10;
		let proto = cls;
		while (i--) {
			if (proto === Class) return true;

			proto = proto.__proto__;
			if (!proto) return;
		}
	});
}

findAllImplementers(Element).forEach(cls => {
	const previous = cls.prototype.setAttribute;
	if (!previous) return;

	cls.prototype.setAttribute = function(key, value) {
		if (key === 'class' && typeof value === 'string') {
			const split = new Set(value.split(' '));

			for (const part of split) {
				if (part.slice(0, 3) === 'bd-') continue;
				// if (part.startsWith('bd-')) continue;

				const i1 = part.indexOf('-');
				if (i1 === -1) continue;

				const i2 = part.indexOf('-', i1 + 1);
				const i3 = i2 === -1 ? part.length : i2;
				const slice = part.slice(i1 + 1, i3);

				if (slice.length !== 6 && slice.length !== 7) continue;

				const id = part.slice(0, i1) + (i2 === -1 ? '' : part.slice(i2));

				split.add('bd-' + id);
			}

			value = Array.from(split).join(' ');
		}

		previous.call(this, key, value);
	};
});

document.querySelectorAll('[class]').forEach(elem => elem.setAttribute('class', elem.getAttribute('class')));