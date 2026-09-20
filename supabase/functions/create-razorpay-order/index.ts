import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      customer_id,
      items,             // [{ menu_item_id, item_name, quantity, unit_price, total_price }]
      order_type,        // 'delivery' | 'dine_in' | 'take_away'
      business_type,
      delivery_address,
      delivery_lat,
      delivery_lng,
      calculated_distance_km,
    } = await req.json();

    if (!customer_id) throw new Error('customer_id is required');
    if (!items || !items.length) throw new Error('items are required');
    if (!order_type) throw new Error('order_type is required');

    const keyId = Deno.env.get('VITE_RAZORPAY_KEY_ID') || Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) throw new Error('Razorpay keys not configured');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- SERVER-SIDE PRICE CALCULATION ---
    // Fetch menu items to get authoritative prices
    const menuItemIds = items.map((i: any) => i.menu_item_id);
    const { data: menuItems, error: menuErr } = await supabaseAdmin
      .from('menu_items')
      .select('id, price')
      .in('id', menuItemIds);

    if (menuErr || !menuItems) throw new Error('Failed to fetch menu item prices');

    const priceMap = new Map(menuItems.map((m: any) => [m.id, Number(m.price)]));
    let items_subtotal = 0;
    const verifiedItems = items.map((item: any) => {
      const serverPrice = priceMap.get(item.menu_item_id);
      if (serverPrice === undefined) throw new Error(`Menu item ${item.menu_item_id} not found`);
      const totalPrice = serverPrice * item.quantity;
      items_subtotal += totalPrice;
      return {
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: serverPrice,
        total_price: totalPrice,
      };
    });

    // Fetch pricing config
    const { data: config } = await supabaseAdmin.from('pricing_config').select('*').single();

    let delivery_fee = 0;
    let partner_commission = 0;
    let owner_platform_fee = 0;

    if (order_type === 'delivery' && config) {
      const distKm = Number(calculated_distance_km) || 0;
      let baseDelivery = config.base_delivery_fee + (distKm * config.per_km_rate);
      if (config.free_delivery_threshold > 0 && items_subtotal >= config.free_delivery_threshold) {
        baseDelivery = 0;
      }
      const platformFee = config.platform_fee_type === 'percentage'
        ? items_subtotal * (config.platform_fee_value / 100)
        : config.platform_fee_value;

      partner_commission = Number(baseDelivery.toFixed(2));
      owner_platform_fee = Number(platformFee.toFixed(2));
      delivery_fee = Number((baseDelivery + platformFee).toFixed(2));
    }

    const grand_total = Number((items_subtotal + delivery_fee).toFixed(2));

    // --- Generate a pre-order UUID (will become the actual order ID after verification) ---
    const pre_order_id = crypto.randomUUID();

    // --- Create Razorpay Order ---
    const auth = btoa(`${keyId}:${keySecret}`);
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(grand_total * 100), // in paise
        currency: 'INR',
        receipt: pre_order_id,
      }),
    });

    const rzpData = await rzpResponse.json();
    if (!rzpResponse.ok) throw new Error(rzpData.error?.description || 'Failed to create Razorpay order');

    return new Response(JSON.stringify({
      razorpay_order_id: rzpData.id,
      amount: grand_total,
      currency: rzpData.currency,
      pre_order_id,
      // Pass verified pricing back so verify function can use it
      verified_payload: {
        customer_id,
        items: verifiedItems,
        order_type,
        business_type: business_type || 'cafe',
        delivery_address: delivery_address || null,
        delivery_lat: delivery_lat || null,
        delivery_lng: delivery_lng || null,
        calculated_distance_km: Number(calculated_distance_km) || 0,
        items_subtotal: Number(items_subtotal.toFixed(2)),
        delivery_fee,
        partner_commission,
        owner_platform_fee,
        grand_total,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 so supabase-js parses body correctly
    });
  }
});
