import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Package, MapPin, CheckCircle } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { requestNotificationPermission, showNotification } from '../lib/notifications';

export default function Dashboard() {
  const { user } = useAuth();
  const [partner, setPartner] = useState<any>(null);
  const [status, setStatus] = useState('offline');
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrder, setMyOrder] = useState<any>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
    requestNotificationPermission();

    // ── GPS Location Tracking ──────────────────────────────────────────────
    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          await supabase.from('delivery_partners').update({
            current_lat: pos.coords.latitude,
            current_lng: pos.coords.longitude,
            last_location_update: new Date().toISOString(),
          }).eq('id', user.id);
        },
        (err) => console.warn('GPS error:', err.message),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    
    const handlePageHide = () => {
      if (user) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/delivery_partners?id=eq.${user.id}`;
        fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ status: 'offline' }),
          keepalive: true
        }).catch(err => console.error(err));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);


    const channel = supabase.channel('dashboard_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload: any) => {
        const newOrder = payload.new;
        const oldOrder = payload.old;

        // Notify when admin accepts a delivery order (placed → preparing) — partner should see it immediately
        if (
          newOrder.order_type === 'delivery' &&
          newOrder.status === 'preparing' &&
          oldOrder.status === 'placed' &&
          !newOrder.delivery_partner_id
        ) {
          showNotification(
            '\uD83D\uDCE6 New Delivery Available!',
            { body: `Order #${newOrder.id.split('-')[0].toUpperCase()} is being prepared. \u20B9${newOrder.grand_total}` },
            '/'
          );
        }

        // Also notify when it becomes 'ready' and still has no partner
        if (
          newOrder.order_type === 'delivery' &&
          newOrder.status === 'ready' &&
          oldOrder.status !== 'ready' &&
          !newOrder.delivery_partner_id
        ) {
          showNotification(
            '\u2705 Order Ready for Pickup!',
            { body: `Order #${newOrder.id.split('-')[0].toUpperCase()} is ready. Go pick it up! \u20B9${newOrder.grand_total}` },
            '/'
          );
        }

        // My own order's status changed
        if (newOrder.delivery_partner_id === user.id && oldOrder.status !== newOrder.status) {
          const msgs: Record<string, string> = {
            'preparing': '\uD83D\uDC68\u200D\uD83C\uDF73 Chef is preparing your delivery.',
            'ready': '\u2705 Order ready \u2014 go pick it up!',
            'out_for_delivery': '\uD83C\uDFCD\uFE0F Marked out for delivery.',
            'delivered': '\uD83C\uDF89 Delivered successfully!',
          };
          if (msgs[newOrder.status]) {
            showNotification('Order Update', { body: msgs[newOrder.status] }, '/');
          }
        }

        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_partners', filter: `id=eq.${user.id}` }, fetchDashboardData)
      .subscribe();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      supabase.removeChannel(channel);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [user]);

  async function fetchDashboardData() {
    if (!user) return;
    
    // Fetch partner status
    const { data: pData } = await supabase.from('delivery_partners').select('*').eq('id', user.id).single();
    if (pData) {
      setPartner(pData);
      setStatus(pData.status);
    }
    
    // Fetch available orders — show preparing and ready delivery orders that have no partner yet
    const { data: availData } = await supabase.from('orders').select('*')
      .eq('order_type', 'delivery')
      .in('status', ['preparing', 'ready'])
      .is('delivery_partner_id', null);
    if (availData) setAvailableOrders(availData);

    // Fetch my active order
    const { data: activeData } = await supabase.from('orders').select('*')
      .eq('delivery_partner_id', user.id)
      .in('status', ['preparing', 'ready', 'out_for_delivery'])
      .maybeSingle();
    setMyOrder(activeData || null);

    // Calculate today's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayOrders } = await supabase.from('orders').select('partner_commission, delivered_at, created_at')
      .eq('delivery_partner_id', user.id)
      .eq('status', 'delivered');
      
    if (todayOrders) {
      const eToday = todayOrders
        .filter(o => new Date(o.delivered_at || o.created_at) >= today)
        .reduce((sum, o) => sum + (Number(o.partner_commission) || 0), 0);
      setTodayEarnings(eToday);
    }
  };

  const toggleStatus = async () => {
    const newStatus = status === 'online' ? 'offline' : 'online';
    await supabase.from('delivery_partners').update({ status: newStatus }).eq('id', user?.id);
    setStatus(newStatus);
  };

  const acceptOrder = async (orderId: string) => {
    if (!user) return;
    // Only assign the partner — do NOT touch status to avoid reversing admin-set state
    await supabase.from('orders').update({
      delivery_partner_id: user.id,
    }).eq('id', orderId);
    
    fetchDashboardData();
  };

  const markPickedUp = async (orderId: string) => {
    if (!user) return;
    await supabase.from('orders').update({
      status: 'out_for_delivery',
      picked_up_at: new Date().toISOString()
    }).eq('id', orderId);
    
    fetchDashboardData();
  };

  const markDelivered = async (orderId: string) => {
    if (!myOrder || !user) return;
    await supabase.from('orders').update({
      status: 'delivered',
      delivered_at: new Date().toISOString()
    }).eq('id', orderId);
    
    // Increment earnings
    await supabase.rpc('increment_partner_earnings', {
      partner_id: user.id,
      amount: myOrder.partner_commission
    });
    
    fetchDashboardData();
  };

  if (!partner) return <div>Loading...</div>;

  return (
    <div className="space-y-6 relative">
      {status === 'suspend' && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🚫</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h2>
            <p className="text-gray-600 mb-6">Your delivery partner account has been suspended by the administrator. Please contact support.</p>
          </div>
        </div>
      )}

      {/* Header Stats */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">Current Status</p>
          <p className="font-semibold text-lg capitalize">{status}</p>
        </div>
        <button
          onClick={toggleStatus}
          className={`px-6 py-2 rounded-full font-medium text-white transition-colors ${status === 'online' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'}`}
        >
          Go {status === 'online' ? 'Offline' : 'Online'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500 mb-1">Today's Earnings</p>
          <p className="text-3xl font-bold text-gray-900">₹{todayEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500 mb-1">Lifetime Earnings</p>
          <p className="text-3xl font-bold text-gray-900">₹{partner?.total_earnings || 0}</p>
        </div>
      </div>

      <div>
        {myOrder && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Active Deliveries</h2>
            <div className="space-y-4">
              {[myOrder].map(order => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                  <div className="bg-red-50 p-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-red-700">Order RR-{order.id.split('-')[0].toUpperCase()}</span>
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">Commission: ₹{order.partner_commission || 0}</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex flex-col gap-2 text-gray-700">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${order.status === 'ready' ? 'bg-green-100 text-green-700' : order.status === 'preparing' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{order.status.replace('_', ' ')}</span>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <MapPin className="text-red-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-sm">{order.delivery_address || 'Customer Location'}</p>
                      </div>
                      {order.delivery_lat && order.delivery_lng && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=8.395596,78.052598&destination=${order.delivery_lat},${order.delivery_lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-8 text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1"
                        >
                          View Route in Google Maps
                        </a>
                      )}
                    </div>
                    
                    {order.status === 'out_for_delivery' ? (
                      <button
                        onClick={() => markDelivered(order.id)}
                        className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-medium py-3 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <CheckCircle size={20} />
                        Mark Delivered
                      </button>
                    ) : (
                      <button
                        onClick={() => markPickedUp(order.id)}
                        disabled={order.status !== 'ready'}
                        className={`w-full flex items-center justify-center gap-2 font-medium py-3 rounded-lg transition-colors ${order.status === 'ready' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                      >
                        <Package size={20} />
                        {order.status === 'ready' ? 'Mark Picked Up' : 'Waiting for Cafe (Preparing)'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Available Orders
        </h2>

        {availableOrders.length > 0 ? (
          <div className="space-y-4">
            {availableOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-bold text-gray-900">Order RR-{order.id.split('-')[0].toUpperCase()}</span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                    +₹{order.partner_commission || 0}
                  </span>
                </div>
                <div className="flex gap-2 text-gray-600 text-sm mb-4">
                  <MapPin size={16} className="shrink-0 mt-0.5 text-red-500" />
                  <p className="line-clamp-2">{order.delivery_address || 'Customer Location'}</p>
                </div>
                <button
                  onClick={() => acceptOrder(order.id)}
                  disabled={status === 'offline'}
                  className={`w-full font-medium py-2 rounded-lg transition-colors ${status === 'online' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                >
                  {status === 'online' ? 'Accept Order' : 'Go Online to Accept'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={32} />
            </div>
            <p className="text-gray-500 font-medium">No new orders available</p>
            <p className="text-sm text-gray-400 mt-1">We'll notify you when one arrives.</p>
          </div>
        )}
      </div>
      <Toaster position="bottom-center" />
    </div>
  );
}
