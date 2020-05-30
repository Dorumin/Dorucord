class Colorpicker {
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
		// console.log(color);
		// console.log(`%c${getStateColor()}`, getStateColor());

		const pointer = document.getElementById('bd-canvas-pointer');

		pointer.style.top = `${this.pickerState.y}px`;
		pointer.style.left = `${this.pickerState.x}px`;

		this.updateCurrentColor();
	}

    getStateColor() {
		const {hue, sat, lig, alp} = this.pickerState;

		return `hsl(${hue}deg, ${sat}%, ${lig}%, ${alp})`;
	}

	updateCurrentColor() {
		const wasEmpty = this.nextColorUpdate === '';
		this.nextColorUpdate = this.getStateColor();

		if (!wasEmpty) return;

		requestAnimationFrame(() => {
			document.body.style.setProperty('--bd-currentColor', this.nextColorUpdate);
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

			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
				break;
			}

			h /= 6;
		}

		return [ h, s, l ];
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
        const hueSlider = build.input({
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

        const opacitySlider = build.input({
            type: 'range',
            id: 'bd-opacity-slider',
            min: '0',
            max: '100',
            value: '100',
            events: {
                input: e => {
                    document.querySelector('#bd-picker-color').style.opacity = e.target.value / 100;
                }
            }
        });

        const colorInput = () => {
            return build.input({
                class: 'bd-color-value'
            });
        }

        const colorType = (text) => {
            return build.span({
                text: text
            })
        }

        const colorCode = build.div({
            id: 'bd-color-code',
            children: [
                build.div({
                    class: 'bd-color-wrapper',
                    children: [colorInput(), colorType('H')]
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
                                    children: [hueSlider, opacitySlider]
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