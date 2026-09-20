import os
from supabase import create_client

url = "https://wgdhunmtmtmvduzchqjb.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZGh1bm10bXRtdmR1emNocWpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5OTQ5OSwiZXhwIjoyMTAyMzc1NDk5fQ.tF-vJhijwJ8yLnMMhWhjOyXJ0b1TI-9-dlkU0DllymU"

supabase = create_client(url, key)

try:
    response = supabase.table('orders').select(
        'id, created_at, status, order_type, grand_total, items_subtotal, partner_commission, owner_platform_fee, source, delivery_address, delivery_lat, delivery_lng, delivery_partner_id, customer(name, phone), partner:delivery_partners(name, phone_number, current_lat, current_lng), payments(razorpay_order_id, razorpay_payment_id, payment_method)'
    ).limit(1).execute()
    print("SUCCESS", response.data)
except Exception as e:
    print("ERROR:", str(e))
