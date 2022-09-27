// Traverse ^ v < > | Clear

// ◀︎ ▶︎ ▲ ▼
window.DevbynTools = class {
    constructor() {
        this.onMutation = this.onMutation.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onSelectorClick = this.onSelectorClick.bind(this);
        this.onSelectorSelect = this.onSelectorSelect.bind(this);
		// this.onResize = this.onResize.bind(this);
		// this.onClick = this.onClick.bind(this);

		this.popout = this.buildPopout();
        this.overlay = this.buildOverlay();
        this.button = null;

        this.windowState = null;
        this.highlightElement = null;

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
        this.overlay.remove();
        this.button?.remove();

        this.observer.disconnect();
    }

    traverseUp() {

    }

    traverseRight() {
        this.selectedElement
    }

    traverseDown() {

    }

    traverseLeft() {

    }

    getElementInfo(element) {
        const tag = element.localName;
        const attributes = [...element.attributes]
            .filter(attr => attr.name !== 'class');
        const classes = element.className
            .split(' ')
            .filter(className => className.startsWith('bd-'))
            .join(' ');
        const info = {
            tag,
            class: classes,
        };

        for (const { name, value } of attributes) {
            info[name] = value;
        }

        return info;
    }

    onSelectorClick(e) {
        e.stopPropagation();
        this.mouseAction = 'selector';
        this.selector.classList.add('bd-active');
        window.addEventListener('mousemove', this.onMouseMove, { passive: true });
        window.addEventListener('click', this.onSelectorSelect, {
            once: true,
        });
    }

    onSelectorSelect(e) {
        e.stopPropagation();
        this.mouseAction = null;
        this.overlay.style.display = '';
        this.selector.classList.remove('bd-active');
        this.selectedElement = this.highlightElement;
        this.selectorOutput.innerHTML = '';
        this.selectorOutput.appendChild(this.buildElement(this.selectedElement));
        window.removeEventListener('mousemove', this.onMouseMove);
        return;
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

    updateHighlightInfo() {
        const tagName = this.highlightElement.localName;
        const id = this.highlightElement.id;
        const classes = this.highlightElement.className
            .split(' ')
            .filter(className => className.startsWith('bd-'))
            .join('.');
        const selectors = [ id && `#${id}`, classes && `.${classes}` ]
            .filter(Boolean)
            .join('');
        const [ tag, selector ] = this.highlightOutput.children;

        tag.textContent = tagName;
        selector.textContent = selectors;
    }

    updateHighlightBounds() {
        const { width, height, x, y } = this.highlightElement.getBoundingClientRect();
        this.highlighter.style.width = `${width}px`;
        this.highlighter.style.height = `${height}px`;
        this.highlighter.style.top = `${y}px`;
        this.highlighter.style.left = `${x}px`;
    }

    onMouseMove(e) {
        const delta = this.getMouseDelta(e);

        // console.log('move', delta);

        if (this.mouseAction === 'drag') {
            this.windowState.top = this.initialWindowState.top + delta.top;
            this.windowState.left = this.initialWindowState.left + delta.left;

            Object.assign(this.popout.style, this.getStyles());
        }

        if (this.mouseAction === 'selector') {
            const { clientX, clientY } = e;

            this.overlay.style.display = '';
            this.overlay.scrollHeight;
            const element = document.elementFromPoint(clientX, clientY);
            this.overlay.style.display = 'flex';

            if (element === this.highlightElement) return;
            this.highlightElement = element;
            this.updateHighlightInfo();
            this.updateHighlightBounds();
        }
    }

    onMouseUp() {
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

    buildOverlay() {
        const overlay = ui.div({
            class: 'bd-devbyn-overlay',
            child: this.highlighter = ui.div({
                class: 'bd-devbyn-highlighter'
            })
        });

        document.body.appendChild(overlay);

        return overlay;
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

    buildElement(element, selected) {
        const { tag, ...attributes } = this.getElementInfo(element);
        const hasChildren = element.hasChildNodes();

        const n = text => ui.span({
            class: 'bd-normal',
            text
        });

        const attribute = (name, value) => ui.span({
            class: 'bd-attribute',
            children: [
                ui.span({
                    class: 'bd-attribute-name',
                    text: name
                }),
                n('="'),
                ui.span({
                    class: 'bd-attribute-value',
                    text: value
                }),
                n('"'),
            ]
        });

        const more = () => ui.span({
            class: 'bd-more',
            text: '∙∙∙'
        });

        return ui.div({
            classes: {
                'bd-element': true,
                selected
            },
            children: [
                ui.div({
                    class: 'bd-syntax',
                    children: [
                        n(`<${tag}`),
                        ...Object.entries(attributes).map(([ name, value ]) => attribute(name, value)),
                        n(`${hasChildren ? '>' : '/>'}`),
                        hasChildren && more(),
                        hasChildren && n(`</${tag}>`)
                    ]
                })
            ]
        });
    }

    buildChildren(elements) {
        return [...elements].map(this.buildElement.bind(this));
    }

    buildSelectorTab() {
        const arrow = text => ui.div({
            class: 'bd-traverse-arrow',
            text
        });

        return ui.div({
            classes: ['bd-contents', 'bd-selectors'],
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
                            class: 'bd-highlight-text',
                            text: 'Highlighted: '
                        }),
                        this.highlightOutput = ui.div({
                            class: 'bd-highlight-selector',
                            children: [
                                ui.span({
                                    class: 'bd-element'
                                }),
                                ui.span({
                                    class: 'bd-selectors'
                                })
                            ]
                        })
                    ]
                }),
                this.selectorOutput = ui.div({
                    class: 'bd-selected-output',
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
                        this.selector = ui.div({
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
