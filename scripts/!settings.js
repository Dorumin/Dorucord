window.UI_Config = class {
    constructor() {
        this.el = this.init();
    }

    init() {
        return build.div({
            id: 'bd-configuration',
            style: {
                color: 'white',
                display: 'none'
            },
            children: [
                build.div({
                    text: 'BD Configuration',
                    class: 'bd-config-title'
                }),
                this.plugins(),
                this.css()
            ]
        });
    }

    makeHeader(text) {
        return build.div({
            text: text,
            class: 'bd-config-header'
        });
    }

    makeSwitch(name, desc, option) {
        return build.div({
            class: 'bd-config-group',
            children: [
                build.div({
                    class: 'bd-config-switch',
                    children: [
                        build.div({
                            class: 'bd-config-name',
                            text: name
                        }),
                        build.div({
                            class: option == 1 ? 'bd-switch bd-switchChecked' : 'bd-switch',
                            child: build.input({
                                class: 'bd-checkbox',
                                type: 'checkbox',
                            }),
                            events: {
                                click: function(e) {
                                    const me = e.currentTarget;

                                    me.classList.toggle('bd-switchChecked');
                                }
                            },
                        })
                    ],
                }),
                build.div({
                    class: 'bd-config-desc',
                    text: desc
                })
            ]
        });
    }

    plugins() {
        return build.div({
            classes: ['bd-config-plugins', 'bd-config-section'],
            children: [
                this.makeHeader('Plugins'),
                this.makeSwitch('Stickers', 'Global emotes but cheaper', 1),
                this.makeSwitch('DM Separators', 'Sorts your direct messages', 1),
                this.makeSwitch('Theme Switch', 'Switches theme based on the time Discord was loaded', 1),
            ]
        });
    }

    css() {
        // Miss fucking copy paste LMAO
        const vars = [
            '--bd-default',
            '--bd-default-border',
            '--bd-lightest',
            '--bd-lighter',
            '--bd-light',
            '--bd-dark',
            '--bd-darker'
        ];

        const varName = string => {
            let value = string.slice(5);
            return value.charAt(0).toUpperCase() + value.slice(1);
        }

        const varWrapper = build.div({
            class: 'bd-config-css-vars',
            children: vars.map(v => {
                return build.div({
                    class: 'bd-config-css-group',
                    children: [
                        build.div({
                            class: 'bd-config-name',
                            text: varName(v)
                        }),
                        build.div({
                            class: 'bd-config-css-value',
                            child: build.div({
                                class: 'bd-config-css-value-preview',
                                style: {
                                    background: `rgba(var(${v}))`
                                }
                            }),
                            events: {
                                click: e => {
                                    const bound = e.getBoundingClientRect();
                                    this.colorpicker.style.top = `${bound.top - 272}px`;
                                    this.colorpicker.style.left = `${bound.left - this.colorpicker.offsetWidth / 2 + 28}px`
                                }
                            }
                        })
                    ],

                });
            })
        });

        // For future use because my memory's deader than that of a goldfish's
        // const root = getComputedStyle(document.body);
        // root.getPropertyValue('--bd-default');
        // root.style.setProperty('--bd-default', 'new');
        this.picker = new Colorpicker();
        this.colorpicker = this.picker.colorpicker;

        return build.div({
            classes: ['bd-config-css', 'bd-config-section'],
            children: [
                this.makeHeader('CSS'),
                varWrapper,
                this.colorpicker
            ]
        });
    }
}

