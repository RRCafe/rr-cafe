import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyHmacSignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${orderId}|${paymentId}`);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
  const hashHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      pre_order_id,
      verified_payload,  // comes from create-razorpay-order response, passed through by client
    } = await req.json();

    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!RAZORPAY_KEY_SECRET) throw new Error('Razorpay secret not configured');

    // --- STEP 1: Verify HMAC signature ---
    const isValidSig = await verifyHmacSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      RAZORPAY_KEY_SECRET
    );
    if (!isValidSig) throw new Error('Payment signature verification failed');

    // --- STEP 2: Cross-check with Razorpay API ---
    const keyId = Deno.env.get('VITE_RAZORPAY_KEY_ID') || Deno.env.get('RAZORPAY_KEY_ID');
    const auth = btoa(`${keyId}:${RAZORPAY_KEY_SECRET}`);

    const rzpResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    if (!rzpResponse.ok) {
      const errText = await rzpResponse.text();
      throw new Error(`Razorpay API error: ${errText}`);
    }
    const rzpOrder = await rzpResponse.json();

    // Confirm the receipt matches pre_order_id — prevents order spoofing
    if (rzpOrder.receipt !== pre_order_id) {
      throw new Error('Order ID mismatch. Suspicious request rejected.');
    }

    // Confirm the amount matches what was quoted
    const expectedPaise = Math.round(verified_payload.grand_total * 100);
    if (rzpOrder.amount !== expectedPaise) {
      throw new Error(`Amount mismatch. Expected ${expectedPaise} paise, got ${rzpOrder.amount}`);
    }

    // --- STEP 3: Insert Order, Items, and Payment into Supabase ---
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      customer_id, items, order_type, business_type,
      delivery_address, delivery_lat, delivery_lng, calculated_distance_km,
      items_subtotal, delivery_fee, partner_commission, owner_platform_fee, grand_total
    } = verified_payload;

    // Insert the order with the pre_order_id as the actual ID
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        id: pre_order_id,  // use the same UUID that was the Razorpay receipt
        customer_id,
        order_type,
        business_type,
        source: 'app',
        status: 'placed',  // immediately 'placed' — no pending
        items_subtotal,
        delivery_fee,
        partner_commission,
        owner_platform_fee,
        calculated_distance_km,
        delivery_address: order_type === 'delivery' ? delivery_address : null,
        delivery_lat: order_type === 'delivery' ? delivery_lat : null,
        delivery_lng: order_type === 'delivery' ? delivery_lng : null,
        grand_total,
      })
      .select()
      .single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

    // Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: pre_order_id,
      menu_item_id: item.menu_item_id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));
    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems);
    if (itemsError) throw new Error(`Failed to create order items: ${itemsError.message}`);

    // Insert payment record with all Razorpay details
    const { error: paymentError } = await supabaseAdmin.from('payments').insert({
      order_id: pre_order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_status: 'success',
      payment_method: 'online',
      amount: grand_total,
    });
    if (paymentError) throw new Error(`Failed to record payment: ${paymentError.message}`);

    return new Response(JSON.stringify({ success: true, order_id: pre_order_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 so supabase-js always parses body
    });
  }
});
