import re

with open('apps/delivery/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace activeOrder state with activeOrders
content = content.replace("const [activeOrder, setActiveOrder] = useState<Order | null>(null);", "const [activeOrders, setActiveOrders] = useState<Order[]>([]);")

# Fix the fetchDashboardData query
target_query = """      const { data: activeOrderData } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_partner_id', user.id)
        .in('status', ['preparing', 'ready', 'out_for_delivery'])
        .maybeSingle();

      if (activeOrderData) {
        setActiveOrder(activeOrderData);
        setAvailableOrders([]);
      } else {
        setActiveOrder(null);
        const { data: availableOrdersData } = await supabase
          .from('orders')
          .select('*')
          .eq('order_type', 'delivery')
          .in('status', ['preparing', 'ready'])
          .is('delivery_partner_id', null)
          .order('created_at', { ascending: true });
        
        setAvailableOrders(availableOrdersData || []);
      }"""

replace_query = """      const { data: activeOrdersData } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_partner_id', user.id)
        .in('status', ['preparing', 'ready', 'out_for_delivery'])
        .order('created_at', { ascending: true });

      setActiveOrders(activeOrdersData || []);

      // If they have any order that is preparing or ready, they cannot see new orders.
      // If they only have out_for_delivery orders (or none), they can see new orders!
      const hasPreparingOrReady = (activeOrdersData || []).some(o => o.status === 'preparing' || o.status === 'ready');
      
      if (!hasPreparingOrReady) {
        const { data: availableOrdersData } = await supabase
          .from('orders')
          .select('*')
          .eq('order_type', 'delivery')
          .in('status', ['preparing', 'ready'])
          .is('delivery_partner_id', null)
          .order('created_at', { ascending: true });
        
        setAvailableOrders(availableOrdersData || []);
      } else {
        setAvailableOrders([]);
      }"""

content = content.replace(target_query, replace_query)

# Fix dependencies
content = content.replace("}, [activeOrder, status, user]);", "}, [activeOrders, status, user]);")

# Fix location tracking logic
content = content.replace("if (activeOrder) {", "if (activeOrders.length > 0) {")
content = content.replace("channel = supabase.channel(`track-${activeOrder.id}`);", "channel = supabase.channel(`track-partner-${user.id}`);")
content = content.replace("if (!activeOrder && now - lastDbUpdate > 15 * 60 * 1000) {", "if (activeOrders.length === 0 && now - lastDbUpdate > 15 * 60 * 1000) {")

# Fix acceptOrder to refresh immediately
target_accept = """  async function acceptOrder(orderId: string) {
    if (!user || status === 'offline') return;
    await supabase.from('orders').update({
      delivery_partner_id: user.id
    }).eq('id', orderId).is('delivery_partner_id', null);
    fetchDashboardData();
  }"""
replace_accept = """  async function acceptOrder(orderId: string) {
    if (!user || status === 'offline') return;
    await supabase.from('orders').update({
      delivery_partner_id: user.id
    }).eq('id', orderId).is('delivery_partner_id', null);
    fetchDashboardData();
  }
  
  async function markPickedUp(orderId: string) {
    await supabase.from('orders').update({ status: 'out_for_delivery' }).eq('id', orderId);
    fetchDashboardData();
  }
  
  async function markDelivered(orderId: string) {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    fetchDashboardData();
  }"""
content = content.replace(target_accept, replace_accept)

# Remove the old markDelivered since we redeclared it
content = content.replace("""  async function markDelivered(orderId: string) {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    fetchDashboardData();
  }""", "", 1) # Only remove if it existed originally

with open('apps/delivery/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
