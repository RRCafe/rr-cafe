const fs = require('fs');
let code = fs.readFileSync('supabase/functions/create-razorpay-order/index.ts', 'utf8');

code = code.replace(/customer_delivery_charge: Number\(deliveryFee\.toFixed\(2\)\),/, `delivery_fee: Number(deliveryFee.toFixed(2)),`);

fs.writeFileSync('supabase/functions/create-razorpay-order/index.ts', code, 'utf8');
