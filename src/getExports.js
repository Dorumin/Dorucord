module.exports = function(src) {
    const module = { exports: null };
    const window = globalThis;

    eval(src);

    return module.exports;
};