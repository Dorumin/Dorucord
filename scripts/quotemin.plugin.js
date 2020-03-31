class Resolvable {
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

class Quotemin {
    constructor() {
        this.token = new Resolvable();

        this.selectedMessage = null;

        this.DISCORD_EPOCH = 1420070400000n;

        this.patchXHR();
        
        this.copied;

        this.selection;

        document.body.addEventListener('contextmenu', this.onContextMenu.bind(this));
        document.body.addEventListener('click', this.onContextMenu.bind(this));
        // document.body.addEventListener('keydown', this.onKeydown.bind(this));
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

    wait(ms) {
        return new Promise(res => setTimeout(res, ms));
    }

    getGroupStart(container) {
        let cont = container.parentElement,
            sibling = cont.previousElementSibling;
    
        while (sibling) {
            if (sibling.matches('[class*="groupStart"]')) return sibling;
            sibling = sibling.previousElementSibling
        }
    }

    getTime() {
        if (!this.selectedMessage) return null;

        const container = this.getMessageContainer();

        if (!container) return null;

        const time = container.querySelector('span[class*="timestamp"] > span');

        if (!time) return null;

        // shit
        const date = new Date(time.getAttribute('aria-label'));

        // Subtract one in case of funny snowflake weirdness... weird
        // Don't ask me, seriously, keep this in
        // I got equal ids, and &after= is not inclusive in its ID
        return date.getTime() - 1;
    }

    getMessageIndex() {
        if (!this.selectedMessage) return null;

        const container = this.getMessageContainer();

        if (!container) return null;

        let i = container.children.length;

        while (i--) {
            const parent = container.children[i];
            if (this.isClosestElement(parent, this.selectedMessage)) {
                return i;
            }
        }

        console.log('Reached zero condition; might be a bug');
        return 0;
    }

    getMessageAvatar(res = 256) {
        if (!this.selectedMessage) return null;

        const container = this.getMessageContainer();

        if (!container) return null;
 

        const img = container.querySelector('h2 img') ? container.querySelector('h2 img') : this.getGroupStart(container).querySelector('h2 img');

        if (!img) return null;

        const src = img.getAttribute('src');

        if (!src) return null;

        return src.replace(/\.(jpg|png|gif|webm|mp4|webp)\?size=\d+$/, `.png?size=${res}`);
    }
    
    isClosestElement(parent, element) {
        if (!parent) return false;
        if (!element) return false;

        let node = element;

        do {
            if (node == parent) return true;
        } while (node = node.parentElement)

        return false;
    }

    getContextMenu() {
        if (document.querySelector('div[class*="contextMenu-"]')) {
            return document.querySelector('div[class*="contextMenu-"]');
        } else {
            return document.querySelector('div[class*="container"][role="menu"]');
        }
    }

    getActiveChannelId() {
        const channel = document.querySelector('a[class*="channel-"][class*="selected-"]');

        if (!channel) return null;

        const href = channel.getAttribute('href');

        if (!href) return null;

        const parts = href.split('/');
        let i = parts.length;

        while (i--) {
            if (!isNaN(parts[i])) {
                return parts[i];
            }
        }

        return null;
    }

    getMessageContainer() {
        if (!this.selectedMessage) return null; 

        return this.selectedMessage.querySelector('div[class*="container-"]');
    }

    getClosestMessage(target) {
        return target.closest('div[class^="chat-"] div[class*="message"]');
    }

    getType() {
        // Fuck Linux support
        return document.querySelector('[class*="type"]').classList.value.indexOf('Mac') > 1 ? 'Mac' : 'Windows';
    }

    killDefault() {
        Array.from(document.querySelectorAll('[class*="label"]'))
            .filter(elem => elem.textContent === 'Quote')
            .forEach(e => e.parentNode.style.display = 'none');
    }

    async onKeydown(e) {
        let shift = e.shiftKey,
            key = e.keyCode == 81;

        if (!shift && !key) return;

        let selection = document.getSelection(),
            selectionText = selection.toString();

        this.selectedMessage = selection.getRangeAt(0).startContainer.parentNode;

        if (!this.selectedMessage) return;

        const channelId = this.getActiveChannelId();

        if (!channelId) return console.log('getActiveChannelId() returned null');

        this.quoteMessage(null, channelId, true, selectionText);
    }

    async onContextMenu(e) {
        this.selectedMessage = this.getClosestMessage(e.target);

        if (!this.selectedMessage && !e.target.closest('[class*="channelTextArea"] [class*="scrollableContainer"]')) return;

        const channelId = this.getActiveChannelId();

        if (!channelId) return console.log('getActiveChannelId() returned null');
        
        let tries = 10;
        while (tries--) {
            const contextMenu = this.getContextMenu();

            if (!contextMenu) {
                await this.wait(0);
                continue;
            }

            this.appendMenuItems(contextMenu, channelId);
            break;
        }
    }

    appendMenuItems(contextMenu, channelId) {
        const target = this.getMenuAppendTarget(contextMenu);
        const action = this.getType() == 'Mac' ? '⌘' : 'Ctrl+';
        const hint = () => {
            let svg = document.querySelector('[style*="display: none"][role="menuitem"] [class*="hint"]');
            if (document.querySelector('[id*="popout"][class*="layer"]')) {
                if (Array.from(document.querySelectorAll('[class*="label"]')).filter(elem => elem.textContent === 'Quote').length) {
                    if (svg) {
                        return svg.innerHTML;
                    }
                    else { 
                        return action + 'Q';
                    }
                } 
            } else return action + 'Q';
        }

        if (!target) return console.log('getMenuAppendTarget() returned null');

        if (document.querySelector('[id*="popout"][class*="layer"]')) {
            this.insertAfter(target,
                this.buildMenuItem({
                    text: 'Copy as quote',
                    onClick: () => this.quoteMessage(contextMenu, channelId, false),
                    contextMenu
                })
            );
            this.insertAfter(target,
                this.buildMenuItem({
                    text: 'Quote',
                    hint: hint(),
                    onClick: () => this.quoteMessage(contextMenu, channelId, true),
                    contextMenu
                })
            );
        } else {
            this.insertAfter(target,
                this.buildMenuItem({
                    text: 'Copy as quote',
                    onClick: () => this.quoteMessage(contextMenu, channelId, false),
                    contextMenu
                })
            );
            this.insertAfter(target,
                this.buildMenuItem({
                    text: 'Quote',
                    hint: hint(),
                    onClick: () => this.quoteMessage(contextMenu, channelId, true),
                    contextMenu
                })
            );
        }
        
        if (this.copied && Array.from(document.querySelectorAll('[class*="label"]')).filter(elem => elem.textContent === 'Paste').length) {
            this.insertAfter(target,
                this.buildMenuItem({
                    text: 'Paste as quote',
                    onClick: () => this.sendEmbed(this.copied, channelId),
                    contextMenu
                })
            );
        } 
    }

    async quoteMessage(contextMenu, channelId, sendNow, selectionText) {
        if (contextMenu != null) contextMenu.style.display = 'none';

        const avatar = this.getMessageAvatar();
        const index = this.getMessageIndex();
        const snowflake = this.timestampToSnowflake(this.getTime());

        const token = await this.token.promise;
        const messages = await this.fetchMessages({
            channel: channelId,
            after: snowflake,
            token
        });

        // Doing this stupid index shit because the array comes reversed
        // And it's faster than calling .reverse() on it
        const message = messages[messages.length - index - 1];

        const embed = this.buildQuoteEmbed(message, channelId, avatar, selectionText);

        if (!embed) return;

        if (sendNow == true) {
            this.sendEmbed(embed, channelId);
        } else {
            this.copied = embed;
        }
    }

    async sendEmbed(embed, channelId) {
        const token = await this.token.promise;

        return fetch(`https://discordapp.com/api/v6/channels/${channelId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                embed
            }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            }
        });
    }

    stringifyEmbed(embed) {
        return embed.replace(/\*\*(.+?)\*\*\n\n/gm, '');
    }

    buildQuoteEmbed(message, channelId, avatar, selectionText) {
        let text = message.author.username

        let description = `**[Click to jump](https://discordapp.com/channels/@me/${channelId}/${message.id})**`

        if (selectionText) {
            description += '\n\n' + selectionText;
        } else if (message.content) {
            description += '\n\n' + message.content;
        } else if (message.embeds.length) {
            // description += '\n\n[embed]';
            description += '\n\n' + this.stringifyEmbed(message.embeds[0].description);
        } 

        if (description.length > 2048) return null;

        let image = undefined;

        if (message.attachments.length) {
            image = message.attachments[0];
        } else if (message.embeds[0] && message.embeds[0].image) {
            image = message.embeds[0].image;
        }

        let author = undefined;

        if (false) {
            author = {
                icon_url: message.author.displayAvatarURL,
                name: `Quoted by ${message.author.username}#${message.author.discriminator}`
            };
        }

        return {
            author,
            color: 0x00ffff,
            description,
            image: image,
            footer: {
                icon_url: avatar,
                text
            },
            timestamp: message.timestamp
        };
    }

    getMenuAppendTarget(contextMenu) {
        const wrapper = contextMenu.querySelector('div[class*="itemGroup"]') || contextMenu;

        const buttons = wrapper.querySelectorAll('div[class*="item-"]:not([class*="danger-"])');

        this.killDefault();

        if (!buttons.length) return null;

        return buttons[buttons.length - 1];
    }

    insertAfter(ref, element) {
        if (!ref) return null;
        if (!element) return null;

        const next = ref.nextSibling;
        const parent = ref.parentNode;

        if (next) {
            parent.insertBefore(element, next);
        } else {
            parent.appendChild(element);
        }
    }

    getMenuItemClasses(contextMenu) {
        const item = contextMenu.querySelector('div[role="menuitem"]');

        if (!item) return null;

        const label = item.querySelector('div[class*="label-"]');
        const hint = item.querySelector('div[class*="hint-"]');

        if (!label) return null;
        if (!hint) return null;

        return {
            item: item.className,
            label: label.className,
            hint: hint.className
        };
    }

    buildMenuItem({
        text,
        hint,
        contextMenu,
        onClick
    }) {
        const classes = this.getMenuItemClasses(contextMenu);

        if (!classes) return null;

        const item = document.createElement('div');
        item.setAttribute('tabindex', '0');
        item.setAttribute('class', classes.item);
        item.setAttribute('role', 'menuitem');
        item.addEventListener('click', onClick);

        const label = document.createElement('div');
        label.setAttribute('class', classes.label);
        label.textContent = text;

        item.appendChild(label);

        if (hint) {
            const hints = document.createElement('div');
            hints.setAttribute('class', classes.hint);
            hints.innerHTML = hint;
            item.appendChild(hints);
        }

        return item;
    }

    timestampToSnowflake(timestamp) {
        const ts = BigInt(timestamp)
        const abs = ts - this.DISCORD_EPOCH;
        const snowflake = abs << 22n;

        return snowflake;
    }

    async fetchMessages({
        channel,
        after,
        token
    }) {
        const response = await fetch(`https://discordapp.com/api/v6/channels/${channel}/messages?limit=100&after=${after}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            }
        });
        const messages = await response.json();

        return messages;
    }
}

window.quotemin = new Quotemin();