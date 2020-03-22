window.Resolvable = class {
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

window.StickerDatabase = class {
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

				db.deleteObjectStore('main');
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

window.Stickers = class {
	constructor() {
		this.onMutation = this.onMutation.bind(this);
		this.onResize = this.onResize.bind(this);
		this.onClick = this.onClick.bind(this);
		this.onFiles = this.onFiles.bind(this);

		this.BUTTON_ID = 'stickers-button';

		this.token = new Resolvable();

		this.db = this.createDatabase();
		this.input = this.createStickersInput();
		this.sticks = this.createStickersContainer();
		this.upload = this.createStickersUpload();
		// this.button = this.createStickersButton();
		this.popout = this.createStickersPopout();
		this.observer = this.createMutationObserver();

		this.deleting = false;
		this.creatingPack = false;
		this.addingToPack = false;
		this.selectedStickerPack = -1;

		document.addEventListener('click', this.onClick);
		window.addEventListener('resize', this.onResize);

		this.patchXHR();
		this.hidePopout();
		this.updatePopoutStickers();
		this.onMutation();
	}

	createDatabase() {
		const db = new StickerDatabase('stickers', 2);

		return db;
	}

	createStickersButton(classes) {
		const button = document.createElement('button');
		button.id = this.BUTTON_ID;
		button.title = 'Stickers'; // TODO: Move to Discord-style tooltips
		button.setAttribute('class', classes.button);

		const contents = document.createElement('div');
		contents.id = 'stickers-button-contents';
		contents.setAttribute('class', classes.div);

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.id = 'sticker-button';
		svg.setAttribute('width', '20');
		svg.setAttribute('height', '20');
		svg.setAttribute('viewBox', '0 0 22 22');
		svg.setAttribute('class', classes.svg);

		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

		svg.appendChild(path);
		contents.appendChild(svg);
		button.appendChild(contents);

		button.addEventListener('click', this.togglePopout.bind(this));

		return button;
	}

	createStickersInput() {
		const input = document.createElement('input');
		input.id = 'stickers-hidden-file-input';
		input.type = 'file';
		input.multiple = true;
		input.addEventListener('change', this.onFiles);

		return input;
	}

	createStickersContainer() {
		const stickers = document.createElement('div');
		stickers.id = 'stickers-popout-stickers';

		return stickers;
	}

	createStickersUpload() {
		const upload = document.createElement('div');
		upload.id = 'stickers-popout-upload';

		const button = document.createElement('button');
		button.id = 'stickers-popout-upload-button';
		button.textContent = 'Create a sticker pack!';

		button.addEventListener('click', this.onCreateStickerPack.bind(this));

		upload.appendChild(button);

		return upload;
	}

	createHeaderButton(id, emoji, text) {
		// @TODO: Get proper icons rather than emoji
		const button = document.createElement('div');
		button.className = 'stickers-popout-header-button';
		button.id = `stickers-popout-${id}`;

		const icon = document.createElement('span');
		icon.className = 'stickers-header-button-icon';
		icon.textContent = emoji;

		const label = document.createElement('span');
		label.className = 'stickers-header-button-label';
		label.textContent = text;

		button.appendChild(icon);
		button.appendChild(label);

		return button;
	}

	createStickersPopout() {
		const popout = document.createElement('div');
		popout.id = 'stickers-popout';

		const header = this.createStickersHeader();

		const body = document.createElement('div');
		body.id = 'stickers-popout-body';

		body.appendChild(this.sticks);
		body.appendChild(this.upload);
		body.appendChild(this.input);

		popout.appendChild(header);
		popout.appendChild(body);

		document.body.appendChild(popout);

		return popout;
	}

	createStickersHeader() {
		const header = document.createElement('div');
		header.id = 'stickers-popout-header';

		const tabs = document.createElement('div');
		tabs.id = 'stickers-popout-tabs';
		this.tabs = tabs;

		const trash = this.createHeaderButton('trash', '🗑️', 'Delete');

		const add = this.createHeaderButton('add', '➕', 'Add');

		const body = document.createElement('div');
		body.id = 'stickers-popout-body';

		add.addEventListener('click', this.addToPack.bind(this));
		trash.addEventListener('click', this.onTrashClick.bind(this));

		header.appendChild(tabs);
		header.appendChild(trash);
		header.appendChild(add);

		return header;
	}

	createSticker(key, file) {
		const sticker = document.createElement('div');
		sticker.className = 'sticker-container';
		sticker.title = file.name;
		sticker.setAttribute('data-key', key);

		const stickerImage = document.createElement('img');
		stickerImage.className = 'sticker-image loading';
		stickerImage.alt = '';
		stickerImage.src = '';
		this.blobToUrl(file).then(url => {
			stickerImage.classList.remove('loading');
			stickerImage.src = url;
		});
		// stickerImage.src = await this.blobToUrl(file);

		sticker.appendChild(stickerImage);
		sticker.addEventListener('click', this.onStickerClick.bind(this, file));

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
		const tab = document.createElement('div');
		tab.className = 'stickers-tab';
		tab.setAttribute('data-key', pack.key);

		const icon = document.createElement('img');
		icon.className = 'stickers-tab-icon loading';
		icon.alt = '';
		icon.src = '';

		this.blobToUrl(pack.value.files[0]).then(url => {
			icon.classList.remove('loading'),
			icon.src = url;
		});

		tab.appendChild(icon);

		tab.addEventListener('click', () => {
			if (this.deleting) {
				tab.classList.toggle('marked-delete');
				return;
			}

			this.resetSelectedTab();
			this.selectedStickerPack = pack.key;
			tab.classList.add('selected');
			container.classList.add('visible');
			this.reflowPopout();
		});

		return tab;
	}

	createStickerPackContainer(pack) {
		const container = document.createElement('div');
		container.className = 'stickers-pack-container';
		container.setAttribute('data-key', pack.key);

		this.each(pack.value.files, (file, index) => {
			container.appendChild(this.createSticker(`${pack.key}:${index}`, file));
		});

		return container;
	}

	createAddStickerPackTab() {
		const tab = document.createElement('div');
		tab.id = 'stickers-create-pack-tab';
		tab.className = 'stickers-tab';
		tab.textContent = '➕'; // @TODO: Add sticker pack icon

		tab.addEventListener('click', this.onCreateStickerPack.bind(this));

		return tab;
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

	createMutationObserver() {
		const observer = new MutationObserver(this.onMutation);

		observer.observe(document.getElementById('app-mount'), {
			childList: true,
			subtree: true
		});

		return observer;
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

	query(selector, container = document) {
		const patched = selector.replace(/\*(\w+)/, `[class*="$1-"]`);

		return container.querySelector(patched);
	}

	closest(el, parent) {
		while (el !== parent) {
			el = el.parentElement;
			if (!el) break;
		}

		return el === parent;
	}

	onMutation() {
		const existing = document.getElementById(this.BUTTON_ID);
		if (existing) return;

		const textarea = this.query('div*channelTextArea');
		if (!textarea) return;

		const buttons = this.query('div*buttons', textarea);
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

		const token = await this.token.promise;
		const channel = this.getChannelId();

		if (!channel) {
			console.log('Could not find a channel to send to');
			return;
		}

		const form = new FormData();
		form.append('file', file);

		await fetch(`https://discordapp.com/api/v6/channels/${channel}/messages`, {
			method: 'POST',
			body: form,
			headers: {
				'authorization': token
			}
		});

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

	onStickerClick(file, e) {
		const container = e.target.closest('.sticker-container');

		if (this.deleting) {
			container.classList.toggle('marked-delete');
		} else {
			this.sendImage(container, file);
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
		const form = this.query('div*chatContent form');
		if (!form) return;

		const bounds = form.getBoundingClientRect();
		const rect = this.popout.getBoundingClientRect();
		const styles = getComputedStyle(this.popout);
		const formStyle = getComputedStyle(form);
		const horizontalMargin = parseInt(styles.marginLeft) + parseInt(styles.marginRight);
		const verticalMargin = parseInt(styles.marginTop) + parseInt(styles.marginBottom);
		const verticalPadding = parseInt(formStyle.paddingTop) + parseInt(formStyle.paddingBottom);

		// what is outerHeight?
		// The window's height
		this.popout.style.left = `${bounds.left}px`;
		this.popout.style.top = `${bounds.top - rect.height - verticalMargin + verticalPadding}px`;
		this.popout.style.width = `${bounds.width - horizontalMargin}px`;
	}

	hidePopout() {
		this.popoutOpen = false;
		this.popout.style.display = 'none';
		document.body.classList.remove('stickers-popout-open');

		this.deleting = false;
		document.getElementById('stickers-popout-trash').querySelector('.stickers-header-button-label').textContent = 'Delete';

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
		if (this.button) this.button.remove();

		this.popout.remove();
		this.observer.disconnect();

		document.removeEventListener('click', this.onClick);
	}
}

if (window.stickers) {
	window.stickers.cleanup();
}

window.stickers = new Stickers();