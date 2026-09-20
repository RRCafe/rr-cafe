const fs = require('fs');

function fixEdgeFunction(path) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/status: 400/g, 'status: 200'); // Always return 200 so supabase-js parses the body
  fs.writeFileSync(path, code, 'utf8');
}

fixEdgeFunction('supabase/functions/verify-razorpay-payment/index.ts');
fixEdgeFunction('supabase/functions/create-razorpay-order/index.ts');
fixEdgeFunction('supabase/functions/calculate-delivery-fee/index.ts');

let cart = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf8');

cart = cart.replace(
`          if (verifyError) {
            showAlert("Payment Failed", "Payment verification failed.");
          } else {
            clearCart();
            navigate('/track/' + orderData.id);
          }`,
`          if (verifyError) {
            showAlert("Payment Error", verifyError.message || "Request failed.");
          } else if (data?.error) {
            showAlert("Payment Failed", data.error);
          } else {
            clearCart();
            navigate('/track/' + orderData.id);
          }`
);

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', cart, 'utf8');
