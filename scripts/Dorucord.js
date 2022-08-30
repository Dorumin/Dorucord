const localforage = require('localforage');
const dorui = require('dorui');

// import erp from 'erlpackjs';

window.erlpack = require('erlpackjs');
window.pako = require('pako');
// window.zlib = require('browserify-zlib');

window.msgpack = require('@msgpack/msgpack');
// window.erlpack = require('erlpackjs');

console.log('dorui', dorui);

window.PluginWrapper = class PluginWrapper {
    constructor(rawPlugin) {
        this._rawPlugin = rawPlugin;
        this._rawFiles = rawPlugin.files;
        this._rawName = rawPlugin.plugin;
        this._rawExports = [];

        this.manifest = this.getManifest();
        this.name = this.manifest.name;
        this.description = this.manifest.description;
        this.dependencies = this.manifest.dependencies;
        this.id = this.manifest.id;

        this.mainExport = null;
        this.instance = null;
        this.activated = false;

        this.styleElements = [];
    }

    getId() {
        return this.manifest.id ?? this.name.toLowerCase().replace(/\s/g, '-').replace(/[^a-zA-Z0-9]/g, '');
    }

    getManifest() {
        const manifestFile = this._rawPlugin.files.find(file => file.name === 'plugin.json');
        let manifest;
        if (manifestFile) {
            manifest = JSON.parse(manifestFile.text);
        } else {
            manifest = {};
        }

        if (!manifest.name) {
            manifest.name = this._rawName;
        }

        if (!manifest.id) {
            manifest.id = manifest.name.toLowerCase().replace(/\s/g, '-').replace(/[^a-zA-Z0-9]/g, '');
        }

        if (!manifest.description) {
            manifest.description = 'No information provided.';
        }

        if (!manifest.type) {
            manifest.type = 'plugin';
        }

        if (!manifest.dependencies) {
            manifest.dependencies = [];
        }

        return manifest;
    }

    isHidden() {
        return this.manifest.hidden || this.manifest.type === 'module';
    }

    init() {
        const cssFiles = this._rawFiles.filter(file => file.type === 'css');
        const jsFiles = this._rawFiles.filter(file => file.type === 'js');

        for (const cssFile of cssFiles) {
            const style = document.createElement('style');
            style.type = 'text/css';
            style.rel = 'stylesheet';
            style.className = 'dorucord-plugin-stylesheet';
            style.setAttribute('data-plugin', this.name);
            style.textContent = cssFile.text;

            this.styleElements.push(style);
            document.head.appendChild(style);

            // Must set disabled after appending to the document
            style.disabled = true;
        }

        for (const jsFile of jsFiles) {
            // This try..catch block serves two purposes
            // For one, it catches errors when loading plugin files,
            // which we should've done anyways
            // Two, it disables Rollup optimizations in this block
            // This means that module.exports !== null won't be optimized away
            try {
                window.PLUGIN_LOADING = true;
                let module = {
                    exports: null
                };
                // fuck you optimizer
                const null_lmao = Math.random() > 10 ? {} : null;
                eval(this.wrapScript(jsFile.text, 'module'));
                window.PLUGIN_LOADING = false;

                if (module.exports !== null_lmao) {
                    this._rawExports.push(module.exports);
                    this.mainExport = module.exports;
                }
            } catch(e) {
                console.error('Caught error while executing plugin:', this.name);
                console.error('Error was:');
                console.error(e);
            }
        }

        if (typeof this.mainExport === 'function') {
            this.instance = new this.mainExport(this);
        }
    }

    wrapScript(code, arg) {
        return `(function(${arg}) { ${code} })(${arg});`;
    }

    canToggle() {
        return this.instance || this.styleElements.length > 0;
    }

    activate() {
        if (this.activated) return;
        this.activated = true;

        for (const styleElement of this.styleElements) {
            styleElement.disabled = false;
        }

        this.instance?.activate?.();
    }

    deactivate() {
        if (!this.activated) return;
        this.activated = false;

        for (const styleElement of this.styleElements) {
            styleElement.disabled = true;
        }

        this.instance?.deactivate?.();
    }

    cleanup() {
        this.deactivate();

        for (const styleElement of this.styleElements) {
            styleElement.remove();
        }
    }
};

