Switch = class {
	constructor() {
		this.initConstructor();
	}

	initConstructor() {
		this.mo = new MutationObserver(this.onMutation.bind(this));
		this.mo.observe(document.getElementById('app-mount'), {
			attributes: true,
			childList: true,
			subtree: true
		});
	}

	onMutation() {
		// Babyn's way of preventing double run
		if (document.querySelector('#blurredLoginForm') == null && document.querySelector('[class*="authBox"]') != null) {
			this.style = document.createElement('style');
			this.style.id = 'blurredLoginForm'
			this.style.textContent = '#app-mount [class*="leftSplit"] [class*="wrapper"] [class*="authBox"]::before { height: ' + document.querySelector('form[class*="authBox"]').offsetHeight + 'px; }';
			document.head.appendChild(this.style);
		}

		var appMount = document.querySelector('#app-mount');
		if (document.querySelector('#app-mount [class*="app"] [class*="app"] [class*="layers"] div[role="dialog"][class*="layer"] [class*="toolbar"] a[class*="anchor"]') != null && document.querySelector('#dayNightSwitch') == null) {
			this.helpButton = document.querySelector('[class*="toolbar"] a[class*="anchor"]');
			this.toolbar = this.helpButton.parentElement;
			this.switchButton = document.createElement('div'); // Is there no easier way to do this?
			this.switchToggle = document.createElement('div'); // Wtf?
			this.switchInput = document.createElement('input'); // Seriously; I got confused typing this out
			this.switchLabelLeft = document.createElement('label'); // Literally had to open the raw <div> and JS side by side
			this.switchLabel = document.createElement('label');
			this.switchButton.id = 'dayNightSwitch';                 // R
			this.switchToggle.id = 'dayNightToggle';                 // E
			this.switchInput.type = 'checkbox';                      // D
			this.switchInput.name = 'dayNightBox';                   // U
			this.switchInput.id = 'dayNightBox';                     // N
			this.switchLabelLeft.setAttribute('for', 'dayNightBox'); // D
			this.switchLabelLeft.id = 'dayNightLabel-left';          // A
			this.switchLabel.setAttribute('for', 'dayNightBox');     // N
			this.switchLabel.id = 'dayNightLabel';                   // T

			this.switchButton.appendChild(this.switchToggle);
			this.switchToggle.appendChild(this.switchInput);
			this.switchToggle.appendChild(this.switchLabelLeft);
			this.switchToggle.appendChild(this.switchLabel);
			this.toolbar.insertBefore(this.switchButton, this.helpButton);

			// And now for the actual switch
			this.switchInput.addEventListener('change', function() {
				if (appMount.classList.contains('day')) {
					appMount.classList.remove('day');
					document.cookie = 'switch=night';
				} else {
					appMount.classList.add('day');
					document.cookie = 'switch=day';
				}
			});

			function getCookie(name) {
				var value = "; " + document.cookie;
				var parts = value.split("; " + name + "=");
				if (parts.length == 2) return parts.pop().split(";").shift();
			}

			var time = new Date(),
				hour = time.getHours();
			if (getCookie('switch') == 'day') {
				return;
			} else if (getCookie('switch') == 'night' || hour >= 20 || hour <= 8) {
				this.switchInput.setAttribute('checked', 'checked');
			}
		}

		// Make it day or night by time.
		if (this.timeSet) return;
		this.timeSet = true;
		var time = new Date(),
			hour = time.getHours();
		if (hour >= 7 && hour <= 19) {
			appMount.classList.add('day');
		}
	}
}

// Not BD compatible:
Switch = new Switch();