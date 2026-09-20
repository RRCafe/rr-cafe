const fs = require('fs');
let code = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf8');

code = code.replace(/customer_delivery_charge: deliveryData\?\.total_delivery_charge \|\| 0,/, `delivery_fee: deliveryData?.total_delivery_charge || 0,`);
code = code.replace(/customer_phone: phoneNumber,\n\s*/, ``);

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', code, 'utf8');
