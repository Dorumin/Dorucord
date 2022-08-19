window.Classy = class {
	constructor() {
		this.classyElements = document.querySelectorAll('[class]');
		this.disabled = false;

		this.patchPrototypes();
		// this.patchStylesheets();
		this.updateClasses();

		// Disable Classy when closing Discord to prevent leaks/loops
		window.addEventListener('beforeunload', () => this.disabled = true);
	}

	findAllImplementers(Class) {
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

			console.error('Exceeded max recursion level of 10');
		});
	}

	patchPrototypes() {
		this.each(
			this.findAllImplementers(Element),
			this.patchPrototype.bind(this)
		);
	}

	patchPrototype(Class) {
		const previous = Class.prototype.setAttribute;
		if (!previous) return;

		const classy = this;

		Class.prototype.setAttribute = function(key, value) {
			if (!classy.disabled && key === 'class' && typeof value === 'string') {
				const classes = value.split(' ');
				const adding = [];

				for (const part of classes) {
					// Possible formats:
					// foo-xxxxxx
					// foo-xxxxxx-bar
					// foo-xxxxxxx-bar
					if (part.slice(0, 3) === 'bd-') continue;

					const i1 = part.indexOf('-');
					if (i1 === -1) continue;

					const i2 = part.indexOf('-', i1 + 1);
					// If - doesn't exist, or if it exists but there are only 6 characters after the first -
					// It would mean that the class is a regular foo-xxxxxx class, but with a - in the xxxxxx
					const jumpEnd = i2 === -1 || i1 + 7 === part.length;
					const i3 = jumpEnd ? part.length : i2;
					const slice = part.slice(i1 + 1, i3);

					// Random string can be 6 or 7 characters long
					if (slice.length !== 6 && slice.length !== 7) continue;

					// Grab foo-, and if we didn't jump to the end of the string, add the secondary name
					const id = 'bd-' + part.slice(0, i1) + (jumpEnd ? '' : part.slice(i2));

					if (classes.includes(id)) continue;
					if (adding.includes(id)) continue;

					adding.push(id);
				}

				value = adding.concat(classes).join(' ');
			}

			previous.call(this, key, value);
		};
	}

	patchStylesheets() {
		console.log('sheets', document.styleSheets.length);
		this.each(
			document.styleSheets,
			this.patchStylesheet.bind(this)
		);
	}

	patchStylesheet(sheet) {
		this.each(
			sheet.cssRules,
			this.patchStyleRule.bind(this)
		)
	}

	patchStyleRule(rule) {
		switch (rule.type) {
			case 1: // [CSSStyleRule]
				rule.selectorText = this.patchSelector(rule.selectorText);
				break;
			// [CSSGroupingRule]s, the ones with rules inside
			case 4: // [CSSMediaRule]
			case 12: // [CSSSupportsRule]
				this.each(
					rule.cssRules,
					this.patchStyleRule.bind(this)
				);
				break;
		}
	}

	patchSelector(sel) {
		return sel.replace(/\.([-_a-zA-Z0-9]+)/g, (_, name) => {
			return '.' + this.patchClassName(name);
		});
	}

	patchClassName(name) {
		if (name.slice(0, 3) === 'bd-') return name;

		const i1 = name.indexOf('-');
		if (i1 === -1) return name;

		const i2 = name.indexOf('-', i1 + 1);
		const jumpEnd = i2 === -1 || i1 + 7 === name.length;
		const i3 = jumpEnd ? name.length : i2;
		const slice = name.slice(i1 + 1, i3);

		if (slice.length !== 6 && slice.length !== 7) return name;

		const id = 'bd-' + name.slice(0, i1) + (jumpEnd ? '' : name.slice(i2));

		return id;
	}

	each(collection, fn) {
		for (let i = 0, len = collection.length; i < len; i++) {
			fn(collection[i]);
		}
	}

	updateClasses() {
		this.each(this.classyElements, this.updateClass);
	}

	updateClass(elem) {
		elem.setAttribute('class', elem.getAttribute('class'));
	}
};

window.classy = new Classy();
