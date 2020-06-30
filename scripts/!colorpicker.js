window.Colorpicker = class {
    // Miss fucking copy paste
    constructor() {
        this.initialize();
        this.createColorpicker();
        this.drawCanvas();
    }

    initialize() {
        this.pickerState = {
            hue: 180,
            sat: 100,
            lig: 50,
            alp: 1,
            mousedown: false,
            x: 250,
            y: 0,

            r: 0,
            g: 0,
            b: 0
        };

        this.nextColorUpdate = '';

        this.imageData = null;

        document.body.addEventListener('mousedown', e => {
            if (e.target.closest('#bd-picker-wrapper')) {
                this.pickerState.mousedown = true;
                this.updateCanvasPosition(e);
            }
        });

        document.body.addEventListener('mouseup', e => {
            this.pickerState.mousedown = false;
        });

        document.body.addEventListener('mousemove', e => {
            if (this.pickerState.mousedown) {
                this.updateCanvasPosition(e);
            }
        }, { passive: true });
    }

    updateCanvasPosition(e) {
        const bounds = this.canvas.getBoundingClientRect();
		this.pickerState.x = Math.floor(Math.min(250, Math.abs(Math.min(0, bounds.left - e.clientX))));
        this.pickerState.y = Math.floor(Math.abs(Math.min(0, bounds.top - e.clientY)));

		const color = this.getPixel(250, 150, this.pickerState.x, this.pickerState.y);

		this.pickerState.hue = color.hue;
		this.pickerState.sat = color.sat;
		this.pickerState.lig = color.lig;

		const pointer = document.getElementById('bd-canvas-pointer');

		pointer.style.top = `${this.pickerState.y}px`;
		pointer.style.left = `${this.pickerState.x}px`;

		this.updateCurrentColor();
	}

    getStateColor() {
		const {hue, sat, lig, alp} = this.pickerState;

		return `hsl(${hue}deg, ${sat}%, ${lig}%, ${alp})`;
	}

    updateInputs() {
        const {hue, sat, lig, alp} = this.pickerState;
        const hsla = [`${Math.round(hue)}`, `${Math.round(sat)}%`, `${Math.round(lig)}%`, `${alp}`];

        for (let i = 0; i < 4; i++) {
            document.querySelectorAll('.bd-color-value')[i].value = hsla[i];
        }
    }

	updateCurrentColor() {
        const {hue, sat, lig, alp} = this.pickerState;

		const wasEmpty = this.nextColorUpdate === '';
		this.nextColorUpdate = `hsl(${hue}deg, ${sat}%, ${lig}%, ${alp})`;

		if (!wasEmpty) return;

		requestAnimationFrame(() => {
            this.updateInputs();
            document.body.style.setProperty('--bd-currentColor', this.nextColorUpdate);
            document.body.style.setProperty('--bd-current-color-solid', `hsl(${hue}deg, ${sat}%, ${lig}%)`);
			this.nextColorUpdate = '';
		});
    }

    RGB_TO_HSL(r, g, b) {
        r /= 255, g /= 255, b /= 255;

        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if (max == min) {
            h = s = 0; // achromatic
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch(max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [Math.floor(h * 360), Math.floor(s * 100), Math.floor(l * 100)];
    }

    HSL_TO_RGB(h, s, l) {
        h /= 360; s /= 100; l /= 100;

        var r, g, b;

        if (s == 0) {
            r = g = b = l; // achromatic
        } else {
            var hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            }

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [ Math.round(r * 255), Math.round(g * 255), Math.round(b * 255) ];
    }

    getPixel(width, height, x, y) {
		const coordY = Math.min(y, height - 1);
		const coordX = Math.min(x, width - 1);
		const offset = coordX * 4 + coordY * width * 4;
		const r = this.imageData.data[offset];
		const g = this.imageData.data[offset + 1];
		const b = this.imageData.data[offset + 2];

		const [ hue, sat, lig ] = this.RGB_TO_HSL(r, g, b);

		return {
			hue: hue * 360,
			sat: sat * 100,
			lig: lig * 100
		};
    }

    drawCanvas() {
		const ctx = this.canvas.getContext('2d');
		const width = this.canvas.width;
		const height = this.canvas.height;
		const wg = ctx.createLinearGradient(0, 0, width, 0);
		const bg = ctx.createLinearGradient(0, height, 0, 0);

		wg.addColorStop(0, 'white');
		wg.addColorStop(1, 'rgba(255, 255, 255, 0)');

		bg.addColorStop(0, 'black');
		bg.addColorStop(1, 'rgba(0, 0, 0, 0)');

		ctx.fillStyle = `hsl(${this.pickerState.hue}, 100%, 50%)`;
		ctx.fillRect(0, 0, width, height);

		ctx.fillStyle = wg;
		ctx.fillRect(0, 0, width, height);

		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, width, height);

        this.imageData = ctx.getImageData(0, 0, width, height);
	}

    createColorpicker() {
        this.hueSlider = build.input({
            type: 'range',
            id: 'bd-hue-slider',
            min: 0,
            max: 360,
            value: this.pickerState.hue,
            events: {
                input: e => {
                    this.pickerState.hue = Number(e.target.value);
                    this.drawCanvas();

                    this.updateCurrentColor();
                }
            }
        });

        this.opacitySlider = build.input({
            type: 'range',
            id: 'bd-opacity-slider',
            min: '0',
            max: '100',
            value: '100',
            events: {
                input: e => {
                    document.querySelector('#bd-picker-color').style.opacity = e.target.value / 100;
                    this.pickerState.alp = e.target.value / 100;

                    this.updateCurrentColor();
                }
            }
        });

        const colorInput = (max) => {
            return build.input({
                class: 'bd-color-value',
                maxlength: max ? max : 4
            });
        }

        const colorType = (text) => {
            return build.span({
                text: text,
            });
        }

        const colorCode = build.div({
            id: 'bd-color-code',
            children: [
                build.div({
                    class: 'bd-color-wrapper',
                    children: [colorInput(3), colorType('H')]
                }),
                build.div({
                    class: 'bd-color-wrapper',
                    children: [colorInput(), colorType('S')]
                }),
                build.div({
                    class: 'bd-color-wrapper',
                    children: [colorInput(), colorType('L')]
                }),
                build.div({
                    class: 'bd-color-wrapper',
                    children: [colorInput(), colorType('A')]
                }),
                build.div({
                    class: 'bd-color-swap',
                    child: build.div({
                        class: 'bd-color-swapper'
                    })
                })
            ]
        });

        this.canvas = build.canvas({
            id: 'bd-color-canvas',
            width: 250,
            height: 150,
            events: {
            }
        });

        this.colorpicker = build.div({
            class: 'bd-colorpicker',
            children: [
                build.div({
                    id: 'bd-colorpicker-palette',
                    children: [
                        build.div({
                            id: 'bd-picker-wrapper',
                            children: [
                                this.canvas,
                                build.div({
                                    id: 'bd-canvas-pointer',
                                    style: {
                                        top: `${this.pickerState.y}px`,
                                        left: `${this.pickerState.x}px`
                                    }
                                }),
                            ]
                        }),
                        build.div({
                            id: 'bd-picker-values',
                            children: [
                                build.div({
                                    id: 'bd-picker-current',
                                    children: [
                                        build.div({
                                            id: 'bd-picker-color'
                                        }),
                                        build.div({
                                            id: 'bd-picker-transparent'
                                        })
                                    ]
                                }),
                                build.div({
                                    id: 'bd-picker-input-wrapper',
                                    children: [this.hueSlider, this.opacitySlider]
                                }),
                                colorCode
                            ]
                        }),
                    ]
                }),
                build.div({
                    class: 'bd-colorpicker-arrow'
                })
            ]
        });
    }
}