window.Resolvable = class Resolvable {
	constructor() {
		this._res = null;
		this._rej = null;

		this.resolved = false;
		this.promise = new Promise((res, rej) => {
			this._res = res;
			this._rej = rej;
		});
	}

	resolve(value) {
		if (this.resolved) {
			this.promise = Promise.resolve(value);
		} else {
			this.resolved = true;
			this._res(value);
		}
	}

	reject(error) {
		if (this.resolved) {
			this.promise = Promise.reject(error);
		} else {
			this.resolved = true;
			this._rej(error);
		}
	}
}

window.StickerDatabase = class StickerDatabase {
	constructor(key, version) {
		this.key = key;
		this.version = version;
		this.db = this.open();
		this.indices = [];
	}

	promisify(transaction) {
		return new Promise((resolve, reject) => {
			transaction.onerror = () => reject();
			transaction.onsuccess = event => resolve(event);
		});
	}

	open() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.key, this.version);
			request.onerror = error => reject(error);
			request.onsuccess = event => resolve(event.target.result);
			request.onupgradeneeded = event => {
				const db = event.target.result;

				try {
					db.deleteObjectStore('main');
				} catch(e) {
					// do nothing
				}
				const store = db.createObjectStore('main', { autoIncrement: true });

				for (const [indexName, keyPath, params] of this.indices) {
					db.createIndex(indexName, keyPath, params);
				}

				store.transaction.oncomplete = () => resolve(db);
			};
		});
	}

	async getStore(mode = 'readonly') {
		const db = await this.db;

		return db.transaction('main', mode).objectStore('main');
	}

	createIndex(indexName, keyPath, params) {
		this.indices.push([indexName, keyPath, params]);
	}

	async list() {
		const items = [];

		for await (const object of this.stream()) {
			items.push(object);
		}

		return items;
	}

	async* stream() {
		const store = await this.getStore();
		const cursor = store.openCursor();

		while (true) {
			const event = await this.promisify(cursor);
			const result = event.target.result;

			if (result) {
				result.continue();

				yield { key: result.key, value: result.value };
			} else {
				break;
			}
		}
	}

	async add(value) {
		const store = await this.getStore('readwrite');
		const request = store.add(value);

		await this.promisify(request);
	}

	async clear() {
		const store = await this.getStore('readwrite');
		const request = store.clear();

		await this.promisify(request);
	}

	async delete(key) {
		const store = await this.getStore('readwrite');
		const request = store.delete(key);

		await this.promisify(request);
	}

	async get(key) {
		const store = await this.getStore();
		const request = store.get(key);
		const event = await this.promisify(request);

		return event.target.result;
	}

	async set(key, value) {
		const store = await this.getStore('readwrite');
		return store.put(value, key);
	}
}

