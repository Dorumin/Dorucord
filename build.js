const fs = require('fs');
path = require('path');

let js = fs
	.readdirSync(path.join(__dirname, 'scripts'))
	.filter(name => !name.startsWith('!'))
	.filter(name => name.endsWith('.js'))
	.map(file => {
		return fs.readFileSync(path.join(__dirname, 'scripts', file));
	})
	.join('\n');
let css = fs
	.readdirSync(path.join(__dirname, 'styles'))
	.filter(name => !name.startsWith('!'))
	.filter(name => name.endsWith('.css'))
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
${js}
`;

fs.writeFileSync(path.join(__dirname, 'packed.js'), result);