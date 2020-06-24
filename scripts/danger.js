(() => {
    const _error = console.error;

    console.error = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('corrupt')) {

        } else {
            _error.apply(console, args);
        }
    }
})();