window.UI = class {
    constructor() {
        this.init();
    }

    init() {
        this.mo = new MutationObserver(this.onMutation.bind(this));

		this.mo.observe(document.querySelector('.bd-layers'), {
			childList: true,
		});
    }

    wait(ms) {
        return new Promise(res => setTimeout(res, ms));
    }

    onMutation() {
        let tries = 10;
        while (tries--) {
            this.settings = this.getSettings();

            if (!this.settings) {
                this.wait(0);
                continue;
            }

            this.getCommonElements();
            this.appendItems(this.settings);
            break;
        }
    }

    getSettings() {
        const settings = document.querySelector(`.bd-layer[aria-label$="_SETTINGS"]`);

        return settings;
    }

    getCommonElements() {
        this.sidebar = this.settings.querySelector('.bd-sidebarRegion .bd-side');
        this.logout = this.findLogout();
        this.nitro = this.findNitro();
        this.configColumn = this.getContentColumn();
        this.selectedClass = this.getSelectedClass();
    }

    findLogout() {
        return Array.from(this.sidebar.childNodes).filter(e => e.textContent.includes('Log Out'))[0];
    }

    findNitro() {
        return Array.from(this.sidebar.childNodes).filter(e => e.textContent.includes('Nitro'))[0];
    }

    getContentColumn() {
        return document.querySelector('.bd-contentColumn');
    }

    getSelectedClass() {
        return Array.from(document.querySelector('.bd-selected.bd-item').classList).filter(e => e.includes('selected'));
    }

    getSelectedItems() {
        return Array.from(this.sidebar.getElementsByClassName(this.selectedClass.join(' ')));
    }

    getClasses() {
        const separator = this.sidebar.querySelector('.bd-separator').className;
        const logout = this.logout.className;

        return {
            separator: separator,
            button: logout
        }
    }

    createButton() {
        const c = this.getClasses();

        const button = build.div({
            class: c.button,
            text: 'BetterDorucord',
            style: {
                color: '#0ff'
            },
            id: 'bd-betterButton'
        });

        return button;
    }

    createSeparator() {
        const c = this.getClasses();

        const separator = build.div({
            class: c.separator
        });

        return separator;
    }

    appendItems() {
        this.button = this.createButton();
        this.separator = this.createSeparator();

        this.sidebar.insertBefore(this.button, this.logout.previousElementSibling);
        this.sidebar.insertBefore(this.separator, this.button);
        this.bindEvents();
        this.appendBDConfiguration();
    }

    appendBDConfiguration() {
        this.config = new UI_Config();

        this.configUI = this.config.el;

        this.configColumn.append(this.configUI);
    }

    replaceContent() {
        Array.from(this.configColumn.children).forEach(e => {
            e.style.display = 'none';
        });
        this.configUI.style.display = 'block';

        const selectedItems = this.getSelectedItems();
        this.selectedClass.forEach(c => {
            selectedItems.forEach(e => {
                e.classList.remove(c);
            });
            this.button.classList.add(c);
        });

        this.button.style.backgroundColor = 'rgba(0, 206, 209, .15)';
        this.nitro.style.color = `rgb(114, 137, 218)`;
        this.nitro.style.backgroundColor = ``;
    }

    bindEvents() {
        this.button.addEventListener('click', this.replaceContent.bind(this));

        this.sidebar.addEventListener('click', e => {
            if (e.target.closest('.bd-item') && e.target != this.button) {
                this.selectedClass.forEach(c => {
                    const selectedItems = this.getSelectedItems();
                    selectedItems.forEach(e => {
                        e.classList.remove(c);
                    });
                    e.target.classList.add(c);
                    this.button.classList.remove(c);
                });
                Array.from(this.configColumn.children).forEach(e => {
                    e.style.display = 'block';
                });
                this.configUI.style.display = 'none';
                this.button.style.backgroundColor = 'transparent';
            }
            if (e.target == this.nitro) {
                this.nitro.style.backgroundColor = `rgb(114, 137, 218)`;
                this.nitro.style.color = `rgb(255, 255, 255)`;
            }
        });
    }

    cleanup() {
        this.button.remove();
        this.separator.remove();
    }

    getElementsByClassName(classes) {
        return document.getElementsByClassName(classes)[0];
    }
}

if (window.ui) {
	window.ui.cleanup();
}

window.ui = new UI();