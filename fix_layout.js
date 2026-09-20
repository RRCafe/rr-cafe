const fs = require('fs');
let code = fs.readFileSync('apps/customer/src/layouts/CustomerLayout.tsx', 'utf8');

code = code.replace(/\uFFFD,1/g, '\u20B9');
code = code.replace(/\uFFFD/g, '\u20B9');
code = code.replace(/,1/g, '\u20B9'); // just in case

fs.writeFileSync('apps/customer/src/layouts/CustomerLayout.tsx', code, 'utf8');
