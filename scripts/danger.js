// I don't know what this was for
// I believe Discord used to pick up Dorucord as a corrupted installation
// and was very loud about it in the console
// I will uncomment this if it ever becomes a problem again

// (() => {
//     const _error = console.error;

//     console.error = (...args) => {
//         if (typeof args[0] === 'string' && args[0].includes('corrupt')) {

//         } else {
//             _error.apply(console, args);
//         }
//     }
// })();
