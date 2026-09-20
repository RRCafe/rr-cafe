const fs = require('fs');
let content = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf-8');
content = content.replace(/\uFFFD,1/g, '?');
content = content.replace(/\uFFFD/g, '?');
content = content.replace(/,1/g, '?');
fs.writeFileSync('apps/customer/src/pages/Cart.tsx', content, 'utf-8');
