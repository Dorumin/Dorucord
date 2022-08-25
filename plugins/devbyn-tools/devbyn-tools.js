// Traverse ^ v < > | Clear

// ◀︎ ▶︎ ▲ ▼

window.DevbynTools = class {
    constructor() {
        this.onMutation = this.onMutation.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onSelectorClick = this.onSelectorClick.bind(this);
		// this.onResize = this.onResize.bind(this);
		// this.onClick = this.onClick.bind(this);

		this.popout = this.buildPopout();
        this.button = null;

        this.windowState = null;
        this.highlightedElement = null;

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

    onSelectorClick() {
    }

    onMouseDown(action, e) {
        console.log('down', action, e);

        this.mouseAction = action;
        this.initialMouse = {
            top: e.screenY,
            left: e.screenX
        };
        this.initialWindowState = {
            ...this.windowState
        };

        window.addEventListener('mousemove', this.onMouseMove, { passive: true });
        window.addEventListener('mouseup', this.onMouseUp, { passive: true });
    }

    getMouseDelta(e) {
        return {
            top: e.screenY - this.initialMouse.top,
            left: e.screenX - this.initialMouse.left
        };
    }

    onMouseMove(e) {
        const delta = this.getMouseDelta(e);

        console.log('move', delta);

        if (this.mouseAction === 'drag') {
            this.windowState.top = this.initialWindowState.top + delta.top;
            this.windowState.left = this.initialWindowState.left + delta.left;

            Object.assign(this.popout.style, this.getStyles());
        }

        if (this.mouseAction === 'selector') {
            if (e.target === this.highlightedElement) return;

            this.highlightedElement.classList.remove('bd-devbyn-highlighted');
            this.highlightedElement = e.target;
            this.highlightedElement.classList.add('bd-devbyn-highlighted');
        }
    }

    onMouseUp() {
        if (this.mouseAction === 'selector') {
            this.selectedElement = this.highlightedElement;
        }

        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
    }

    getStyles() {
        const { top, left, width, height } = this.windowState;

        return {
            transform: `translate(${left}px, ${top}px)`,
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

    buildSelectorTab() {
        const arrow = text => ui.div({
            class: 'bd-traverse-arrow',
            text
        });

        return ui.div({
            class: ['bd-contents', 'bd-selectors'],
            children: [
                ui.div({
                    class: 'bd-controls',
                    children: [
                        ui.div({
                            class: 'bd-traverse',
                            children: [
                                ui.div({
                                    text: 'Traverse'
                                }),
                                arrow('▲'),
                                arrow('▼'),
                                arrow('◀︎'),
                                arrow('▶︎'),
                            ]
                        }),
                        ui.div({
                            class: 'bd-clear',
                            text: 'Clear'
                        })
                    ]
                }),
                ui.div({
                    class: 'bd-highlight-output',
                    children: [
                        ui.div({
                            text: 'Highlighted: '
                        }),
                        this.highlightOutput = ui.div()
                    ]
                })
            ]
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
                            classes: ['bd-button', 'bd-selector'],
                            text: '⇱',
                            events: {
                                click: this.onSelectorClick
                            }
                        }),
                        ui.div({
                            classes: ['bd-button', 'bd-close'],
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
                this.buildSelectorTab()
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
