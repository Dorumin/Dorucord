    //META{"name":"LastOnline","website":"","source":""}*//

    LastOnline = class {
        getName() {
            return "LastOnline";
        }

        getVersion() {
            return "0.0.1";
        }

        getAuthor() {
            return "Doru";
        }

        getDescription() {
            return "Seen timestamps for people seen by Opal.";
        }

        constructor() {
            this.initConstructor();
        }

        initConstructor() {
            this.server = 'opalbot';
            this.data = null;
            this.app = document.getElementById('app-mount');
            this.style = document.createElement('style');
            this.waitReady(() => {
                this.fetchSeen();
                this.bindEvents();
                // this.addStyles();
                setInterval(this.fetchSeen.bind(this), 60000);
            });
        }

        waitReady(fn) {
            this.interval = setInterval(() => {
                try {
                    this.getChatArea();
                    clearInterval(this.interval);
                    fn();
                } catch(e) {
                    console.log(e);
                }
            }, 1000);
        }

        bindEvents() {
            this.app.addEventListener('click', this.defer(this.updateTimestamps));
            this.app.addEventListener('keyup', this.defer(this.updateTimestamps));
            this.mo = new MutationObserver(this.defer(this.updateTimestamps));
            this.mo.observe(this.getChatArea().firstChild, {
                attributes: true,
                childList: true
            });
            // this.mo.observe(this.getChatArea(), {
            //     attributes: true,
            //     childList: true
            // });
        }

        defer(fn) {
            return () => setTimeout(fn.bind(this), 0);
        }
        
        addStyles() {
            this.style.textContent = '.lastOnline-time {\
                margin-left: 8px;\
                font-size: 14px;\
            }';
            document.head.appendChild(this.style);
        }

        getChatArea() {
            const dialog = this.app.querySelector('div[role="dialog"]');
            if (!dialog) throw new Error('No dialog! getChatArea()');
            const wrapper = dialog.querySelector('div[class*="wrapper-"] + div[class*="flex-"][class*="vertical-"][class*="directionColumn"][class*="justifyStart-"][class*="alignStretch-"][class*="noWrap-"][class*="base-"]');
            if (!wrapper) throw new Error('No wrapper! getChatArea()');
            // const chat = wrapper.querySelector('div[class*="channels-"] + div[class*="chat-"]');
            // if (!chat) throw new Error('No chat! getChatArea()');
            // return chat;
            return wrapper;
        }

        getUser() {
            const chat = this.getChatArea(),
            user = chat.querySelector('div[class*="channels-"] div[class*="privateChannels-"] div[class*="scrollerWrap-"] div[class*="scroller-"] div[class*="channel-"][class*="selected-"]');

            if (!user) return null; // throw new Error('No user! getUser()');
            const avatar = user.querySelector('div[user][class*="inner-"][style*="background-image"]');
            if (!avatar) return null; // throw new Error('No avatar! getUser()');

            return {
                name: avatar.getAttribute('user'),
                id: avatar.getAttribute('style').match(/\d+/)[0],
            };
        }

        getTitle() {
            const chat = this.getChatArea(),
            title = chat.querySelector('div[class*="titleWrapper-"] > div[class*="title-"] div[class*="titleText-"]');

            if (!title) return null; // throw new Error('No title! getTitle()');

            return title;
        }

        fetchSeen() {
            fetch(`https://${this.server}.herokuapp.com/seen`)
                .then(response => response.json())
                .then(this.updateData.bind(this))
                .catch((err) => {
                    console.log('NETRR:', err);
                    this.server = this.server == 'opalbot'
                        ? 'opalbot-loader'
                        : 'opalbot';
                });
        }

        updateData(json) {
            this.data = json;
            this.updateTimestamps();
        }

        updateTimestamps() {
            const old = document.querySelector('.lastOnline-time');
            if (old) {
                old.remove();
            }

            const title = this.getTitle();
            const user = this.getUser();
            if (!title || !user || !this.data) return;

            let ms = this.data[user.id];
            if (typeof ms == 'object') {
                ms = Math.max(ms[0], ms[1]);
            }

            if (!ms) return;

            // console.log(user);

            const time = this.makeTime(ms);
            title.appendChild(time);
        }

        makeTime(ms) {
            const time = document.createElement('span');
            time.className = 'lastOnline-time';
            time.textContent = this.getTimestampText(ms);
            time.style.paddingLeft = '8px';
            time.style.fontSize = '14px';

            return time;
        }

        getTimestampText(ms) {
            const D = new Date().getTime(),
            t = D - ms,
            f = Math.floor,
            s = f(t / 1000),
            m = f(s / 60),
            h = f(m / 60),
            d = f(h / 24);

            if (d) {
                return this.plural(d, 'day');
            }

            if (h) {
                return this.plural(h % 24, 'hour');
            }

            if (m) {
                return this.plural(m % 60, 'minute');
            }

            return this.plural(s % 60, 'second');
            // return `${d} days ${h} hours ${m} minutes ${s} seconds`;
        }

        plural(n, word) {
            return `${n} ${word}${n == 1 ? '' : 's'} ago`;
        }

        //legacy
        load () {}

        start () {
            if (!global.BDFDB) global.BDFDB = {myPlugins:{}};
            if (global.BDFDB && global.BDFDB.myPlugins && typeof global.BDFDB.myPlugins == "object") global.BDFDB.myPlugins[this.getName()] = this;
            var libraryScript = document.querySelector('head script[src="https://mwittrien.github.io/BetterDiscordAddons/Plugins/BDFDB.js"]');
            if (!libraryScript || performance.now() - libraryScript.getAttribute("date") > 600000) {
                if (libraryScript) libraryScript.remove();
                libraryScript = document.createElement("script");
                libraryScript.setAttribute("type", "text/javascript");
                libraryScript.setAttribute("src", "https://mwittrien.github.io/BetterDiscordAddons/Plugins/BDFDB.js");
                libraryScript.setAttribute("date", performance.now());
                libraryScript.addEventListener("load", () => {if (global.BDFDB && typeof BDFDB === "object" && BDFDB.loaded) this.initialize();});
                document.head.appendChild(libraryScript);
            }
            else if (global.BDFDB && typeof BDFDB === "object" && BDFDB.loaded) this.initialize();
            this.startTimeout = setTimeout(() => {this.initialize();}, 30000);
        }

        initialize () {
            if (global.BDFDB && typeof BDFDB === "object" && BDFDB.loaded) {
                if (this.started) return;
                BDFDB.loadMessage(this);

                this.words = BDFDB.loadAllData(this, "words");
                for (let rtype in this.defaults.replaces) if (!BDFDB.isObject(this.words[rtype])) this.words[rtype] = {};

                BDFDB.WebModules.forceAllUpdates(this);
            }
            else {
                console.error(`%c[${this.getName()}]%c`, 'color: #3a71c1; font-weight: 700;', '', 'Fatal Error: Could not load BD functions!');
            }
        }

        stop () {
            if (global.BDFDB && typeof BDFDB === "object" && BDFDB.loaded) {
                document.querySelectorAll(`${BDFDB.dotCN.messagemarkup}.blocked, ${BDFDB.dotCN.messageaccessory}.censored, ${BDFDB.dotCN.messagemarkup}.blocked, ${BDFDB.dotCN.messageaccessory}.censored`).forEach(message => {this.resetMessage(message);});

                BDFDB.unloadMessage(this);
            }
        }
    }

    // Not BD compatible:
    const lastOnline = new LastOnline();