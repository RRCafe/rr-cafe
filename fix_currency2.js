const fs = require('fs');
let text = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf-8');
text = text.replace(/\uFFFD,1/g, '\u20B9');
text = text.replace(/\uFFFD/g, '\u20B9');
fs.writeFileSync('apps/customer/src/pages/Cart.tsx', text, 'utf-8');
