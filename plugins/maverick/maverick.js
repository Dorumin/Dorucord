window.Switch = class {
    activate() {
        if (this.timeSet) return;
        this.timeSet = true;

        if (this.isDay()) {
            this.body.classList.add('day');
        }

        this.body = document.querySelector('body');
        this.observer = new MutationObserver(this.onMutation.bind(this));
        this.observer.observe(this.body, {
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
        this.observer.disconnect();
        this.timeset = false;
        this.body.classList.remove('day');
    }

    isDay() {
        const time = new Date();
        const hour = time.getHours();
        return hour >= 7 && hour <= 19;
    }

    buildSwitch() {
        function getCookie(name) {
            const value = "; " + document.cookie;
            const parts = value.split("; " + name + "=");
            if (parts.length == 2) return parts.pop().split(";").shift();
        }

        return ui.div({
            id: 'bd-theme-switch',
            children: [
                this.switchInput = ui.input({
                    type: 'checkbox',
                    id: 'bd-theme-switch-checkbox',
                    events: {
                        change: () => {
                            // And now for the actual switch
                            if (this.body.classList.contains('day')) {
                                this.body.classList.remove('day');
                                document.cookie = 'switch=night';
                            } else {
                                this.body.classList.add('day');
                                document.cookie = 'switch=day';
                            }
                        }
                    },
                    props: {
                        checked: getCookie('switch') == 'night' || !this.isDay()
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