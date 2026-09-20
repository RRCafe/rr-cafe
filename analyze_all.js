async function analyze() {
  const url = 'https://wgdhunmtmtmvduzchqjb.supabase.co/rest/v1/';
  const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGh1bm10bXRtdmR1emNocWpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5OTQ5OSwiZXhwIjoyMTAyMzc1NDk5fQ.tF-vJhijwJ8yLnMMhWhjOyXJ0b1TI-9-dlkU0DllymU'
  };

  const response = await fetch(url, { headers });
  const openapi = await response.json();
  
  for (const table of ['orders', 'payments', 'customer', 'delivery_partners']) {
    const schema = openapi.definitions[table]?.properties;
    if (!schema) { console.log(`\n${table}: NOT FOUND`); continue; }
    console.log(`\n${table.toUpperCase()} COLUMNS:`);
    for (const [col, def] of Object.entries(schema)) {
      console.log(`  - ${col}: ${def.type} ${def.format || ''}`);
    }
  }
  
  // Also check the enum values for order_type and order_status
  const ordersRequired = openapi.definitions.orders.required || [];
  console.log('\nORDERS REQUIRED:', ordersRequired.join(', '));
}
analyze();
