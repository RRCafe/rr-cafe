const fs = require('fs');
let cart = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf8');

cart = cart.replace(
`      if (rzpError || !rzpOrder) throw new Error('Razorpay order creation failed');`,
`      if (rzpError) throw new Error('Razorpay order creation failed');
      if (rzpOrder?.error) throw new Error(rzpOrder.error);`
);

cart = cart.replace(
`    const { data, error } = await supabase.functions.invoke('calculate-delivery-fee', {
      body: { items_subtotal: subtotal, distance_km: distKm }
    });
    
    if (!error && data) {`,
`    const { data, error } = await supabase.functions.invoke('calculate-delivery-fee', {
      body: { items_subtotal: subtotal, distance_km: distKm }
    });
    
    if (!error && data && !data.error) {`
);

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', cart, 'utf8');