window.WebSocketInterceptor = class WebSocketInterceptor {
    // static listenPatch(onMessage) {
    //     const oldSend = window.WebSocket.prototype.send;
    //     let startedListening = false;

    //     window.WebSocket.prototype.send = function(payload) {
    //         if (!this._dorucordPatched) {
    //             this._dorucordPatched = true;

    //             const oldOnMessage = this.onmessage;
    //             // const inflator = new pako.Inflate();
    //             let inflator = new pako.Inflate();

    //             this.onmessage = function(event) {
    //                 // let data;
    //                 if (event.data instanceof ArrayBuffer) {
    //                     const u8 = new Uint8Array(event.data);

    //                     const isFlush = u8.byteLength > 4
    //                         && u8[u8.byteLength - 4] === 0x00
    //                         && u8[u8.byteLength - 3] === 0x00
    //                         && u8[u8.byteLength - 2] === 0xFF
    //                         && u8[u8.byteLength - 1] === 0xFF;

    //                     console.log('Is flush', isFlush);

    //                     if (isFlush) {
    //                         if (startedListening) {
    //                             inflator.push(u8, true);

    //                             if (inflator.err) {
    //                                 console.log('New inflator');
    //                                 inflator = new pako.Inflate();
    //                             } else {
    //                                 onMessage(inflator.result);
    //                             }
    //                         } else {
    //                             startedListening = true;
    //                         }
    //                     } else {
    //                         if (startedListening) {
    //                             inflator.push(u8);
    //                         }
    //                     }
    //                 } else {
    //                     // data = JSON.parse(event.data);
    //                     onMessage(JSON.parse(event.data));
    //                 }
    //                 // const data = erlpack.unpack(event.data);
    //                 // const data = event.data;

    //                 // onMessage(data, event);

    //                 oldOnMessage?.call(this, event);
    //             };
    //         }
    //         oldSend.call(this, payload);
    //     };
    // }

    static overwriteConstructor() {
        this.OldWebSocket = this.OldWebSocket || window.WebSocket;

        window.WebSocket = WebSocketInterceptor;
    }

    static forceReconnect() {
        const oldSend = window.WebSocket.prototype.send;

        WebSocketInterceptor.forcingReconnect = true;

        window.WebSocket.prototype.send = function(payload) {
            if (WebSocketInterceptor.forcingReconnect) {
                try {
                    const unpacked = erlpack.unpack(payload);

                    if (unpacked.op === 1) {
                        WebSocketInterceptor.forcingReconnect = false;
                        console.log('Caught heartbeat');
                        return;
                    }
                } catch(e) {}
            }

            oldSend.call(this, payload);
        }
    }

    static addIntercept(callback) {
        WebSocketInterceptor.intercepts ??= [];

        WebSocketInterceptor.intercepts.push(callback);
    }

    constructor(...args) {
        console.log('Intercept constructor', this);

        this.inner = new WebSocketInterceptor.OldWebSocket(...args);

        this.interceptor = {
            inflator: new pako.Inflate({
                // to: 'string'
            }),
            stream: null
        };

        window.lastInterceptor = this;

        const oldEnd = this.interceptor.inflator.onEnd;
        this.interceptor.inflator.onEnd = function(...args) {
            console.log('end', args);

            oldEnd.apply(this, args);
        }

        // this.interceptor.inflator.onData = (data) => {
        //     console.log('data?', data);
        // };
    }

    get binaryType() {
        return this.inner.binaryType;
    }

    set binaryType(type) {
        return this.inner.binaryType = type;
    }

    get bufferedAmount() {
        return this.inner.bufferedAmount;
    }

    get extensions() {
        return this.inner.extensions;
    }

    close(...args) {
        this.inner.close(...args);
    }

    send(...args) {
        this.inner.send(...args);
    }

    onMessageIntercept(event) {
        if (!this.interceptor) return;

        let data;

        if (event.data instanceof ArrayBuffer) {
            const u8 = new Uint8Array(event.data);

            const isFlush = u8.byteLength > 4
                && u8[u8.byteLength - 4] === 0x00
                && u8[u8.byteLength - 3] === 0x00
                && u8[u8.byteLength - 2] === 0xFF
                && u8[u8.byteLength - 1] === 0xFF;

            window.lastPayload = u8;

            this.interceptor.inflator.push(u8, isFlush && pako.constants.Z_FINISH);

            if (isFlush) {
                const oldStream = this.interceptor.stream;
                const stream = this.interceptor.inflator.strm;

                let bytes;

                if (oldStream && oldStream !== stream) {
                    let length = oldStream.output.length - oldStream.last_out + stream.next_out;
                    console.log('CHANGELING length', length);
                    bytes = new Uint8Array(length);
                    let i = 0;

                    for (let j = oldStream.last_out; j < oldStream.output.length; j++) {
                        bytes[i++] = oldStream.output[j];
                    }

                    for (let j = 0; j < stream.output.length; j++) {
                        bytes[i++] = stream.output[j];
                    }
                } else {
                    if ((stream.last_out ?? 0) > stream.next_out) {
                        // console.log('reading', stream.last_out ?? 0, stream.next_out);
                        let length = stream.output.length - stream.last_out + stream.next_out;
                        bytes = new Uint8Array(length);
                        let i = 0;

                        const lastChunk = this.interceptor.inflator.chunks.pop();

                        for (let j = stream.last_out; j < lastChunk.length; j++) {
                            bytes[i++] = lastChunk[j];
                        }

                        for (let j = 0; j < stream.next_out; j++) {
                            bytes[i++] = stream.output[j];
                        }

                        stream.last_out = stream.next_out;
                    } else {
                        bytes = stream.output.slice(stream.last_out ?? 0, stream.next_out);
                        stream.last_out = stream.next_out;
                    }
                }

                this.interceptor.stream = stream;

                try {
                    data = erlpack.unpack(bytes);
                } catch(e) {
                    console.log(oldStream, stream);
                    console.error('Error unpacking', e);
                }

                // console.log('data', data);
            }
        } else {
            data = JSON.parse(event.data);
            // onMessage(JSON.parse(event.data));
        }

        if (data) {
            for (const intercept of WebSocketInterceptor.intercepts) {
                intercept(data);
            }
        }
    }

    set onmessage(callback) {
        const interceptor = this;

        this.inner.onmessage = function(event) {
            interceptor.onMessageIntercept(event);

            callback.call(this, event);
        };
    }

    set onclose(callback) {
        this.inner.onclose = callback;
    }

    set onerror(callback) {
        this.inner.onerror = callback;
    }

    set onopen(callback) {
        this.inner.onopen = callback;
    }
}

