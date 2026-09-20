async function test() {
  const url = 'https://wgdhunmtmtmvduzchqjb.supabase.co/functions/v1/verify-razorpay-payment';
  const headers = {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGh1bm10bXRtdmR1emNocWpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5OTQ5OSwiZXhwIjoyMTAyMzc1NDk5fQ.tF-vJhijwJ8yLnMMhWhjOyXJ0b1TI-9-dlkU0DllymU',
    'Content-Type': 'application/json'
  };
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      razorpay_order_id: "order_abc123",
      razorpay_payment_id: "pay_def456",
      razorpay_signature: "dummy_signature",
      system_order_id: "dummy-uuid"
    })
  });

  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Body:", text);
}
test();
