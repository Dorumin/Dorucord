class Theme {
    constructor() {
        this.initConstructor();
    }

    initConstructor() {
        this.typing = [];
        this.mo = new MutationObserver(this.onMutation.bind(this));

        this.mo.observe(document.getElementById('app-mount'), {
            attributes: true,
            subtree: true
        });
    }

    onMutation() {
        const channels = document.querySelector('div[class^="privateChannels-"]');
        if (!channels) return;
        const typing = Array.from(channels.querySelectorAll('div[class^="channel-"] div[class*="status-"][class*="typing-"]'));
        let i = typing.length,
        j = this.typing.length,
        removed = [],
        added = [];
        while (i--) {
            if (!this.typing.includes(typing[i])) {
                added.push(typing[i]);
            }
        }
        while (j--) {
            if (!typing.includes(this.typing[j])) {
                removed.push(this.typing[j]);
            }
        }
        if (!added.length && !removed.length) return;
        added.forEach(status => status.parentElement.parentElement.classList.add('typing'));
        removed.forEach(status => status.parentElement.parentElement.classList.remove('typing'));
        this.typing = typing;
    }
}

theme = new Theme();