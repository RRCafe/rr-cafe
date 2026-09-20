const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wgdhunmtmtmvduzchqjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGh1bm10bXRtdmR1emNocWpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5OTQ5OSwiZXhwIjoyMTAyMzc1NDk5fQ.tF-vJhijwJ8yLnMMhWhjOyXJ0b1TI-9-dlkU0DllymU'
);

async function analyze() {
  console.log("Analyzing Orders table...");
  // We use csv to get headers (columns) even if the table is empty!
  const { data: ordersData, error: ordersErr } = await supabase.from('orders').select('*').limit(1).csv();
  if (ordersErr) console.error("Orders Error:", ordersErr);
  else {
    const columns = ordersData.split('\n')[0];
    console.log("Orders Columns:", columns);
  }

  console.log("Analyzing Customer table...");
  const { data: customerData, error: customerErr } = await supabase.from('customer').select('*').limit(1).csv();
  if (customerErr) console.error("Customer Error:", customerErr);
  else {
    const columns = customerData.split('\n')[0];
    console.log("Customer Columns:", columns);
  }
}

analyze();
