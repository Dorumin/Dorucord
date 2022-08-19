window.VoiceMessage = class {
    constructor() {
        this.FOCUSED_CLASS = 'focused-3qFvc8';

        this.recorder = null;
    }

	activate() {
		this.activated = true;

        this.mo = new MutationObserver(this.onMutation.bind(this));

        this.mo.observe(document.body, {
            childList: true,
            subtree: true
        });
	}

	deactivate() {
		this.activated = false;

		this.mo.disconnect();
	}

    cleanup() {
        this.mo.disconnect();
    }

    onMutation() {
        const channelAttach = document.getElementById('channel-attach');
        if (channelAttach === null) return;
        if (channelAttach.getAttribute('voice-message-attached') !== null) return;

        channelAttach.setAttribute('voice-message-attached', 'true');

        const button = this.buildButton({
            id: 'channel-attach-voice-message',
            text: 'Record a voice message',
            label: 'Send a voice recording!',
            onClick: this.onVoiceRecordClick.bind(this)
        });

        const scroller = channelAttach.querySelector('.bd-scroller');

        scroller.appendChild(button);
    }

    async onVoiceRecordClick() {
        if (this.recorder) {
            this.recorder.stop();
            this.recorder = null;
            return;
        }

        console.log('bruh');

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });

        const recordedChunks = [];
        this.recorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm'
        });

        this.recorder.addEventListener('dataavailable', function(e) {
            if (e.data.size > 0) recordedChunks.push(e.data);
        });

        this.recorder.addEventListener('stop', function() {
            const blob = new Blob(recordedChunks);
            console.log(blob);
        });

        this.recorder.start();
    }

    buildButton({ id, text, label, onClick }) {
        return ui.div({
            id: id,
            class: 'bd-item bd-labelContainer bd-colorDefault item-1OdjEX labelContainer-2vJzYL colorDefault-CDqZdO',
            role: 'menuitem',
            tabindex: '-1',
            'data-menu-item': 'true',
            events: {
                mouseenter: e => {
                    const parent = e.currentTarget.parentElement;
                    const focuses = parent.getElementsByClassName(this.FOCUSED_CLASS);

                    for (let i = 0; i < focuses.length; i++) {
                        const elem = focuses[i]

                        elem.classList.remove(this.FOCUSED_CLASS);
                        elem.classList.remove('bd-focused');
                    }

                    e.currentTarget.classList.add(this.FOCUSED_CLASS);
                },
                mouseleave: e => {
                    e.currentTarget.classList.remove(this.FOCUSED_CLASS);
                },
                click: onClick
            },
            child: ui.div({
                class: 'bd-label label-2gNW3x',
                children: [
                    ui.div({
                        class: 'bd-optionLabel optionLabel-1o-h-l',
                        children: [
                            ui.svg({
                                class: 'bd-optionIcon optionIcon-1Ft8w0',
                                'aria-hidden': 'false',
                                width: '16',
                                height: '16',
                                viewBox: '0 0 470 470',
                                style: {
                                    height: '18px'
                                },
                                children: [
                                    ui.path({
                                        fill: 'currentColor',
                                        d: 'M350.423,136.148v30h15v50.726c0,71.915-58.508,130.423-130.423,130.423s-130.423-58.507-130.423-130.423v-50.726h15v-30   h-45v80.726C74.577,300.273,138.551,369,220,376.589V440h-90.444v30h210.889v-30H250v-63.411   c81.449-7.589,145.423-76.317,145.423-159.716v-80.726H350.423z'
                                    }),
                                    ui.path({
                                        fill: 'currentColor',
                                        d: 'M235,302.296c47.177,0,85.423-38.245,85.423-85.423V85.423C320.423,38.245,282.177,0,235,0s-85.423,38.245-85.423,85.423   v131.451C149.577,264.051,187.823,302.296,235,302.296z'
                                    })
                                ]
                            }),
                            ui.div({
                                class: 'bd-optionName optionName-1ebPjH',
                                text: text
                            })
                        ]
                    }),
                    ui.div({
                        class: 'bd-subtext subtext-2GlkbE',
                        child: ui.span({
                            class: 'bd-tipSubtext tipSubtext-qn0l_-',
                            children: [
                                label
                            ]
                        })
                    })
                ]
            })
        });
    }
};

if (window.PLUGIN_LOADING) {
	module.exports = VoiceMessage;
} else {
    if (window.voiceMessage) {
        window.voiceMessage.cleanup();
    }

    window.voiceMessage = new VoiceMessage();
}