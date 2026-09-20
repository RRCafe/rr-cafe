const fs = require('fs');
let cart = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf8');

cart = cart.replace(
`          const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment',`,
`          const { data, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment',`
);

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', cart, 'utf8');
