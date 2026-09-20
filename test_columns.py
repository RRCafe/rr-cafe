import os
from supabase import create_client

url = "https://wgdhunmtmtmvduzchqjb.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGh1bm10bXRtdmR1emNocWpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5OTQ5OSwiZXhwIjoyMTAyMzc1NDk5fQ.tF-vJhijwJ8yLnMMhWhjOyXJ0b1TI-9-dlkU0DllymU"
supabase = create_client(url, key)

res = supabase.table('orders').select('*').limit(1).execute()
print("Columns in orders:", list(res.data[0].keys()) if res.data else "No rows")
