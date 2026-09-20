const fs = require('fs');
let code = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf8');

code = code.replace(
`        items_subtotal: subtotal,
        delivery_fee: deliveryData?.breakdown_internal?.base_delivery || 0,
        platform_fee: deliveryData?.breakdown_internal?.platform_fee || 0,`,
`        items_subtotal: subtotal,
        customer_delivery_charge: deliveryData?.total_delivery_charge || 0,
        partner_commission: deliveryData?.breakdown_internal?.base_delivery || 0,
        owner_platform_fee: deliveryData?.breakdown_internal?.platform_fee || 0,`
);

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', code, 'utf8');
