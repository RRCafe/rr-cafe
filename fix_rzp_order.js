const fs = require('fs');
let code = fs.readFileSync('supabase/functions/create-razorpay-order/index.ts', 'utf8');

code = code.replace(/orderData\.distance_km/g, 'orderData.calculated_distance_km');

code = code.replace(/delivery_fee: Number\(deliveryFee\.toFixed\(2\)\)/, `customer_delivery_charge: Number(deliveryFee.toFixed(2)),
      items_subtotal: Number(itemsSubtotal.toFixed(2))`);

fs.writeFileSync('supabase/functions/create-razorpay-order/index.ts', code, 'utf8');
