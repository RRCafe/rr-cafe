async function check() {
  const url = "https://wgdhunmtmtmvduzchqjb.supabase.co/rest/v1/rpc/increment_partner_earnings";
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGh1bm10bXRtdmR1emNocWpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5OTQ5OSwiZXhwIjoyMTAyMzc1NDk5fQ.tF-vJhijwJ8yLnMMhWhjOyXJ0b1TI-9-dlkU0DllymU",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ partner_id: "00000000-0000-0000-0000-000000000000", amount: 0 })
  });
  const text = await resp.text();
  console.log("Status:", resp.status);
  console.log("Body:", text);
}
check();
