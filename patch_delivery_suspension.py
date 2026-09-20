import re

with open('apps/delivery/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update useState
content = content.replace("const [status, setStatus] = useState<'online' | 'offline'>('offline');", 
                          "const [status, setStatus] = useState<'online' | 'offline' | 'suspend'>('offline');")

# 2. Add Partner Channel Subscription
channel_target = """      const channel = supabase
        .channel('public:orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchDashboardData();
        })
        .subscribe();"""
channel_replace = """      const channel = supabase
        .channel('public:orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchDashboardData();
        })
        .subscribe();

      const partnerChannel = supabase
        .channel('public:partner')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_partners', filter: `id=eq.${user.id}` }, (payload) => {
          setStatus(payload.new.status);
          if (payload.new.status === 'suspend') {
            setAvailableOrders([]);
            setActiveOrder(null);
          }
        })
        .subscribe();"""
content = content.replace(channel_target, channel_replace)

# 3. Add unsubscribe
unsub_target = """        supabase.removeChannel(channel);
      };
    }, [user]);"""
unsub_replace = """        supabase.removeChannel(channel);
        supabase.removeChannel(partnerChannel);
      };
    }, [user]);"""
content = content.replace(unsub_target, unsub_replace)

# 4. Handle admin ping status check
ping_target = """        // Listen for admin pings
        pingChannel = supabase.channel('admin_pings');
        pingChannel.on('broadcast', { event: 'request_location' }, () => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {"""
ping_replace = """        // Listen for admin pings
        pingChannel = supabase.channel('admin_pings');
        pingChannel.on('broadcast', { event: 'request_location' }, async () => {
          const { data: check } = await supabase.from('delivery_partners').select('status').eq('id', user?.id).maybeSingle();
          if (check && check.status === 'suspend') {
            setStatus('suspend');
            return;
          }
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {"""
content = content.replace(ping_target, ping_replace)

# 5. Handle Suspension UI
ui_target = """    if (loading) {
      return <div className="text-center py-8 text-gray-500">Loading dashboard...</div>;
    }

    return (
      <div className="max-w-md mx-auto space-y-6">"""

ui_replace = """    if (loading) {
      return <div className="text-center py-8 text-gray-500">Loading dashboard...</div>;
    }

    if (status === 'suspend') {
      return (
        <div className="max-w-md mx-auto p-8 text-center bg-red-50 rounded-xl mt-8">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h2 className="text-2xl font-bold text-red-800 mb-2">Account Suspended</h2>
          <p className="text-red-600">Your delivery partner account has been suspended by the administrator. You cannot take or manage orders at this time.</p>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto space-y-6">"""
content = content.replace(ui_target, ui_replace)

with open('apps/delivery/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
