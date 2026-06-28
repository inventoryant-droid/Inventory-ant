const fs = require('fs');
const filePath = 'src/products/ai.service.ts';
let data = fs.readFileSync(filePath, 'utf-8');

// The write_to_file payload had literal characters like `\` followed by `\``
// Let's replace \` with `
data = data.replace(/\\`/g, '`');
// Let's replace \$ with $
data = data.replace(/\\\$/g, '$');
// Let's replace \\ with \
data = data.replace(/\\\\/g, '\\');

fs.writeFileSync(filePath, data);
console.log('Fixed ai.service.ts escapes');
