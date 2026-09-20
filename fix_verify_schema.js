const fs = require('fs');
let code = fs.readFileSync('supabase/functions/verify-razorpay-payment/index.ts', 'utf8');

code = code.replace(
  /gateway_payment_id: razorpay_payment_id/, 
  'razorpay_payment_id: razorpay_payment_id, razorpay_order_id: razorpay_order_id, razorpay_signature: razorpay_signature'
);

fs.writeFileSync('supabase/functions/verify-razorpay-payment/index.ts', code, 'utf8');
