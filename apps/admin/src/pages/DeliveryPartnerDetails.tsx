import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Clock, CheckCircle, User, Phone, Mail, Calendar, Key, Bike, Map, IndianRupee } from 'lucide-react';

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
    return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <div className="flex h-full items-center justify-center text-gray-500 font-medium">Loading partner details...</div>;
  if (!partner) return <div className="flex h-full items-center justify-center text-gray-500 font-medium">Partner not found.</div>;

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-4 md:p-6 pb-24 md:pb-6 overflow-x-hidden">
      
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4 mb-6 shrink-0 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 w-full overflow-hidden">
        <Link to="/partners" className="p-2 hover:bg-gray-100 bg-gray-50 rounded-full transition-all active:scale-95 text-gray-600 shrink-0">
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight truncate">Partner Details</h1>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar w-full overflow-x-hidden">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 w-full">
          
          {/* Main Profile Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            
            {/* Top Section */}
            <div className="p-5 md:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6 border-b border-gray-50">
              <div className="relative shrink-0">
                {partner.avatar_url || partner.image_url ? (
                  <img src={partner.avatar_url || partner.image_url} alt={partner.name} className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-sm border-2 border-white" />
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-100 to-indigo-50 text-blue-600 rounded-full flex items-center justify-center text-3xl font-black uppercase shadow-sm border-2 border-white">
                    {partner.name?.charAt(0) || 'P'}
                  </div>
                )}
                <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white ${
                  partner.status === 'online' ? 'bg-green-500' :
                  partner.status === 'suspend' ? 'bg-red-500' :
                  'bg-gray-400'
                }`} />
              </div>
              
              <div className="flex-1 text-center sm:text-left min-w-0 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <h2 className="text-2xl font-black text-gray-900 truncate">{partner.name || 'Unnamed Partner'}</h2>
                  <div className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mx-auto sm:mx-0 w-max ${
                    partner.status === 'online' ? 'bg-green-100 text-green-700' :
                    partner.status === 'suspend' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {partner.status}
                  </div>
                </div>

                {/* Badges/Tags instead of clumsy text block */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 text-sm font-medium text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {partner.phone_number || 'N/A'}
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 text-sm font-medium text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {partner.email || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            
            {/* Grid Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100">
              <div className="bg-white p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Bike className="w-3 h-3" /> Vehicle</p>
                <p className="text-sm font-bold text-gray-900">${partner.vehicle_name || 'N/A'}</p>
                <p className="text-xs text-gray-500 mt-0.5">${partner.vehicle_number || 'No Plate'}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Key className="w-3 h-3" /> License</p>
                <p className="text-sm font-bold text-gray-900 break-words">${partner.license_number || 'N/A'}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> DOB</p>
                <p className="text-sm font-bold text-gray-900">${partner.dob || 'N/A'}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Map className="w-3 h-3" /> Location</p>
                <p className="text-sm font-bold text-gray-900 break-words">${partner.address || 'N/A'}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">Gender</p>
                <p className="text-sm font-bold text-gray-900 capitalize">${partner.gender || 'N/A'}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">Govt ID</p>
                <p className="text-sm font-bold text-gray-900">${partner.aadhar_number || partner.govt_id_number || 'N/A'}</p>
              </div>
              <div className="bg-white p-4 col-span-2">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">Bank Details</p>
                <p className="text-sm font-bold text-gray-900">${partner.bank_account_number ? 'A/C: ' + partner.bank_account_number : 'N/A'}</p>
                ${partner.ifsc_code && <p className="text-xs text-gray-500 mt-0.5">IFSC: ${partner.ifsc_code}</p>}
              </div>
            </div>

          </div>

          {/* Earnings Cards - Fixed overflow issues */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-3xl shadow-sm text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20"><IndianRupee className="w-20 h-20" /></div>
              <div className="relative z-10">
                <p className="text-green-100 font-medium text-sm mb-1 uppercase tracking-wider">Today's Earnings</p>
                <div className="text-3xl font-black">â‚¹{todayEarnings.toFixed(2)}</div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5"><CheckCircle className="w-20 h-20 text-gray-900" /></div>
              <div className="relative z-10">
                <p className="text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">Total Orders Delivered</p>
                <div className="text-3xl font-black text-gray-900">{orders.filter(o => o.status === 'delivered').length}</div>
              </div>
            </div>
          </div>

          {/* Order History */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6 w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Order History
            </h3>
            
            {orders.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Bike className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">No orders completed yet.</p>
              </div>
            ) : (
              <div className="space-y-3 w-full">
                {orders.map(order => (
                  <Link to={`/?order_id=\${order.id}`} key={order.id} className="block border border-gray-100 rounded-2xl p-4 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all w-full flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-900 text-sm truncate">Order #{order.order_number || order.id.split('-')[0].toUpperCase()}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(order.created_at)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatTime(order.created_at)}</span>
                        {order.customer?.name && <span className="flex items-center gap-1 truncate"><User className="w-3.5 h-3.5" /> {order.customer.name}</span>}
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t sm:border-t-0 sm:border-l border-gray-200 pt-3 sm:pt-0 sm:pl-4 shrink-0 gap-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Commission</span>
                      <span className="font-black text-green-600 text-lg">â‚¹{order.partner_commission || 0}</span>
                          </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

