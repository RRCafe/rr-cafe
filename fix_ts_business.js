const fs = require('fs');
let code = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf8');

code = code.replace(/business_type: cart\[0\]\?\.item\?\.business_type \|\| 'cafe',/, "business_type: (cart[0]?.item as any)?.business_type || 'cafe',");

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', code, 'utf8');
