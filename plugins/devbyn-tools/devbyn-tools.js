window.DevbynTools = class {
    constructor() {
        this.onMutation = this.onMutation.bind(this);
		// this.onResize = this.onResize.bind(this);
		// this.onClick = this.onClick.bind(this);

		this.popout = this.buildPopout();
        this.button = null;

        this.windowState = null;

		// document.addEventListener('click', this.onClick);
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

        this.onMutation();
    }

    deactivate() {
        this.activated = false;

        this.popout.remove();
        this.button?.remove();

        this.observer.disconnect();
    }

    onMouseDown(action, e) {

    }

    getStyles() {
        const { top, left, width, height } = this.windowState;

        return {
            transform: `translate(${top}px, ${left}px)`,
            width: `${width}px`,
            height: `${height}px`,
        };
    }

    buildButton() {
        return ui.div({
            id: 'bd-devbyn-tools',
            text: '</>',
            events: {
                click: this.togglePopout.bind(this)
            }
        });
    }

    buildPopoutTab(headerText, isActive) {
        return ui.div({
            classes: {
                'bd-tab': true,
                'bd-active': isActive
            },
            text: headerText
        });
    }

    buildPopout() {
        const popout = ui.div({
            class: 'bd-devbyn-popout',
            children: [
                ui.div({
                    class: 'bd-toolbar',
                    events: {
                        mousedown: this.onMouseDown.bind(this, 'drag')
                    },
                    children: [
                        ui.div({
                            class: 'bd-button bd-selector',
                            text: '⇱'
                        }),
                        ui.div({
                            class: 'bd-button bd-close',
                            text: 'x',
                            events: {
                                click: this.hidePopout.bind(this)
                            }
                        })
                    ]
                }),
                ui.div({
                    class: 'bd-tabs',
                    children: [
                        this.buildPopoutTab('Selector', true),
                        this.buildPopoutTab('Stylesheet')
                    ]
                }),
                ui.div({
                    class: 'bd-contents'
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
        this.initWindowState();

		this.popoutOpen = true;

        Object.assign(this.popout.style, this.getStyles());
        this.popout.style.display = '';

        document.body.classList.add('devbyn-popout-open');
	}

    initWindowState() {
        if (!this.windowState) {
            const width = 300;
            const height = 300;
            const top = innerHeight / 2 - height / 2;
            const left = innerWidth / 2 - width / 2;

            this.windowState = {
                top,
                left,
                width,
                height
            };
        }
    }

	togglePopout() {
		if (this.popoutOpen) {
			this.hidePopout();
		} else {
			this.showPopout();
		}
	}

    cleanup() {
        this.deactivate();
    }
}

if (window.PLUGIN_LOADING) {
    module.exports = DevbynTools;
} else {
    if (window.devbynTools) {
        window.devbynTools.cleanup();
    }

    window.devbynTools = new DevbynTools();
    window.devbynTools.activate();
}
