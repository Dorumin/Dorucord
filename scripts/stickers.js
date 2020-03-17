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

        return await this.promisify(key);
    }

    // No put impl
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

        document.addEventListener('click', this.onClick);
        window.addEventListener('resize', this.onResize);

        this.patchXHR();
        this.hidePopout();
        this.updatePopoutStickers();
        this.onMutation();
    }

    createDatabase() {
        const db = new StickerDatabase('stickers', 1);

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
        button.textContent = 'Upload some stickers';

        button.addEventListener('click', this.selectFiles.bind(this));

        upload.appendChild(button);

        return upload;
    }

    createHeaderButton(id, emoji, text) {
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

        const header = document.createElement('div');
        header.id = 'stickers-popout-header';

        const title = document.createElement('span');
        title.id = 'stickers-popout-title';
        title.textContent = 'Send stickers! Select one you like';

        const trash = this.createHeaderButton('trash', '♻️', 'Delete');

        const add = this.createHeaderButton('add', '➕', 'Add');

        const body = document.createElement('div');
        body.id = 'stickers-popout-body';

        add.addEventListener('click', this.selectFiles.bind(this));
        trash.addEventListener('click', this.onTrashClick.bind(this));

        header.appendChild(title);
        header.appendChild(trash);
        header.appendChild(add);

        body.appendChild(this.sticks);
        body.appendChild(this.upload);
        body.appendChild(this.input);

        popout.appendChild(header);
        popout.appendChild(body);

        document.body.appendChild(popout);

        return popout;
    }

    async createSticker(key, file) {
        const sticker = document.createElement('div');
        sticker.className = 'sticker-container';
        sticker.title = file.name;
        sticker.setAttribute('data-key', key);

        const stickerImage = document.createElement('img');
        stickerImage.className = 'sticker-image';
        stickerImage.src = await this.blobToUrl(file);

        sticker.appendChild(stickerImage);
        sticker.addEventListener('click', this.onStickerClick.bind(this, file));

        return sticker;
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

    async onFiles(e) {
        const files = e.target.files;

        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);

            await this.db.add(file);
        }

        this.updatePopoutStickers();
    }

    async updatePopoutStickers() {
        const children = this.sticks.childNodes;
        let i = children.length;

        while (i--) {
            this.sticks.removeChild(children[i]);
        }

        const entries = await this.db.list();

        for (const entry of entries) {
            const sticker = await this.createSticker(entry.key, entry.value);

            this.sticks.appendChild(sticker);
        }

        if (entries.length) {
            this.upload.style.display = 'none';
        } else {
            this.upload.style.display = '';
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
            container.classList.toggle('selected');
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
            const scheduledStickers = document.querySelectorAll('.sticker-container.selected');
            let i = scheduledStickers.length;

            while (i--) {
                const sticker = scheduledStickers[i];

                sticker.remove();
            }

            i = scheduledStickers.length;

            while (i--) {
                const sticker = scheduledStickers[i];
                const key = sticker.getAttribute('data-key');

                await this.db.delete(parseInt(key) || key);
            }
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
        const horizontalMargin = parseInt(styles.marginLeft) + parseInt(styles.marginRight);
        const verticalMargin = parseInt(styles.marginTop) + parseInt(styles.marginBottom);

        // what is outerHeight?
        // The window's height
        this.popout.style.left = `${bounds.left}px`;
        this.popout.style.top = `${bounds.top - rect.height - verticalMargin}px`;
        this.popout.style.width = `${bounds.width - horizontalMargin}px`;
    }

    hidePopout() {
        this.popoutOpen = false;
        this.popout.style.display = 'none';

        this.deleting = false;
        const scheduledStickers = document.querySelectorAll('.sticker-container.selected');
        let i = scheduledStickers.length;

        while (i--) {
            const sticker = scheduledStickers[i];

            sticker.classList.remove('selected');
        }
    }

    showPopout() {
        this.popoutOpen = true;
        this.popout.style.display = '';

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