WebSocketInterceptor.CONNECTING = window.WebSocket.CONNECTING;
WebSocketInterceptor.OPEN = window.WebSocket.OPEN;
WebSocketInterceptor.CLOSING = window.WebSocket.CLOSING;
WebSocketInterceptor.CLOSED = window.WebSocket.CLOSED;

/**
 * This file is injected into the Discord webContents
 * It will run in a web context, unlike other src/ files
 */
window.Dorucord = class Dorucord {
    constructor() {
        this.mutationCallback = this.mutationCallback.bind(this);
        this.attachDorucordConfig = this.attachDorucordConfig.bind(this);
        this.showConfigScreen = this.showConfigScreen.bind(this);
        this.onGlobalClick = this.onGlobalClick.bind(this);
        this.onSocketMessage = this.onSocketMessage.bind(this);

        // WebSocketInterceptor.listenPatch(this.onSocketMessage);
        WebSocketInterceptor.forceReconnect();
        WebSocketInterceptor.overwriteConstructor();
        WebSocketInterceptor.addIntercept(this.onSocketMessage);

        this.onMutationHandlers = [];

        this._pluginsRaw = window._plugins;

        this.plugins = this._pluginsRaw.map(rawPlugin => new PluginWrapper(rawPlugin));

        if (!this._pluginsRaw) {
            console.warn('No plugins were exposed to Dorucord.');
            console.warn('Not empty; no plugins. Likely installation error.');
        }

        this.bindEvents();
        this.initMutationObserver();
        this.loadSettings().then(() => {
            this.onMutation(this.attachDorucordConfig);
            this.initPlugins();
        });
    }

    onSocketMessage(data) {
        // console.log('Received', data);
    }

    getPlugin(pluginId) {
        return this.plugins.find(plugin => plugin.id === pluginId);
    }

    async loadSettings() {
        this.storage = localforage.createInstance({
            name: 'Dorucord'
        });

        const stored = await this.storage.getItem('Dorucord-settings');
        if (stored === null) {
            this.settings = {};
        } else {
            this.settings = JSON.parse(stored);
        }
    }

    async setSetting(key, value) {
        this.settings[key] = value;

        this.storage.setItem('Dorucord-settings', JSON.stringify(this.settings));
    }

    deleteSetting(key) {
        delete this.settings[key];

        this.storage.removeItem('Dorucord-settings');
    }

    initPlugins() {
        for (const plugin of this.plugins) {
            plugin.init();

            if (this.settings[`plugin-active-${plugin.id}`]) {
                this.activatePlugin(plugin);
            }
        }
    }

    bindEvents() {
        window.addEventListener('click', this.onGlobalClick, { passive: true });

        window.addEventListener('beforeunload', this.killProcesses, { passive: true });
    }

    killProcesses() {
        // This makes sure that the Discord process kills itself for good
        // This is to avoid a memory leak that seems to happen randomly
        // It's a hack until I figure out what causes it.
        try {
            switch (require('os').platform()) {
                case 'win32':
                    const child_process = require('child_process');
                    // Kill yourself in 15 seconds
                    const spawned = child_process.exec(`ping -n 15 127.0.0.1 && taskkill /f /t /PID ${process.pid}`);
                    spawned.unref();
                    break;
            }
        } catch(e) {}
    }

    initMutationObserver() {
        this._mutationObserver = new MutationObserver(this.mutationCallback);

        this._mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    mutationCallback(records) {
        for (let i = 0; i < this.onMutationHandlers.length; i++) {
            this.onMutationHandlers[i](records);
        }
    }

    onGlobalClick(e) {
        const dorucordContent = document.getElementById('dorucord-tab');
        if (dorucordContent === null) return;

        const configItem = e.target.closest('.bd-sidebarRegionScroller .bd-item.bd-selected');
        if (configItem === null) return;

        const configId = configItem.getAttribute('aria-controls');
        if (dorucordContent.getAttribute('previous-tab') !== configId) return;

        dorucordContent.id = configId;
    }

    onMutation(callback) {
        this.onMutationHandlers.push(callback);
    }

    offMutation(callback) {
        const index = this.onMutationHandlers.indexOf(callback);
        if (index !== -1) {
            this.onMutationHandlers.splice(index, 1);
        }
    }

    onlyByClass(className) {
        const withClass = document.getElementsByClassName(className);
        if (withClass.length === 1) {
            return withClass[0];
        } else {
            return null;
        }
    }

    firstByClass(className) {
        const withClass = document.getElementsByClassName(className);
        if (withClass.length > 0) {
            return withClass[0];
        } else {
            return null;
        }
    }

    attachDorucordConfig() {
        const layers = this._layers ?? document.querySelector('.bd-layers');
        if (layers === null) return;

        // Relax selector if this breaks
        const configContainer = layers.querySelector(':scope > .bd-layer > .bd-standardSidebarView');
        if (configContainer === null) return;

        // Select first item after two separators
        // This is effectively the appearance tab, which no longer reliably has the aria-controls attribute
        // const appearanceItem = configContainer.querySelector('div[aria-controls="appearance-tab"]');
        const appearanceItem = configContainer.querySelector('.bd-separator ~ .bd-item ~ .bd-separator ~ .bd-item');
        if (appearanceItem === null) return;

        if (
            // Previous element is not Dorucord item
            appearanceItem.previousElementSibling.classList.contains('bd-dorucordConfigButton')
            // Or itself is not Dorucord
            || appearanceItem.classList.contains('bd-dorucordConfigButton')
        ) return;

        console.log('Appending Dorucord config item');
        this._dorucordConfigItem = ui.div({
            class: appearanceItem.getAttribute('class') + ' bd-dorucordConfigButton',
            children: 'Dorucord'.split('')
                .map(letter => ui.span({
                    class: 'bd-dorucordLetter',
                    text: letter
                })
            ),
            events: {
                click: this.showConfigScreen
            }
        });
        appearanceItem.before(this._dorucordConfigItem);
    }

    showConfigScreen() {
        console.log('Making a showing');
        const contentColumn = this.onlyByClass('bd-contentColumn');
        if (contentColumn === null) return;
        if (contentColumn.id === 'dorucord-tab') return; // Already patched

        this._dorucordConfigItem.classList.add('bd-focusedItem');
        document.body.classList.add('dorucord-global-focused-config-item');

        contentColumn.setAttribute('previous-tab', contentColumn.id);
        contentColumn.id = 'dorucord-tab';

        const observer = this.observe(contentColumn, { attributes: true }, () => {
            // Make sure this function is idempotent
            if (!contentColumn.isConnected) {
                observer.disconnect();
            }

            if (contentColumn.id === 'dorucord-tab') {
                this._dorucordConfigItem.classList.add('bd-focusedItem');
                document.body.classList.add('dorucord-global-focused-config-item');
            } else {
                this._dorucordConfigItem.classList.remove('bd-focusedItem');
                document.body.classList.remove('dorucord-global-focused-config-item');
            }
        });

        // Remove old content if exists
        document.getElementById('dorucord-tab-injected-content')?.remove();

        contentColumn.appendChild(this.buildDorucordConfig());
    }

    observe(target, config, callback) {
        const mo = new MutationObserver(callback);
        mo.observe(target, config);

        return mo;
    }

    buildDorucordConfig() {
        return ui.div({
            id: 'dorucord-tab-injected-content',
            children: [
                ui.div({
                    class: 'bd-configSection',
                    children: [
                        ui.h3({
                            class: 'bd-dorucordHeading',
                            text: 'Dorucord settings'
                        }),
                        ui.div({
                            class: 'bd-dorucordParagraph',
                            text: `Here's where the installed plugins are, and where you can turn them on and off.`
                        }),
                    ]
                }),
                ui.div({
                    class: 'bd-configSection',
                    children: [
                        ui.h3({
                            class: 'bd-dorucordHeading',
                            text: 'Plugins'
                        }),
                        ui.div({
                            class: 'bd-pluginsList',
                            children: this.plugins
                                .filter(plugin => !plugin.isHidden())
                                .map(plugin => this.buildPluginSettings(plugin))
                        })
                    ]
                }),
            ]
        });
    }

    buildPluginSettings(plugin) {
        return ui.div({
            class: 'bd-plugin',
            children: [
                ui.div({
                    class: 'bd-pluginHeader',
                    children: [
                        ui.div({
                            class: 'bd-pluginName',
                            text: plugin.name
                        }),
                        plugin.canToggle() && ui.div({
                            class: 'bd-pluginSwitch',
                            children: [
                                ui.input({
                                    type: 'checkbox',
                                    id: `bd-plugin-switch-${plugin.id}`,
                                    class: 'bd-pluginSwitchCheckbox',
                                    events: {
                                        input: (e) => {
                                            if (e.target.checked) {
                                                this.activatePlugin(plugin);
                                            } else {
                                                this.deactivatePlugin(plugin);
                                            }
                                        }
                                    },
                                    props: {
                                        checked: plugin.activated
                                    }
                                }),
                                ui.label({
                                    class: 'bd-pluginSwitchLabel',
                                    for: `bd-plugin-switch-${plugin.id}`,
                                    text: 'Toggle'
                                })
                            ]
                        })
                    ]
                }),
                ui.div({
                    class: 'bd-pluginInfo',
                    children: [
                        ui.div({
                            class: 'bd-pluginDescription',
                            text: plugin.description
                        })
                    ]
                })
            ]
        });
    }

    activatePlugin(plugin, isDependency) {
        try {
            plugin.activate();

            for (const dependency of plugin.dependencies) {
                const dep = this.plugins.find(plugin => plugin.id === dependency);

                if (dep) {
                    this.activatePlugin(dep, true);
                }
            }

            if (!isDependency) {
                this.setSetting(`plugin-active-${plugin.id}`, 'true');
            }
        } catch(e) {
            console.error('Failure while activating Dorucord plugin');
            console.error('Original error below:');
            console.error(e);
        }
    }

    deactivatePlugin(plugin) {
        plugin.deactivate();

        for (const dependency of plugin.dependencies) {
            const dep = this.plugins.find(plugin => plugin.id === dependency);
            const stillDepended = dep && this.plugins.some(plugin => plugin.activated && plugin.dependencies.includes(dep.id));

            if (dep && !stillDepended) {
                this.deactivatePlugin(dep);
            }
        }

        this.deleteSetting(`plugin-active-${plugin.id}`);
    }

    cleanup() {
        this.offMutation(this.attachDorucordConfig);
        this._mutationObserver.disconnect();

        for (const plugin of this.plugins) {
            plugin.cleanup();
        }

        this._dorucordConfigItem?.classList.add('bd-focusedItem')?.remove();
        document.getElementById('dorucord-tab-injected-content')?.remove();
        document.body.classList.remove('dorucord-global-focused-config-item');
        const dorucordTab = document.getElementById('dorucord-tab');
        if (dorucordTab) {
            dorucordTab.id = dorucordTab.getAttribute('previous-tab');
        }

        window.removeEventListener('click', this.onGlobalClick);
        window.removeEventListener('beforeunload', this.killProcesses);
    }
};

if (window.dorucord) {
    window.dorucord.cleanup();
}

// Dumb hack to wait for dependencies
setTimeout(() => {
    window.dorucord = new Dorucord();
}, 0);

globalThis.module = globalThis.module ?? {};
