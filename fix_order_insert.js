const fs = require('fs');
let code = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf8');

code = code.replace(
`      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        delivery_address: orderType === 'delivery' ? deliveryAddress : null,
        delivery_lat: orderType === 'delivery' ? pinLocation.lat : null,
        delivery_lng: orderType === 'delivery' ? pinLocation.lng : null,
        calculated_distance_km: orderType === 'delivery' ? drivingDistanceKm : 0,
        order_type: orderType,
        customer_phone: phoneNumber,
        grand_total: grandTotal
      }).select().single();`,
`      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        customer_id: user.id,
        business_type: cart[0]?.item?.business_type || 'cafe',
        source: 'app',
        status: 'pending',
        items_subtotal: subtotal,
        delivery_fee: deliveryData?.breakdown_internal?.base_delivery || 0,
        platform_fee: deliveryData?.breakdown_internal?.platform_fee || 0,
        delivery_address: orderType === 'delivery' ? deliveryAddress : null,
        delivery_lat: orderType === 'delivery' ? pinLocation.lat : null,
        delivery_lng: orderType === 'delivery' ? pinLocation.lng : null,
        calculated_distance_km: orderType === 'delivery' ? drivingDistanceKm : 0,
        order_type: orderType,
        customer_phone: phoneNumber,
        grand_total: grandTotal
      }).select().single();`
);

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', code, 'utf8');