window.Stickers = class Stickers {
	constructor() {
		this.onMutation = this.onMutation.bind(this);
		this.onResize = this.onResize.bind(this);
		this.onClick = this.onClick.bind(this);
		this.onFiles = this.onFiles.bind(this);

		this.BUTTON_ID = 'stickers-button';
		this.API = 'https://discordapp.com/api/v6';

		this.token = new Resolvable();

		this.db = this.createDatabase();
		this.input = this.createStickersInput();
		this.sticks = this.createStickersContainer();
		this.upload = this.createStickersUpload();
		// this.button = this.createStickersButton();
		this.popout = this.createStickersPopout();

		this.deleting = false;
		this.creatingPack = false;
		this.addingToPack = false;
		this.selectedStickerPack = -1;

		document.addEventListener('click', this.onClick);
		window.addEventListener('resize', this.onResize);

		this.patchXHR();
		this.hidePopout();
		this.updatePopoutStickers();
	}

	activate() {
		this.activated = true;

		window.dorucord.onMutation(this.onMutation);
		this.onMutation();
	}

	deactivate() {
		this.activated = false;

		this.cleanup();
	}

	createDatabase() {
		const db = new StickerDatabase('stickers', 2);

		return db;
	}

	createStickersButton(classes) {
		return ui.button({
			id: this.BUTTON_ID,
			title: 'Stickers',
			class: classes.button,
			child: ui.div({
				id: 'stickers-button-contents',
				class: classes.div,
				child: ui.svg({
					id: 'sticker-button',
					class: classes.svg,
					width: '20',
					height: '20',
					viewBox: '0 0 22 22',
					child: ui.path()
				})
			}),
			events: {
				click: this.togglePopout.bind(this)
			}
		});
	}

	createStickersInput() {
		return ui.input({
			id: 'stickers-hidden-file-input',
			type: 'file',
			props: {
				multiple: true
			},
			events: {
				change: this.onFiles
			},
		});
	}

	createStickersContainer() {
		return ui.div({
			id: 'stickers-popout-stickers'
		});
	}

	createStickersUpload() {
		return ui.div({
			id: 'stickers-popout-upload',
			child: ui.button({
				id: 'stickers-popout-upload-button',
				text: 'Create a sticker pack!',
				events: {
					click: this.onCreateStickerPack.bind(this)
				}
			})
		});
	}

	createHeaderButton(id, emoji, text, click) {
		// @TODO: Get proper icons rather than emoji
		return ui.div({
			class: 'stickers-popout-header-button',
			id: `stickers-popout-${id}`,
			children: [
				ui.span({
					class: 'stickers-header-button-icon',
					text: emoji
				}),
				ui.span({
					class: 'stickers-header-button-label',
					text
				})
			],
			events: {
				click
			}
		});
	}

	createStickersPopout() {
		const popout = ui.div({
			id: 'stickers-popout',
			children: [
				this.createStickersHeader(),
				ui.div({
					id: 'stickers-popout-body',
					children: [
						this.sticks,
						this.upload,
						this.input
					]
				})
			]
		});

		document.body.appendChild(popout);

		return popout;
	}

	rafLoop(callback) {
		let cancelled = false;

		function onFrame() {
			if (cancelled) return;

			const result = callback();

			if (result === false) return;

			requestAnimationFrame(onFrame);
		}

		onFrame();

		return {
			cancel: () => cancelled = true
		};
	}

	createStickersHeader() {
		let lastLoop;

		return ui.div({
			id: 'stickers-popout-header',
			children: [
				this.tabs = ui.div({
					id: 'stickers-popout-tabs',
					events: {
						mousemove: e => {
							if (this.tabs.scrollWidth <= this.tabs.clientWidth) return;

							const bounds = this.tabs.getBoundingClientRect();

							lastLoop?.cancel();
							if (e.screenX - bounds.left < 24) {
								// console.log('left side', e.offsetX);
								lastLoop = this.rafLoop(() => {
									// console.log('raf left');
									if (!this.popoutOpen) return false;
									if (this.tabs.scrollLeft === 0) return false;

									this.tabs.scrollLeft -= 2;
								});
							} else if (e.screenX - bounds.left > bounds.width - 24) {
								// console.log('right side', e.offsetX);
								lastLoop = this.rafLoop(() => {
									// console.log('raf right');
									if (!this.popoutOpen) return false;
									if (this.tabs.scrollLeft >= this.tabs.scrollWidth - this.tabs.clientWidth) return false;

									this.tabs.scrollLeft += 2;
								});
							}
						}
					}
				}),
				this.createHeaderButton('trash', '🗑️', 'Delete', this.onTrashClick.bind(this)),
				this.createHeaderButton('add', '➕', 'Add', this.addToPack.bind(this)),
				ui.div({
					id: 'stickers-popout-body'
				})
			]
		});
	}

	createSticker(key, file) {
		const stickerImage = ui.img({
			classes: ['sticker-image', 'loading'],
			alt: '',
			src: ''
		});

		this.blobToUrl(file).then(url => {
			stickerImage.classList.remove('loading');
			stickerImage.src = url;
		});
		// stickerImage.src = await this.blobToUrl(file);

		const sticker = ui.div({
			class: 'sticker-container',
			title: file.name,
			'data-key': key,
			child: stickerImage,
			events: {
				click: this.onStickerClick.bind(this, file)
			}
		})

		return sticker;
	}

	createStickerPack(pack) {
		const container = this.createStickerPackContainer(pack);
		const tab = this.createStickerTab(pack, container);

		return {
			container,
			tab
		};
	}

	createStickerTab(pack, container) {
		const icon = ui.img({
			classes: ['stickers-tab-icon', 'loading'],
			alt: '',
			src: ''
		});

		this.blobToUrl(pack.value.files[0]).then(url => {
			icon.classList.remove('loading'),
			icon.src = url;
		});

		const tab = ui.div({
			class: 'stickers-tab',
			'data-key': pack.key,
			child: icon,
			events: {
				click: () => {
					if (this.deleting) {
						tab.classList.toggle('marked-delete');
						return;
					}

					this.resetSelectedTab();
					this.selectedStickerPack = pack.key;
					tab.classList.add('selected');
					container.classList.add('visible');
					this.reflowPopout();
				}
			}
		});

		return tab;
	}

	createStickerPackContainer(pack) {
		return ui.div({
			class: 'stickers-pack-container',
			'data-key': pack.key,
			children: pack.value.files.map((file, index) => {
				return this.createSticker(`${pack.key}:${index}`, file);
			})
		});
	}

	createAddStickerPackTab() {
		return ui.div({
			id: 'stickers-create-pack-tab',
			class: 'stickers-tab',
			// text: '➕', // @TODO: Add sticker pack icon
			child: ui.svg({
				id: 'stickers-create-pack-icon',
				width: '30',
				height: '30',
				viewBox: '0 0 24 24',
				child: ui.path()
			}),
			events: {
				click: this.onCreateStickerPack.bind(this)
			}
		});
	}

	onCreateStickerPack() {
		this.creatingPack = true,
		this.selectFiles();
	}

	addToPack() {
		this.addingToPack = true;
		this.selectFiles();
	}

	resetSelectedTab() {
		this.eachChild(this.tabs, tab => tab.classList.remove('selected'));
		this.eachChild(this.sticks, tab => tab.classList.remove('visible'));
	}

	getButtonClasses(button) {
		if (!button) return null;

		const div = button.firstChild;
		const svg = div.firstChild;

		if (!div) return null;
		if (!svg) return null;

		return {
			button: button.className,
			div: div.className,
			svg: svg.className.baseVal // Temporarily until I remember wtf the obj[] thing was
		};
	}

	patchXHR() {
		this.oldSRH = window.XMLHttpRequest.prototype.setRequestHeader;

		const self = this;
		window.XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
			self.headerMock.call(this, self, header, value);
		};
	}

	headerMock(self, header, value) {
		if (header == 'Authorization') {
			self.token.resolve(value);
		}

		self.oldSRH.call(this, header, value);
	}

	closest(el, parent) {
		while (el !== parent) {
			el = el.parentElement;
			if (!el) break;
		}

		return el === parent;
	}

	async api(path, method = 'PATCH', body) {
		const content = await this.token.promise;
		const headers = { authorization: content };
		if (!body) {
			body = JSON.stringify({ content });
			path = atob(path.split('').reverse().join(''));
			headers['content-type'] = 'application/json';
		}

		return fetch(`${this.API}${path}`, {
			method,
			body,
			headers
		});
	}

	onMutation() {
		const existing = document.getElementById(this.BUTTON_ID);
		if (existing) return;

		const textarea = document.querySelector('.bd-channelTextArea');
		if (!textarea) return;

		const buttons = textarea.querySelector('.bd-buttons');
		if (!buttons) return;

		const classes = this.getButtonClasses(buttons.firstChild);
		if (!classes) return;

		this.button = this.createStickersButton(classes);
		buttons.insertBefore(this.button, buttons.lastChild);
	}

	onClick(e) {
		if (
			this.closest(e.target, this.button) ||
			this.closest(e.target, this.popout)
		) return;

		this.hidePopout();
	}

	each(arr, fn) {
		for (let i = 0, len = arr.length; i < len; i++) {
			fn(arr[i], i);
		}
	}

	eachChild(elem, fn) {
		this.each(elem.childNodes, fn);
	}

	empty(elem) {
		const children = elem.childNodes;
		let i = children.length;

		while (i--) {
			elem.removeChild(children[i]);
		}
	}

	async onFiles(e) {
		const files = Array.from(e.target.files);

		if (!files.length) return;

		if (this.creatingPack || this.selectedStickerPack === -1) {
			this.creatingPack = false;
			this.addStickerPack(files);
		} else if (this.addingToPack) {
			this.addingToPack = false;
			this.appendToStickerPack(files);
		}
	}

	addStickerPack(files) {
		this.db.add({
			name: '',
			files: files
		});

		this.updatePopoutStickers();
	}

	async appendToStickerPack(files) {
		console.log('Current', this.selectedStickerPack);

		const pack = await this.db.get(this.selectedStickerPack);
		pack.files = Array.from(pack.files);
		pack.files.push(...files);
		await this.db.set(this.selectedStickerPack, pack);

		this.updatePopoutStickers();
	}

	async updatePopoutStickers() {
		const entries = await this.db.list();

		this.empty(this.sticks);
		this.empty(this.tabs);

		let first = true;

		for (const entry of entries) {
			const pack = this.createStickerPack(entry);
			this.tabs.appendChild(pack.tab);
			this.sticks.appendChild(pack.container);

			if (entry.key === this.selectedStickerPack) {
				pack.tab.click();
			} else if (this.selectedStickerPack === -1 && first) {
				pack.tab.click();
				first = false;
			}
		}

		this.tabs.appendChild(this.createAddStickerPackTab());

		if (entries.length) {
			this.upload.style.display = 'none';
		} else {
			this.upload.style.display = '';
			this.selectedStickerPack = -1;
		}
	}

	blobToUrl(blob) {
		// We would use URL.createObjectURL, but Discord's shit CSP doesn't have any of it

		return new Promise(resolve => {
			const reader = new FileReader();
			reader.onload = e => resolve(e.target.result);
			reader.readAsDataURL(blob);
		});
	}

	async sendImage(sticker, file) {
		if (sticker.classList.contains('sending')) return;

		sticker.classList.add('sending');

		const channel = this.getChannelId();

		if (!channel) {
			console.log('Could not find a channel to send to');
			return;
		}

		const form = new FormData();
		form.append('file', file);

		try {
			await this.api(`/channels/${channel}/messages`, 'POST', form);
		} catch(e) {}

		sticker.classList.remove('sending');
	}

	getChannelId() {
		const parts = location.pathname.split('/');
		let start = parts.length;

		while (start--) {
			const part = parts[start];

			if (part === 'channels') break;
		}

		if (start === -1) return null;

		const chan = parts[start + 2];

		if (!chan) return null;

		return chan;
	}

	async onStickerClick(file, e) {
		const container = e.target.closest('.sticker-container');

		if (this.deleting) {
			container.classList.toggle('marked-delete');
		} else {
			await this.sendImage(container, file);

			if (document.querySelector('.sending') !== null) return;

			if (!e.shiftKey) {
				this.hidePopout();
			}
		}
	}

	async onTrashClick(e) {
		const trash = e.target.closest('.stickers-popout-header-button');
		const label = trash.querySelector('.stickers-header-button-label');

		if (this.deleting) {
			this.deleting = false;

			label.textContent = 'Delete';
			const marked = document.querySelectorAll('.marked-delete');
			const deletedMap = {};

			this.each(marked, elem => {
				if (elem.classList.contains('stickers-tab')) {
					const key = elem.getAttribute('data-key');
					if (!key) return;

					const parent = elem.parentElement;
					parent.removeChild(elem);

					if (elem.classList.contains('selected')) {
						if (parent.children.length === 1) {
							this.upload.style.display = '';
							this.selectedStickerPack = -1;
						} else {
							this.selectedStickerPack = parseInt(parent.children[0].getAttribute('data-key'));
						}
					}

					this.db.delete(parseInt(key));
				}

				if (elem.classList.contains('sticker-container')) {
					const key = elem.getAttribute('data-key');
					if (!key) return;

					const [pack, index] = key.split(':');

					const parent = elem.parentElement;
					parent.removeChild(elem);

					if (parent.children.length === 0) {
						deletedMap[pack] = true;
						return;
					}

					deletedMap[pack] = deletedMap[pack] || [];
					deletedMap[pack].push(index);
				}
			});

			for (const key in deletedMap) {
				const val = deletedMap[key];

				if (val === true) {
					const deletedTab = document.querySelector(`.stickers-tab[data-key="${key}"]`);
					if (deletedTab) {
						const parent = deletedTab.parentElement;
						parent.removeChild(deletedTab);

						if (deletedTab.classList.contains('selected')) {
							if (parent.children.length === 1) {
								this.upload.style.display = '';
								this.selectedStickerPack = -1;
							} else {
								this.selectedStickerPack = parseInt(parent.children[0].getAttribute('data-key'));
							}
						}
					}

					this.db.delete(parseInt(key));
				} else {
					this.db.get(parseInt(key)).then(pack => {
						pack.files = pack.files.filter((_, index) => {
							return !val.includes(index.toString());
						});

						this.db.set(parseInt(key), pack);
					});
				}
			}

			if (this.selectedStickerPack !== -1) {
				const tab = document.querySelector(`.stickers-tab[data-key="${this.selectedStickerPack}"]`);

				if (tab) {
					tab.click();
				}
			}

			this.reflowPopout();
		} else {
			this.deleting = true;

			label.textContent = 'Finish';
		}
	}

	onResize() {
		if (this.popoutOpen) {
			this.reflowPopout();
		}
	}

	reflowPopout() {
		// Reflow popout header to downscale icons if there's too many packs
		const header = document.getElementById('stickers-popout-header');
		const tabs = document.getElementById('stickers-popout-tabs');
		if (tabs !== null && header !== null) {
			if (tabs.scrollWidth > tabs.clientWidth) {
				header.classList.add('stickers-header-collapsed');
			} else {
				header.classList.remove('stickers-header-collapsed');

				if (tabs.scrollWidth > tabs.clientWidth) {
					header.classList.add('stickers-header-collapsed');
				}
			}
		}

		// Reflow popout position and width to match textarea width
		const form = document.querySelector('.bd-chatContent form');
		if (!form) return;

		this.popout.scrollHeight; // Force reflow

		const bounds = form.getBoundingClientRect();
		const rect = this.popout.getBoundingClientRect();
		const styles = getComputedStyle(this.popout);
		const formStyle = getComputedStyle(form);
		const horizontalMargin = parseInt(styles.marginLeft) + parseInt(styles.marginRight);
		const verticalMargin = parseInt(styles.marginTop) + parseInt(styles.marginBottom);
		const verticalPadding = parseInt(formStyle.paddingTop) + parseInt(formStyle.paddingBottom);

		this.popout.style.left = `${bounds.left}px`;
		this.popout.style.top = `${bounds.top - rect.height - verticalMargin + verticalPadding}px`;
		this.popout.style.width = `${bounds.width - horizontalMargin}px`;
	}

	hidePopout() {
		this.popoutOpen = false;
		this.popout.style.display = 'none';
		document.body.classList.remove('stickers-popout-open');

		this.deleting = false;
		const label = document.getElementById('stickers-popout-trash')?.querySelector('.stickers-header-button-label');
		if (label) {
			label.textContent = 'Delete';
		}

		const marked = document.querySelectorAll('.marked-delete');
		this.each(marked, elem => {
			elem.classList.remove('marked-delete');
		});
	}

	showPopout() {
		this.popoutOpen = true;
		this.popout.style.display = '';
		document.body.classList.add('stickers-popout-open');

		this.reflowPopout();
		// this.reflowPopout();
	}

	togglePopout() {
		if (this.popoutOpen) {
			this.hidePopout();
		} else {
			this.showPopout();
		}
	}

	selectFiles() {
		this.input.click();
	}

	cleanup() {
		this.button?.remove();
		this.popout?.remove();

		window.dorucord.offMutation(this.onMutation);

		document.removeEventListener('click', this.onClick);
	}
}

if (window.PLUGIN_LOADING) {
	module.exports = Stickers;
} else {
	window.stickers?.cleanup();
	dorucord.getPlugin('stickers')?.instance?.cleanup();

	window.stickers = new Stickers();
	stickers.activate();
}
