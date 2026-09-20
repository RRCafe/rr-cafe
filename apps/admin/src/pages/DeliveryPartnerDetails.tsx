import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapPin, ArrowLeft, Clock, CheckCircle } from 'lucide-react';

export default function DeliveryPartnerDetails() {
  const { id } = useParams<{ id: string }>();
  const [partner, setPartner] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayEarnings, setTodayEarnings] = useState(0);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch partner details
    const { data: pData } = await supabase
      .from('delivery_partners')
      .select('*')
      .eq('id', id)
      .single();
      
    if (pData) {
      setPartner(pData);
    }

    // Fetch order history
    const { data: orderData } = await supabase
      .from('orders')
      .select('*, order_items(item_name, quantity), customer(name)')
      .eq('delivery_partner_id', id)
      .order('created_at', { ascending: false });

    if (orderData) {
      setOrders(orderData);
      
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
  if (!partner) return <div className="text-center py-8 text-gray-500">Partner not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/partners" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Partner Details</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {partner.avatar_url || partner.image_url ? (
              <img src={partner.avatar_url || partner.image_url} alt={partner.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl font-bold uppercase">
                {partner.name?.charAt(0) || 'P'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{partner.name || 'Unnamed Partner'}</h2>
              <div className="mt-1 text-sm text-gray-600 space-y-1">
                <p>Phone: {partner.phone_number || 'N/A'} | Email: {partner.email || 'N/A'}</p>
                <p>DOB: {partner.dob || 'N/A'} | Gender: {partner.gender || 'N/A'}</p>
                <p>Address: {partner.address || 'N/A'}</p>
                <p>Vehicle: {partner.vehicle_name || 'N/A'} ({partner.vehicle_number || 'N/A'}) | License: {partner.license_number || 'N/A'}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-2 inline-block ${
              partner.status === 'online' ? 'bg-green-100 text-green-700' :
              partner.status === 'suspend' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {partner.status}
            </div>
            {partner.last_location_update && (
              <div className="text-xs text-gray-500 font-medium">
                Last seen: {new Date(partner.last_location_update).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Today's Earnings</p>
          <p className="text-2xl font-bold text-green-600">₹{todayEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Lifetime Earnings</p>
          <p className="text-2xl font-bold text-blue-600">₹{(partner.total_earnings || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Total Trips</p>
          <p className="text-2xl font-bold text-gray-800">{orders.filter(o => o.status === 'delivered').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Active Deliveries</p>
          <p className="text-2xl font-bold text-orange-600">{orders.filter(o => ['preparing', 'ready', 'out_for_delivery'].includes(o.status)).length}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Order History</h2>
        
        {orders.length === 0 ? (
          <div className="text-center text-gray-500 py-8 bg-white rounded-xl border border-dashed border-gray-200">
            No orders found for this partner.
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-red-300 transition-colors space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Order #{order.order_number || order.id.split('-')[0].toUpperCase()}</h3>
                  <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600 text-lg">₹{order.partner_commission}</div>
                  <div className={`text-xs font-bold uppercase px-2 py-1 rounded-full inline-block mt-1 ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-3 border border-gray-100">
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-gray-800 text-base">{order.customer?.name || 'Customer'}</span>
                    {order.calculated_distance_km ? (
                      <span className="text-gray-500 ml-2 bg-gray-200 px-2 py-0.5 rounded-full text-xs font-medium">{order.calculated_distance_km} km</span>
                    ) : null}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-gray-600 border-t border-gray-200 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                      <Clock size={14} className="text-orange-600" />
                    </div>
                    <span>Picked Up: <span className="font-semibold text-gray-900">{formatTime(order.picked_up_at)}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle size={14} className="text-green-600" />
                    </div>
                    <span>Delivered: <span className="font-semibold text-gray-900">{formatTime(order.delivered_at)}</span></span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Items Included</p>
                  <p className="text-sm text-gray-700">
                    {order.order_items?.map((i: any) => `${i.quantity}x ${i.item_name}`).join(', ')}
                  </p>
                </div>
                <Link 
                  to={`/orders?order_id=${order.id}`}
                  className="shrink-0 ml-4 flex items-center gap-2 text-red-600 hover:text-red-800 font-medium text-sm bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors"
                >
                  Details <ArrowLeft className="rotate-180" size={16} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
