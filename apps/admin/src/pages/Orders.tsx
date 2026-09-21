import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, MapPin, X, ExternalLink, Bike, Receipt, ShoppingBag, Truck, Calendar, Phone, Package } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { DirectionsRoute } from '../components/DirectionsRoute';

interface Order {
  id: string;
  created_at: string;
  status: string;
  order_type: string;
  total_amount: number;
  partner_commission: number;
  owner_platform_fee: number;
  source: string;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_partner_id?: string;
  picked_up_at?: string;
  delivered_at?: string;
  order_number?: string;
  customer: { name: string; phone: string } | null;
  partner: { name: string; phone_number: string; current_lat?: number; current_lng?: number } | null;
  payments?: { razorpay_order_id: string, razorpay_payment_id: string, payment_method: string }[];
}

interface OrderItem {
  id: string;
  menu_items?: { name: string, is_veg: boolean };
  quantity: number;
  unit_price: number;
  total_price: number;
}

const getShortOrderId = (id: string) => id.split('-')[0].toUpperCase();

function LiveDeliveryMap({ 
  orderId, status, apiKey, initialLat, initialLng, customerLat, customerLng, hasPartner
}: { 
  orderId: string, status: string, apiKey: string, initialLat?: number, initialLng?: number, customerLat?: number, customerLng?: number, hasPartner: boolean
}) {
  const [partnerLoc, setPartnerLoc] = useState<{lat: number, lng: number} | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  
  const cafeLoc = { lat: 8.395596, lng: 78.052598 };
  const mapCenter = (customerLat && customerLng) ? { lat: customerLat, lng: customerLng } : partnerLoc || cafeLoc;

  useEffect(() => {
    if (!hasPartner) return;
    const trackChannel = supabase.channel(`track-${orderId}`)
      .on('broadcast', { event: 'loc' }, (payload) => {
        if (payload.payload) setPartnerLoc({ lat: payload.payload.lat, lng: payload.payload.lng });
      }).subscribe();
    return () => { supabase.removeChannel(trackChannel); };
  }, [orderId, hasPartner]);

  const isOutForDelivery = status === 'out_for_delivery';
  const isDelivered = status === 'delivered';
  const isPreparingOrReady = status === 'preparing' || status === 'ready';

  const showCafeToCustomer = (!hasPartner || isPreparingOrReady) && customerLat && customerLng && !isDelivered;
  const showPartnerToCafe = hasPartner && isPreparingOrReady && partnerLoc && !isDelivered;
  const showPartnerToCustomer = isOutForDelivery && partnerLoc && customerLat && customerLng;

  return (
    <div className="h-48 md:h-64 w-full rounded-2xl overflow-hidden mt-4 shadow-inner border border-gray-100">
      <APIProvider apiKey={apiKey}>
        <Map defaultCenter={mapCenter} defaultZoom={14} gestureHandling={'greedy'} disableDefaultUI={true} mapId="live-map-admin">
          <AdvancedMarker position={cafeLoc}><MapPin className="text-red-500 w-8 h-8 drop-shadow-md" /></AdvancedMarker>
          {customerLat && customerLng && <AdvancedMarker position={{ lat: customerLat, lng: customerLng }}><MapPin className="text-blue-500 w-8 h-8 drop-shadow-md" /></AdvancedMarker>}
          {partnerLoc && <AdvancedMarker position={partnerLoc}><Bike className="text-purple-600 bg-white p-1 rounded-full shadow-lg w-8 h-8" /></AdvancedMarker>}
          {showCafeToCustomer && <DirectionsRoute origin={cafeLoc} destination={{ lat: customerLat, lng: customerLng }} />}
          {showPartnerToCafe && <DirectionsRoute origin={partnerLoc} destination={cafeLoc} />}
          {showPartnerToCustomer && <DirectionsRoute origin={partnerLoc} destination={{ lat: customerLat, lng: customerLng }} />}
        </Map>
      </APIProvider>
    </div>
  );
}

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mapKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    fetchOrders().then((allOrders) => {
      const orderId = searchParams.get('order_id');
      if (orderId && allOrders) {
        const found = allOrders.find((o: any) => o.id === orderId);
        if (found) viewOrderDetails(found);
      }
    });
  }, [searchParams]);

  const filteredOrders = orders.filter(o => {
    const idNum = o.order_number || getShortOrderId(o.id);
    return o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
           idNum.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, created_at, status, order_type, total_amount, partner_commission, owner_platform_fee, source, delivery_address, delivery_lat, delivery_lng, delivery_partner_id, picked_up_at, delivered_at, order_number,
        customer(name, phone),
        partner:delivery_partners(name, phone_number, current_lat, current_lng),
        payments(razorpay_order_id, razorpay_payment_id, payment_method)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedData = data.map((d: any) => ({
        ...d,
        customer: d.customer || null,
        partner: d.partner || null,
      }));
      setOrders(formattedData);
      setLoading(false);
      return formattedData;
    }
    setLoading(false);
    return null;
  };

  const viewOrderDetails = async (order: Order) => {
    setSearchParams({ order_id: order.id });
    setSelectedOrder(order);
    setModalLoading(true);
    const { data, error } = await supabase
      .from('order_items')
      .select('id, quantity, unit_price, total_price, menu_items(name, is_veg)')
      .eq('order_id', order.id);
    
    if (!error && data) {
      setSelectedOrderItems(data as any);
    }
    setModalLoading(false);
  };

  const closeModal = () => {
    setSearchParams({});
    setSelectedOrder(null);
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'placed':
      case 'preparing': 
      case 'ready': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'out_for_delivery': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">Order History</h2>
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search Order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-4">
          {loading ? (
             <div className="text-center py-12 text-gray-500">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
             <div className="text-center py-12 text-gray-500">No orders found.</div>
          ) : (
            filteredOrders.map((order) => (
              <div 
                key={order.id} 
                onClick={() => viewOrderDetails(order)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Order #{order.order_number || getShortOrderId(order.id)}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(order.created_at)} at {formatTime(order.created_at)}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${getStatusStyle(order.status)}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                
                <div className="flex justify-between items-end mt-4 pt-3 border-t border-gray-50">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{order.order_type.replace('_', ' ')}</span>
                    <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">
                      {order.customer ? order.customer.name : 'Walk-in Customer'}
                    </span>
                  </div>
                  <span className="font-black text-gray-900 text-lg">â‚¹{order.total_amount}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Order ID</th>
                <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date & Time</th>
                <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Customer</th>
                <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Type</th>
                <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Amount</th>
                <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No orders found.</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{order.order_number || getShortOrderId(order.id)}</td>
                    <td className="p-4 text-sm text-gray-600">
                      <div className="font-medium">{formatDate(order.created_at)}</div>
                      <div className="text-gray-400">{formatTime(order.created_at)}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{order.customer?.name || 'Walk-in'}</div>
                      {order.customer?.phone && <div className="text-xs text-gray-500">{order.customer.phone}</div>}
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded-md">{order.order_type.replace('_', ' ')}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md border ${getStatusStyle(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-gray-900">â‚¹{order.total_amount}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => viewOrderDetails(order)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Order View Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center p-0 md:p-4 z-[60]">
          <div className="bg-gray-50 md:rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[90vh] rounded-t-3xl md:rounded-b-3xl transform transition-transform animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-white p-5 md:p-6 border-b border-gray-100 flex justify-between items-start shrink-0 rounded-t-3xl md:rounded-none z-10 sticky top-0 shadow-sm">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Order #{selectedOrder.order_number || getShortOrderId(selectedOrder.id)}</h3>
                <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedOrder.created_at)} â€¢ {formatTime(selectedOrder.created_at)}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto p-4 md:p-6 hide-scrollbar space-y-4 md:space-y-6">
              
              {/* Top Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <Package className="w-6 h-6 text-blue-500 mb-2" />
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Status</span>
                  <span className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${getStatusStyle(selectedOrder.status)}`}>
                    {selectedOrder.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <ShoppingBag className="w-6 h-6 text-purple-500 mb-2" />
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Type</span>
                  <span className="text-sm font-bold text-gray-800 mt-1 capitalize">{selectedOrder.order_type.replace('_', ' ')}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <BanknoteIcon className="w-6 h-6 text-green-500 mb-2" />
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total</span>
                  <span className="text-lg font-black text-gray-900 mt-1 leading-none">â‚¹{selectedOrder.total_amount}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <MonitorSmartphoneIcon className="w-6 h-6 text-orange-500 mb-2" />
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Source</span>
                  <span className="text-sm font-bold text-gray-800 mt-1 capitalize">{selectedOrder.source?.replace('_', ' ') || 'Unknown'}</span>
                </div>
              </div>

              {/* Order Items Receipt Style */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-gray-500" />
                  <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Order Items</h4>
                </div>
                
                <div className="p-4">
                  {modalLoading ? (
                    <div className="text-center py-6 text-gray-400 text-sm font-medium">Loading items...</div>
                  ) : (
                    <div className="space-y-4">
                      {selectedOrderItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div className="flex gap-2.5">
                            <span className="font-semibold text-gray-800 bg-gray-100 text-xs px-1.5 py-0.5 rounded h-max">{item.quantity}x</span>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 text-sm leading-tight flex items-center gap-1.5">
                                <span className="text-[10px]">{item.menu_items?.is_veg ? 'ðŸŸ©' : 'ðŸŸ¥'}</span>
                                {item.menu_items?.name || 'Unknown Item'}
                              </span>
                              <span className="text-xs text-gray-500 font-medium mt-0.5">â‚¹{item.unit_price} each</span>
                            </div>
                          </div>
                          <span className="font-bold text-gray-900 text-sm">â‚¹{item.total_price}</span>
                        </div>
                      ))}
                      
                      <div className="border-t border-dashed border-gray-200 mt-4 pt-4 space-y-2.5">
                        <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-100">
                          <span>Grand Total</span>
                          <span>â‚¹{selectedOrder.total_amount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer & Delivery Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-blue-500" />
                    Customer Details
                  </h4>
                  {selectedOrder.customer ? (
                    <div className="space-y-3">
                      <p className="font-bold text-gray-900 text-lg">{selectedOrder.customer.name}</p>
                      <p className="text-gray-600 font-medium flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {selectedOrder.customer.phone}
                      </p>
                      {selectedOrder.order_type === 'delivery' && (
                        <div className="flex items-start gap-2 mt-2 pt-3 border-t border-gray-50">
                          <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                          <p className="text-gray-600 text-sm font-medium leading-tight">
                            {selectedOrder.delivery_address || 'No address provided'}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-sm font-medium">Walk-in Customer</p>
                  )}
                </div>

                {selectedOrder.order_type === 'delivery' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Bike className="w-5 h-5 text-purple-500" />
                      Delivery Partner
                    </h4>
                    {selectedOrder.partner ? (
                      <div className="space-y-3">
                        <p className="font-bold text-gray-900 text-lg">{selectedOrder.partner.name}</p>
                        <p className="text-gray-600 font-medium flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {selectedOrder.partner.phone_number}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-50">
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <p className="text-[10px] uppercase font-bold text-gray-400">Commission</p>
                            <p className="text-sm font-bold text-purple-700">â‚¹{selectedOrder.partner_commission || 0}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <p className="text-[10px] uppercase font-bold text-gray-400">App Fee</p>
                            <p className="text-sm font-bold text-blue-700">â‚¹{selectedOrder.owner_platform_fee || 0}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col justify-center items-center text-center pb-4">
                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                          <Truck className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium text-sm">No partner assigned yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Map View */}
              {selectedOrder.order_type === 'delivery' && mapKey && (
                <LiveDeliveryMap
                  orderId={selectedOrder.id}
                  status={selectedOrder.status}
                  apiKey={mapKey}
                  initialLat={selectedOrder.partner?.current_lat}
                  initialLng={selectedOrder.partner?.current_lng}
                  customerLat={selectedOrder.delivery_lat}
                  customerLng={selectedOrder.delivery_lng}
                  hasPartner={!!selectedOrder.delivery_partner_id}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon Helpers
function BanknoteIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>; }
function MonitorSmartphoneIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8"/><path d="M10 19v-3.96 3.15"/><path d="M7 19h5"/><rect width="6" height="10" x="16" y="12" rx="2"/></svg>; }
function UserIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }


