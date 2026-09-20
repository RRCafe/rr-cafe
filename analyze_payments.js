async function analyze() {
  const url = 'https://wgdhunmtmtmvduzchqjb.supabase.co/rest/v1/';
  const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGh1bm10bXRtdmR1emNocWpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5OTQ5OSwiZXhwIjoyMTAyMzc1NDk5fQ.tF-vJhijwJ8yLnMMhWhjOyXJ0b1TI-9-dlkU0DllymU'
  };

  const response = await fetch(url, { headers });
  const openapi = await response.json();
  
  const paymentsSchema = openapi.definitions.payments.properties;
  console.log("PAYMENTS COLUMNS:");
  for (const [col, def] of Object.entries(paymentsSchema)) {
    console.log(`- ${col}: ${def.type}`);
  }
}
analyze();
