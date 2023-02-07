window.BootlegEmotes = class {
    constructor() {
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);

        this.downId = null;
    }

    activate() {
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mouseup', this.onMouseUp);
    }

    deactivate() {
        this.cleanup();
    }

    cleanup() {
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
    }

    closestEmoji(e) {
        const emoji = e.target.closest('.bd-emojiItem[data-id]');
        if (emoji !== null) {
            const id = emoji.getAttribute('data-id');
            const isGif = emoji.querySelector('[src*=".gif"]') !== null;

            return {
                type: 'emoji',
                id,
                isGif
            };
        }

        const sticker = e.target.closest('.bd-stickerAsset[data-id]');
        if (sticker !== null) {
            const id = sticker.getAttribute('data-id');

            return {
                type: 'sticker',
                id,
                isGif: null
            };
        }

        return null;
    }

    getEmojiUrl(emoji, size) {
        switch (emoji.type) {
            case 'emoji':
                return `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.isGif ? 'gif' : 'png'}?size=${size ?? 48}`;
            case 'sticker':
                return `https://media.discordapp.net/stickers/${emoji.id}.png?size=${size ?? 128}`;
        }
    }

    copyText(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
        } catch (err) {}

        document.body.removeChild(textArea);
    }

    onMouseDown(e) {
        const emoji = this.closestEmoji(e);
        if (emoji === null) return;

        e.preventDefault();

        this.lastId = emoji.id;
    }

    onMouseUp(e) {
        if (e.which !== 2) return;

        const emoji = this.closestEmoji(e);
        if (emoji === null) return;
        if (emoji.id !== this.lastId) return;

        e.preventDefault();

        this.copyText(this.getEmojiUrl(emoji));

        if (!e.ctrlKey) {
            const escapeEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                keyCode: 27,
                which: 27,
                bubbles: true
            });
            e.target.dispatchEvent(escapeEvent);
        }

        const textbox = document.querySelector('[role="textbox"]');

        if (textbox === null) return;

        textbox.focus();

        document.execCommand('paste');

        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
        });
        textbox.dispatchEvent(enterEvent);
    }
}

if (window.PLUGIN_LOADING) {
	module.exports = BootlegEmotes;
} else {
	if (window.bootlegEmotes) {
		window.bootlegEmotes.cleanup();
	}

    window.bootlegEmotes = new BootlegEmotes();
    window.bootlegEmotes.activate();
}
