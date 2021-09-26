window.GroupDMs = class {
    constructor() {
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
        this.fetched = false;
        this.firstId = 0;
        this.lastId = 0;
        this.dates = {};
        this.order = [];
        this.groups = {};

        this.patchXHR();
        this.bindEvents();
        this.fetchDates();
    }

	patchXHR() {
        this.token = this.createResolvable();
		this.oldSRH = window.XMLHttpRequest.prototype.setRequestHeader;

		const self = this;
		window.XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
			self.headerMock.call(this, self, header, value);
		};
	}

	headerMock(self, header, value) {
		if (header === 'Authorization' && value) {
			self.token.resolve(value);
		}

		self.oldSRH.call(this, header, value);
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

        await this.wait(180000);

        this.fetchDates();
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
        const callback = this.defer(this.onMutation);

        this.mo = new MutationObserver(callback);

        this.app.addEventListener('click', callback);
        this.app.addEventListener('keyup', callback);
        this.mo.observe(document.body, {
            attributes: true,
            childList: true
        });
    }

    cleanup() {
        this.mo.disconnect();
    }

    wait(ms) {
        return new Promise(res => setTimeout(res, ms));
    }

    defer(fn) {
        return () => setTimeout(fn.bind(this), 0);
    }
}

if (window.groupDMs) {
    window.groupDMs.cleanup();
}

// window.groupDMs = new GroupDMs();