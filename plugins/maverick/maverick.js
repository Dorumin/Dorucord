window.Switch = class {
    constructor() {
        this.onMutation = this.onMutation.bind(this);
    }

    activate() {
        if (this.isDay()) {
            document.body.classList.add('day');
            this.checked = false;
        }

        this.observer = new MutationObserver(this.onMutation);
        this.observer.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true
        });
    }

    deactivate() {
        this.cleanup();
    }

    cleanup() {
        document.getElementById('bd-theme-switch')?.remove();
        document.body.classList.remove('day');
        this.observer.disconnect();
    }

    isDay() {
        const time = new Date();
        const hour = time.getHours();
        return hour >= 7 && hour <= 19;
    }

    buildSwitch() {
        return ui.div({
            id: 'bd-theme-switch',
            children: [
                this.switchInput = ui.input({
                    type: 'checkbox',
                    id: 'bd-theme-switch-checkbox',
                    events: {
                        change: () => {
                            document.body.classList.toggle('day');
                            this.checked = !this.checked;
                        }
                    },
                    props: {
                        checked: this.checked ?? !this.isDay()
                    }
                }),
                ui.label({
                    id: 'bd-theme-switch-label',
                    attrs: {
                        for: 'bd-theme-switch-checkbox'
                    }
                })
            ]
        })
    }

    onMutation() {
        const existing = document.getElementById('bd-theme-switch');
        if (existing) return;

        const helpButton = document.querySelector('#app-mount .bd-toolbar .bd-anchor');
        if (!helpButton) return;

        const themeSwitch = this.buildSwitch();
        helpButton.parentElement.insertBefore(themeSwitch, helpButton);
    }
}

if (window.PLUGIN_LOADING) {
	module.exports = Switch;
} else {
	if (window.switch) {
		window.switch.cleanup();
	}

    window.switch = new Switch();
}
