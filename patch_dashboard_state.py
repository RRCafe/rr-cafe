import re

with open('apps/delivery/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'const \[activeOrder, setActiveOrder\] = useState<Order \| null>\(null\);', r'const [activeOrders, setActiveOrders] = useState<Order[]>([]);', content)

fetch_target = r"""      const { data: activeOrderData }.*?setAvailableOrders\(availableOrdersData \|\| \[\]\);\n      }"""
fetch_replace = """      const { data: activeOrdersData } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_partner_id', user.id)
        .in('status', ['preparing', 'ready', 'out_for_delivery'])
        .order('created_at', { ascending: true });

      setActiveOrders(activeOrdersData || []);

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
content = re.sub(fetch_target, fetch_replace, content, flags=re.DOTALL)

content = re.sub(r'\}, \[activeOrder, status, user\]\);', r'}, [activeOrders, status, user]);', content)

content = re.sub(r'if \(activeOrder\) \{', r'if (activeOrders.length > 0) {', content)
content = re.sub(r'channel = supabase\.channel\(`track-\$\{activeOrder\.id\}`\);', r'channel = supabase.channel(`track-partner-${user.id}`);', content)
content = re.sub(r'if \(!activeOrder && now - lastDbUpdate > 15 \* 60 \* 1000\) \{', r'if (activeOrders.length === 0 && now - lastDbUpdate > 15 * 60 * 1000) {', content)

# Fix TS error parameter 'order' implicitly has an 'any' type
content = re.sub(r'\{activeOrders\.map\(order => \(', r'{activeOrders.map((order: Order) => (', content)

with open('apps/delivery/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
