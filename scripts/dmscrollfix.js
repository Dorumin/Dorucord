window.DMScrollFix = class {
	constructor() {
		this.onMutation = this.onMutation.bind(this);

		this.dmListVisible = true;
		this.lastTop = 0;

		this.observer = this.createMutationObserver();
	}

	createMutationObserver() {
		const observer = new MutationObserver(this.onMutation);

		observer.observe(document.getElementById('app-mount'), {
			childList: true,
			subtree: true
		});

		this.onMutation();

		return observer;
	}

	query(selector, container = document) {
		const patched = selector.replace(/\*(\w+)/g, `[class*="$1-"]`);

		return container.querySelector(patched);
	}

	onMutation() {
		const scroller = this.query('div*privateChannels div*scroller');
		if (!scroller) {
			this.dmListVisible = false;
			return;
		}

		if (!this.dmListVisible) {
			this.dmListVisible = true;
			scroller.scrollTop = this.lastTop;
		}

		this.lastTop = scroller.scrollTop;
	}

	cleanup() {
		this.observer.disconnect();
	}
}

if (window.dmScrollFix) {
	window.dmScrollFix.cleanup();
}

window.dmScrollFix = new DMScrollFix();
