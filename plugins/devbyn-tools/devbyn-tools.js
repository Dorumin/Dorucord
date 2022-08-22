window.DevbynTools = class {
    constructor() {
        this.onMutation = this.onMutation.bind(this);
		// this.onResize = this.onResize.bind(this);
		// this.onClick = this.onClick.bind(this);

		this.popout = this.buildPopout();

		document.addEventListener('click', this.onClick);
		// window.addEventListener('resize', this.onResize);

		this.hidePopout();
    }

    activate() {
        this.activated = true;

        this.observer = new MutationObserver(this.onMutation.bind(this));
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    deactivate() {
        this.activated = false;

        this.observer.disconnect();
    }

    buildButton() {
        return ui.div({
            id: 'bd-devbyn-tools',
            text: '</>',
            events: {
                click: this.showPopout.bind(this)
            }
        });
    }

    buildPopoutTab(headerText, contents) {
        return ui.div({
            class: 'tab',
            children: [
                ui.div({
                    class: 'tab-header',
                    text: headerText
                }),
                ui.div({
                    class: 'tab-contents',
                    children: contents ?? []
                })
            ]
        })
    }

    buildPopout() {
        const popout = ui.div({
            class: 'bd-devbyn-popout',
            children: [
                ui.div({
                    class: 'buttons',
                    children: [
                        ui.div({
                            class: 'pseudo-selector'
                        }),
                        ui.div({
                            class: 'minimize'
                        }),
                        ui.div({
                            class: 'close'
                        })
                    ]
                }),
                ui.div({
                    class: 'tabs',
                    children: [
                        this.buildPopoutTab('Selector'),
                        this.buildPopoutTab('Stylesheet')
                    ]
                })
            ]
        });

        document.body.appendChild(popout);

        return popout;
    }

    onMutation() {
		const existing = document.getElementById('bd-devbyn-tools');
		if (existing) return;

		const helpButton = document.querySelector('#app-mount .bd-toolbar .bd-anchor');
		if (!helpButton) return;

		this.button = this.buildButton();
		helpButton.parentElement.insertBefore(this.button, helpButton);
	}

	hidePopout() {
		this.popoutOpen = false;
		this.popout.style.display = 'none';
		document.body.classList.remove('devbyn-popout-open');
	}

	showPopout() {
		this.popoutOpen = true;
		this.popout.style.display = '';
		document.body.classList.add('devbyn-popout-open');
	}

	togglePopout() {
		if (this.popoutOpen) {
			this.hidePopout();
		} else {
			this.showPopout();
		}
	}

    cleanup() {
        this.observer.disconnect();
    }
}

if (window.PLUGIN_LOADING) {
    module.exports = DevbynTools;
} else {
    if (window.devbynTools) {
        window.devbynTools.cleanup();
    }

    window.devbynTools = new DevbynTools();
    // window.devbynTools.activate();
}