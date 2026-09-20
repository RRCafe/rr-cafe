const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wgdhunmtmtmvduzchqjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGh1bm10bXRtdmR1emNocWpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5OTQ5OSwiZXhwIjoyMTAyMzc1NDk5fQ.tF-vJhijwJ8yLnMMhWhjOyXJ0b1TI-9-dlkU0DllymU'
);

async function test() {
  const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
    body: {
      razorpay_order_id: "order_abc123",
      razorpay_payment_id: "pay_def456",
      razorpay_signature: "dummy_signature",
      system_order_id: "dummy-uuid"
    }
  });

  console.log("Error:", error?.message || error);
  console.log("Data:", data);
}

test();
