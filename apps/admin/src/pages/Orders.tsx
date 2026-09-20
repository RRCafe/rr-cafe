import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, MapPin, X, ExternalLink, Bike } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { DirectionsRoute } from '../components/DirectionsRoute';

interface Order {
  id: string;
  created_at: string;
  status: string;
  order_type: string;
  grand_total: number;
  items_subtotal: number;
  partner_commission: number;
  owner_platform_fee: number;
  source: string;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_partner_id?: string;
  picked_up_at?: string;
  delivered_at?: string;
  customer: { name: string; phone: string } | null;
  partner: { name: string; phone_number: string; current_lat?: number; current_lng?: number } | null;
  payments?: { razorpay_order_id: string, razorpay_payment_id: string, payment_method: string }[];
}

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}


function LiveDeliveryMap({ 
  orderId, 
  status,
  apiKey, 
  initialLat, 
  initialLng,
  customerLat,
  customerLng,
  hasPartner
}: { 
  orderId: string, 
  status: string,
  apiKey: string, 
  initialLat?: number, 
  initialLng?: number,
  customerLat?: number,
  customerLng?: number,
  hasPartner: boolean
}) {
  const [partnerLoc, setPartnerLoc] = useState<{lat: number, lng: number} | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  
  const cafeLoc = { lat: 8.395596, lng: 78.052598 };
  // Center on customer location (user requested)
  const mapCenter = (customerLat && customerLng) 
    ? { lat: customerLat, lng: customerLng } 
    : partnerLoc || cafeLoc;

  useEffect(() => {
    if (!hasPartner) return; // Only subscribe when a partner is assigned
    const trackChannel = supabase.channel(`track-${orderId}`)
      .on('broadcast', { event: 'loc' }, (payload) => {
        if (payload.payload) {
          setPartnerLoc({ lat: payload.payload.lat, lng: payload.payload.lng });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(trackChannel); };
  }, [orderId, hasPartner]);

  const isOutForDelivery = status === 'out_for_delivery';
  const isDelivered = status === 'delivered';
  const isPreparingOrReady = status === 'preparing' || status === 'ready';

  // Route logic per status:
  // - placed/no-partner: café → customer (only if not delivered)
  // - preparing/ready + partner assigned: partner → café + café → customer
  // - out_for_delivery: partner → customer
  // - delivered: NO route, just markers
  const showCafeToCustomer = (!hasPartner || isPreparingOrReady) && customerLat && customerLng && !isDelivered;
  const showPartnerToCafe = hasPartner && isPreparingOrReady && partnerLoc && !isDelivered;
  const showPartnerToCustomer = isOutForDelivery && partnerLoc && customerLat && customerLng;

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden mt-2 border border-gray-200">
      <APIProvider apiKey={apiKey}>
        <Map 
          defaultCenter={mapCenter} 
          defaultZoom={14} 
          gestureHandling={'greedy'} 
          disableDefaultUI={true} 
          mapId="live-map-admin"
        >
          {showCafeToCustomer && (
            <DirectionsRoute origin={cafeLoc} destination={{ lat: customerLat!, lng: customerLng! }} />
          )}
          {showPartnerToCafe && (
            <DirectionsRoute origin={partnerLoc!} destination={cafeLoc} />
          )}
          {showPartnerToCustomer && (
            <DirectionsRoute origin={partnerLoc!} destination={{ lat: customerLat!, lng: customerLng! }} />
          )}
          {partnerLoc && !isDelivered && (
            <AdvancedMarker position={partnerLoc}>
              <div className="bg-white p-1.5 rounded-full shadow-lg border-2 border-blue-500 text-blue-600">
                <Bike size={20} />
              </div>
            </AdvancedMarker>
          )}
          {customerLat && customerLng && (
            <AdvancedMarker position={{ lat: customerLat, lng: customerLng }}>
              <div className="bg-red-500 p-1.5 rounded-full shadow-lg border-2 border-white text-white">
                <MapPin size={20} />
              </div>
            </AdvancedMarker>
          )}
          <AdvancedMarker position={cafeLoc}>
            <div className="bg-white px-2 py-1 rounded-full shadow-lg border-2 border-gray-800 text-gray-800 text-[10px] font-bold">
              Cafe
            </div>
          </AdvancedMarker>
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const mapKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    fetchOrders().then((allOrders) => {
      const orderId = searchParams.get('order_id');
      if (orderId && allOrders) {
        const found = allOrders.find((o: any) => o.id === orderId);
        if (found) viewOrderDetails(found);
      }
    });
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchParams]);

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    `RR-${o.id.split('-')[0].toUpperCase()}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, created_at, status, order_type, grand_total, items_subtotal, partner_commission, owner_platform_fee, source, delivery_address, delivery_lat, delivery_lng, delivery_partner_id, picked_up_at, delivered_at,
        customer(name, phone),
        partner:delivery_partners(name, phone_number, current_lat, current_lng),
        payments(razorpay_order_id, razorpay_payment_id, payment_method)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Cast the result to the expected structure
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
      .select('*')
      .eq('order_id', order.id);
    
    if (!error && data) {
      setSelectedOrderItems(data);
    }
    setModalLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'placed':
      case 'preparing': 
      case 'ready': return 'bg-yellow-100 text-yellow-800';
      case 'out_for_delivery': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Order History</h2>
        <div className="relative w-72" ref={searchRef}>
          <input
            type="text"
            placeholder="Search Order ID (e.g. RR-XXX)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          
          {isDropdownOpen && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">No orders found</div>
              ) : (
                <ul>
                  {filteredOrders.map(order => (
                    <li 
                      key={order.id}
                      onClick={() => {
                        viewOrderDetails(order);
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                      }}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">RR-{order.id.split('-')[0].toUpperCase()}</span>
                        <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-semibold text-gray-600">Order #</th>
              <th className="p-4 font-semibold text-gray-600">Date & Time</th>
              <th className="p-4 font-semibold text-gray-600">Type</th>
              <th className="p-4 font-semibold text-gray-600">Amount (₹)</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No orders found.</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">RR-{order.id.split('-')[0].toUpperCase()}</td>
                  <td className="p-4 text-gray-600">{new Date(order.created_at).toLocaleString()}</td>
                  <td className="p-4 capitalize text-gray-600">{order.order_type.replace('_', ' ')}</td>
                  <td className="p-4 font-medium">₹{order.grand_total}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => viewOrderDetails(order)}
                      className="text-blue-600 hover:text-blue-800 p-2"
                      title="View Details"
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

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="font-bold text-xl">Order RR-{selectedOrder.id.split('-')[0].toUpperCase()}</h3>
                <p className="text-sm text-gray-500">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => { setSelectedOrder(null); setSearchParams({}); }} className="text-gray-500 hover:text-gray-800 bg-gray-100 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Order Info Grid */}
              <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Placed At</p>
                    <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                  {selectedOrder.picked_up_at && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Picked Up At</p>
                      <p className="font-medium text-orange-600">{new Date(selectedOrder.picked_up_at).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedOrder.delivered_at && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Delivered At</p>
                      <p className="font-medium text-green-600">{new Date(selectedOrder.delivered_at).toLocaleString()}</p>
                    </div>
                  )}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Type & Source</p>
                  <p className="font-medium capitalize">{selectedOrder.order_type.replace('_', ' ')} • {selectedOrder.source}</p>
                </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Customer</p>
                    <p className="font-medium">{selectedOrder.customer?.name || 'Walk-in Customer'}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600">{selectedOrder.customer?.phone || 'No phone'}</p>
                      {selectedOrder.customer?.phone && (
                        <a href={`tel:${selectedOrder.customer.phone}`} className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-medium hover:bg-green-100">
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                  {selectedOrder.order_type === 'delivery' && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Delivery Partner</p>
                      <p className="font-medium">{selectedOrder.partner?.name || 'Not assigned yet'}</p>
                      {selectedOrder.partner && (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-600">{selectedOrder.partner.phone_number}</p>
                          <a href={`tel:${selectedOrder.partner.phone_number}`} className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-medium hover:bg-blue-100">
                            Call
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Payment Details</p>
                    <p className="font-medium capitalize">{selectedOrder.payments[0].payment_method.replace('_', ' ')}</p>
                    {selectedOrder.payments[0].razorpay_order_id && (
                      <p className="text-xs text-gray-600 mt-1 break-all">Order ID: {selectedOrder.payments[0].razorpay_order_id}</p>
                    )}
                    {selectedOrder.payments[0].razorpay_payment_id && (
                      <p className="text-xs text-gray-600 break-all">Payment ID: {selectedOrder.payments[0].razorpay_payment_id}</p>
                    )}
                  </div>
                )}
              </div>

              {selectedOrder.delivery_address && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Delivery Address
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="text-gray-600 text-sm mb-2">{selectedOrder.delivery_address}</p>
                    {selectedOrder.delivery_lat && selectedOrder.delivery_lng && (() => {
                        const shopLL = '8.395596,78.052598';
                        const custLL = `${selectedOrder.delivery_lat},${selectedOrder.delivery_lng}`;
                        const partLL = selectedOrder.partner?.current_lat && selectedOrder.partner?.current_lng
                          ? `${selectedOrder.partner.current_lat},${selectedOrder.partner.current_lng}` : null;
                        let mapsUrl = '';
                        const s = selectedOrder.status;
                        if (s === 'placed' || s === 'pending') {
                          mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${custLL}&destination=${shopLL}`;
                        } else if ((s === 'preparing' || s === 'ready') && partLL) {
                          mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${partLL}&destination=${custLL}&waypoints=${shopLL}`;
                        } else if (s === 'out_for_delivery' && partLL) {
                          mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${partLL}&destination=${custLL}`;
                        } else {
                          mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${shopLL}&destination=${custLL}`;
                        }
                        return (
                          <a href={mapsUrl} target="_blank" rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center gap-1"
                          >
                            <ExternalLink size={12} /> View Route in Google Maps
                          </a>
                        );
                      })()}
                  </div>
                  {selectedOrder.order_type === 'delivery' && selectedOrder.delivery_lat && selectedOrder.delivery_lng && (
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
              )}

              {/* Items Table */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Order Items</h4>
                {modalLoading ? (
                  <p className="text-center text-gray-500 py-4">Loading items...</p>
                ) : (
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50 text-sm">
                      <tr>
                        <th className="p-2 text-left font-medium text-gray-600">Item</th>
                        <th className="p-2 text-center font-medium text-gray-600">Qty</th>
                        <th className="p-2 text-right font-medium text-gray-600">Unit Price</th>
                        <th className="p-2 text-right font-medium text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {selectedOrderItems.map(item => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="p-2 text-gray-800">{item.item_name}</td>
                          <td className="p-2 text-center text-gray-600">{item.quantity}</td>
                          <td className="p-2 text-right text-gray-600">₹{item.unit_price}</td>
                          <td className="p-2 text-right font-medium text-gray-800">₹{item.total_price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex flex-col items-end">
              <div className="w-64 space-y-2 mb-4 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Items Subtotal</span>
                  <span>₹{selectedOrder.items_subtotal || 0}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Partner Commission</span>
                  <span>₹{selectedOrder.partner_commission || 0}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Platform Fee</span>
                  <span>₹{selectedOrder.owner_platform_fee || 0}</span>
                </div>
              </div>
              <div className="text-right border-t pt-2 w-64">
                <p className="text-sm text-gray-500 mb-1">Grand Total</p>
                <p className="text-2xl font-bold text-gray-900">₹{selectedOrder.grand_total}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
