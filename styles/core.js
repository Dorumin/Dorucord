const fs = require('fs');
const path = require('path');
// I'm guessing BetterDorucord has a styles folder with a core folder
const top = path.join(__dirname, 'core');
const files = fs.readdirSync(top)
  .filter(file => file.endsWith('.css'))
  .map(file => path.join(top, file))
  .map(path => fs.readFileSync(path).toString());

// I don't know where you want this spit out
fs.writeFileSync('styles/core.css', files.join('\n\n'));
console.log( 'Created!');