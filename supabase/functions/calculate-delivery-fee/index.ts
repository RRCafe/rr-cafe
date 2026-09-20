import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { items_subtotal, distance_km } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: config, error } = await supabaseAdmin
      .from('pricing_config')
      .select('*')
      .single();

    if (error || !config) {
      throw new Error('Could not fetch pricing configuration');
    }

    let baseDelivery = config.base_delivery_fee + (distance_km * config.per_km_rate);
    
    // Check free delivery threshold
    if (config.free_delivery_threshold > 0 && items_subtotal >= config.free_delivery_threshold) {
      baseDelivery = 0;
    }

    // Calculate hidden platform fee
    let platformFee = 0;
    if (config.platform_fee_type === 'percentage') {
      platformFee = items_subtotal * (config.platform_fee_value / 100);
    } else {
      platformFee = config.platform_fee_value;
    }

    // Combine them as requested by user (hidden from customer)
    const totalDeliveryCharge = baseDelivery + platformFee;

    return new Response(JSON.stringify({
      total_delivery_charge: Number(totalDeliveryCharge.toFixed(2)),
      breakdown_internal: {
        base_delivery: Number(baseDelivery.toFixed(2)),
        platform_fee: Number(platformFee.toFixed(2))
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
