const fs = require('fs');
path = require('path');

let js = fs
    .readdirSync(path.join(__dirname, 'scripts'))
    .map(file => {
        return fs.readFileSync(path.join(__dirname, 'scripts', file));
    })
    .join('\n');
let css = fs
    .readdirSync(path.join(__dirname, 'styles'))
    .map(file => {
        return fs.readFileSync(path.join(__dirname, 'styles', file));
    })
    .join('\n')
    .replace(/\\/g, '\\\\')
    .replace(/\`/g, '\\\`')
    .replace(/\${/g, '\\${')
    .replace(/\*(\w+)/g, '[class*="$1-"]');

var result = `
let style = document.createElement('style');
style.type = 'text/css';
style.rel = 'stylesheet';
document.head.appendChild(style);
style.textContent = \`${css}\`;
for (let rule of style.sheet.rules) {
    if (rule.selectorText && !rule.selectorText.includes('#app-mount')) {
        rule.selectorText = '#app-mount ' + rule.selectorText
    }
}
${js}
`;

fs.writeFileSync(path.join(__dirname, 'packed.js'), result);