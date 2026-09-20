import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Receipt, MapPin, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch partner details for lifetime earnings
    const { data: partnerData } = await supabase
      .from('delivery_partners')
      .select('total_earnings')
      .eq('id', user?.id)
      .single();
      
    if (partnerData) {
      setLifetimeEarnings(partnerData.total_earnings || 0);
    }

    // Fetch order history
    const { data: orderData } = await supabase
      .from('orders')
      .select('*, order_items(item_name, quantity), customer(name)')
      .eq('delivery_partner_id', user?.id)
      .order('created_at', { ascending: false });

    if (orderData) {
      setOrders(orderData);
      
      // Calculate today's earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const earningsToday = orderData
        .filter(o => o.status === 'delivered' && new Date(o.delivered_at || o.created_at) >= today)
        .reduce((sum, o) => sum + (Number(o.partner_commission) || 0), 0);
        
      setTodayEarnings(earningsToday);
    }
    
    setLoading(false);
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">← Back</Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt size={24} className="text-red-600" />
          My Orders
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Today's Earnings</p>
          <p className="text-2xl font-bold text-green-600">₹{todayEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Lifetime Earnings</p>
          <p className="text-2xl font-bold text-blue-600">₹{lifetimeEarnings.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Order History</h2>
        
        {orders.length === 0 ? (
          <div className="text-center text-gray-500 py-8 bg-white rounded-xl border border-dashed border-gray-200">
            No completed orders yet.
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">Order #{order.order_number || order.id.split('-')[0].toUpperCase()}</h3>
                  <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">₹{order.partner_commission}</div>
                  <div className={`text-xs font-medium px-2 py-1 rounded-full inline-block mt-1 ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-gray-700">{order.customer?.name || 'Customer'}</span>
                    {order.calculated_distance_km ? (
                      <span className="text-gray-500 ml-2">({order.calculated_distance_km} km)</span>
                    ) : null}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-orange-500" />
                    <span>Picked Up: <span className="font-medium">{formatTime(order.picked_up_at)}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    <span>Delivered: <span className="font-medium">{formatTime(order.delivered_at)}</span></span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Items</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {order.order_items?.map((item: any, idx: number) => (
                    <li key={idx} className="flex justify-between">
                      <span>{item.quantity}x {item.item_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
