const fs = require('fs');
let code = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf8');

code = code.replace(/type: orderType,/, "order_type: orderType,");

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', code, 'utf8');
