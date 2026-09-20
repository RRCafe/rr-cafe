import re

with open('apps/delivery/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """  async function markDelivered(orderId: string) {
    if (!user) return;
    await supabase.from('orders').update({
      status: 'delivered'
    }).eq('id', orderId);
    
    fetchDashboardData();
  }"""

replace = """  async function markPickedUp(orderId: string) {
    if (!user) return;
    await supabase.from('orders').update({
      status: 'out_for_delivery'
    }).eq('id', orderId);
    
    fetchDashboardData();
  }

  async function markDelivered(orderId: string) {
    if (!user) return;
    await supabase.from('orders').update({
      status: 'delivered'
    }).eq('id', orderId);
    
    fetchDashboardData();
  }"""

content = content.replace(target, replace)

with open('apps/delivery/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
