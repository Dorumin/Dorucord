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
                if (part.startsWith('bd-')) continue;
                if (part.charAt(part.length - 7) !== '-') continue;

                split.add('bd-' + part.slice(0, -7));
            }

            value = Array.from(split).join(' ');
		}

		previous.call(this, key, value);
	};
});

document.querySelectorAll('[class]').forEach(elem => elem.setAttribute('class', elem.getAttribute('class')));