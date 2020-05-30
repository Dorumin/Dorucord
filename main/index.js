(function() {
    const createUI = () => {
        const fn = () => {

        };
    };

    window.UI = class {
        constructor() {
            this.knownTags = this.getKnownTags();

            this.setupShorthands();
        }

    }

    window.BetterDorucord = class {
        constructor() {
            this.ui = new UI();
        }

        cleanup() {

        }
    }

    if (window.bd) {
        window.bd.cleanup();
    }

    window.bd = new BetterDorucord();
})();