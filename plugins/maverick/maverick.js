window.Switch = class {
    activate() {
        this.body = document.querySelector('body');
        this.mo = new MutationObserver(this.onMutation.bind(this));
        this.mo.observe(this.body, {
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
        this.mo.disconnect();
    }

    onMutation() {
        this.helpButton = document.querySelector('#app-mount .bd-toolbar .bd-anchor');

        if (this.helpButton && document.getElementById('bd-theme-switch') === null) {
            this.switchButton = ui.div({
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

            this.toolbar = this.helpButton.parentElement;
            this.toolbar.insertBefore(this.switchButton, this.helpButton);

            function getCookie(name) {
                const value = "; " + document.cookie;
                const parts = value.split("; " + name + "=");
                if (parts.length == 2) return parts.pop().split(";").shift();
            }

            const time = new Date();
            const hour = time.getHours();
            if (getCookie('switch') == 'day') {
                return;
            } else if (getCookie('switch') == 'night' || hour >= 20 || hour <= 8) {
                this.switchInput.setAttribute('checked', 'checked');
            }
        }

        // Make it day or night by time.
        if (this.timeSet) return;
        this.timeSet = true;
        const time = new Date();
        const hour = time.getHours();
        if (hour >= 7 && hour <= 19) {
            this.body.classList.add('day');
        }
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