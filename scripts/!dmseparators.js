//META{"name":"DMSeparators","website":"","source":""}*//

// TODO: Rewrite.
DMSeparators = class {
    getName() {
        return "DMSeparators";
    }

    getVersion() {
        return "0.0.1";
    }

    getAuthor() {
        return "Doru";
    }

    getDescription() {
        return "Separates recent DMs.";
    }

    constructor() {
        this.initConstructor();
    }

    initConstructor() {
        this.weekDays = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ];
        this.monthNames = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December'
        ];
        this.ref = window.XMLHttpRequest.prototype.setRequestHeader;
        this.token = this.createResolvable();
        this.fetched = false;
        this.firstId = 0;
        this.lastId = 0;
        this.dates = {};
        this.order = [];
        this.groups = {};
        const self = this;
        window.XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
            self.headerMock.call(this, header, value, self);
        };
        this.mo = new MutationObserver(this.defer(this.onMutation));
        this.mo.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true
        });
        this.fetchDates();
    }

    fetch(url, args) {
        return fetch(url, args).then(res => res.json());
    }

    async fetchDates() {
        const token = await this.token,
        channels = await this.fetch(`https://discordapp.com/api/v6/users/@me/channels`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            }
        });


        let last = 0;
        channels.forEach(channel => {
            var id = channel.last_message_id || last - 1;
            last = id;
            this.dates[channel.id] = new Date(Number((BigInt(id) >> 22n) + 1420070400000n));
            this.order.push(channel.id);
        });

        this.order.sort((a, b) => this.dates[b].getTime() - this.dates[a].getTime());

        this.fetched = true;

        this.updateDMs();

        // console.log(this.dates, this.order);
    }

    createResolvable() {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        promise.resolve = resolve;
        promise.reject = reject;

        return promise;
    }

    headerMock(header, value, self) {
        if (header == 'Authorization') {
            self.token.resolve(value);
        }
        self.ref.call(this, header, value);
    }

    onMutation() {
        if (!this.fetched) return;

        const scroller = document.querySelector('.bd-privateChannels .bd-scroller');
        if (!scroller) return;

        const chan = scroller.querySelector('.bd-channel');

        if (!chan) return;

        const parent = chan.parentElement;

        const header = parent.querySelector('.bd-privateChannelsHeaderContainer');
        const ids = Array.from(parent.children)
            .filter(a => a && a.href && a.href.includes('/channels/@me/') && !a.querySelector('svg[name="NitroWheel"]'))
            .map(a => a.href.slice(a.href.lastIndexOf('/') + 1));

        if (!header) return;

        if (
            // buffer.nextSibling == header ||
            (header.getAttribute('data-fake') !== 'true' && header.style.display != 'none') ||
            this.firstId != ids[0] ||
            this.lastId != ids[ids.length - 1]
        ) {
            // console.log(header.getAttribute('data-fake') != 'true' && header.style.display != 'none', this.firstId != ids[0], this.lastId != ids[ids.length - 1]);
            // console.log(header);
            // console.log(this.firstId, ids[0]);
            // console.log(this.lastId, ids[ids.length - 1]);
            this.hcls = header.className;
            this.scls = header.querySelector('.bd-headerText').className;
            this.updateDMs();
            return;
        }
    }

    updateDMs() {
        if (!this.fetched || !this.hcls) return;

        // console.log('Called updateDMs');
        let scroller = document.querySelector('.bd-privateChannels .bd-scroller');

        if (!scroller) {
            return;
        }

        this.groups = {};

        const chan = scroller.querySelector('.bd-channel');

        if (!chan) return;

        scroller = chan.parentElement;

        const children = Array.from(scroller.children);
        const filtered = children.filter(li => li.className.includes('channel-'));
        let firsted = false;
        // let i = 0;

        children.forEach(li => {
            if (li.matches('.bd-privateChannelsHeaderContainer')) {
                if (li.getAttribute('data-fake') === 'true') {
                    scroller.scrollTop += li.clientHeight;
                    li.remove();
                } else {
                    li.style.display = 'none';
                }
            } else {
                const a = li;
                if (!a) {
                    return;
                }
                const href = a.getAttribute('href');

                if (!href || !href.startsWith('/channels/@me/') || a.querySelector('svg[name="NitroWheel"]')) return;

                // let isFirst = false;
                const id = href.slice('/channels/@me/'.length);

                if (!firsted) {
                    firsted = true;
                    // isFirst = true;
                    if (this.firstId != id) {
                        this.dates[id] = new Date();
                    }
                    this.firstId = id;
                }

                // if (this.order[i] != id) {
                //     console.log(i, this.order[i], id, isFirst);

                //     const index = this.order.indexOf(id);

                //     // if (isFirst) {
                //     //     i = index;
                //     // }

                //     if (this.order[i] != id) {
                //         console.log('Still not equal');

                //         this.order.splice(index, 1);
                //         this.order.splice(i, 0, id);

                //         console.log('new order', this.order);
                //     }
                // }

                // i++;

                if (!this.dates[id]) {
                    this.dates[id] = new Date();
                }

                const title = this.relativeTime(this.dates[id]);

                if (!this.groups[title]) {
                    this.groups[title] = id;
                    const header = document.createElement('h2');
                    header.setAttribute('data-fake', 'true');
                    header.setAttribute('class', this.hcls);
                    const span = document.createElement('span');
                    span.className = this.scls;
                    span.textContent = title;

                    header.appendChild(span);
                    scroller.insertBefore(header, li);
                }
            }
        });

        this.lastId = filtered[filtered.length - 1].getAttribute('href').slice('/channels/@me/'.length);
    }

    toDate(date) {
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }

    relativeTime(then) {
        const now = new Date(),
        absThen = then.getTime() - then.getTimezoneOffset() * 60 * 1000,
        absNow = now.getTime() - now.getTimezoneOffset() * 60 * 1000,
        dateThen = Math.floor(absThen / 86400000),
        dateNow = Math.floor(absNow / 86400000),
        yearThen = then.getFullYear(),
        yearNow = now.getFullYear();

        if (dateThen == dateNow) {
            return 'Today';
        } else if (dateThen == dateNow - 1) {
            return 'Yesterday';
        } else if (dateNow - dateThen < 7) {
            return this.weekDays[then.getDay()];
        } else if (yearThen == yearNow) {
            return this.monthNames[then.getMonth()];
        } else {
            return yearThen.toString();
        }
    }

    defer(fn) {
        return () => setTimeout(fn.bind(this), 0);
    }

    waitReady(fn) {
        this.interval = setInterval(() => {
            try {
                this.getChatArea();
                clearInterval(this.interval);
                fn();
            } catch(e) {
                // console.log(e)
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
window.dmSeparators = new DMSeparators();