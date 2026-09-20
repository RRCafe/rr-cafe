import re

with open('apps/admin/src/pages/Orders.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Order interface
interface_target = """  grand_total: number;
  source: string;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_partner_id?: string;
  customer: { name: string; phone: string } | null;
  partner: { name: string; phone_number: string } | null;"""

interface_replacement = """  grand_total: number;
  items_subtotal: number;
  partner_commission: number;
  owner_platform_fee: number;
  source: string;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_partner_id?: string;
  customer: { name: string; phone: string } | null;
  partner: { name: string; phone_number: string; current_lat?: number; current_lng?: number } | null;"""

content = content.replace(interface_target, interface_replacement)

# 2. Add DirectionsRoute import
import_target = "import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';"
import_replacement = """import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { DirectionsRoute } from '../components/DirectionsRoute';"""
content = content.replace(import_target, import_replacement)

# 3. Update LiveDeliveryMap component
map_target = """function LiveDeliveryMap({ orderId, apiKey, initialLat, initialLng }: { orderId: string, apiKey: string, initialLat?: number, initialLng?: number }) {
  const [partnerLoc, setPartnerLoc] = useState<{lat: number, lng: number} | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  useEffect(() => {
    const trackChannel = supabase.channel(`track-${orderId}`)
      .on('broadcast', { event: 'loc' }, (payload) => {
        if (payload.payload) {
          setPartnerLoc({ lat: payload.payload.lat, lng: payload.payload.lng });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(trackChannel); };
  }, [orderId]);

  if (!partnerLoc) return <div className="p-4 text-center text-sm text-gray-500 bg-gray-100 rounded-lg mt-2">Waiting for delivery partner location...</div>;

  return (
    <div className="h-48 w-full rounded-lg overflow-hidden mt-2 border border-gray-200">
      <APIProvider apiKey={apiKey}>
        <Map center={partnerLoc} zoom={16} gestureHandling={'greedy'} disableDefaultUI={true} mapId="live-map-admin">
          <AdvancedMarker position={partnerLoc}>
            <div className="bg-white p-1.5 rounded-full shadow-lg border-2 border-blue-500 text-blue-600">
              <Bike size={20} />
            </div>
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}"""

map_replacement = """function LiveDeliveryMap({ 
  orderId, 
  status,
  apiKey, 
  initialLat, 
  initialLng,
  customerLat,
  customerLng
}: { 
  orderId: string, 
  status: string,
  apiKey: string, 
  initialLat?: number, 
  initialLng?: number,
  customerLat?: number,
  customerLng?: number
}) {
  const [partnerLoc, setPartnerLoc] = useState<{lat: number, lng: number} | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  
  const cafeLoc = { lat: 8.395596, lng: 78.052598 };

  useEffect(() => {
    const trackChannel = supabase.channel(`track-${orderId}`)
      .on('broadcast', { event: 'loc' }, (payload) => {
        if (payload.payload) {
          setPartnerLoc({ lat: payload.payload.lat, lng: payload.payload.lng });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(trackChannel); };
  }, [orderId]);

  if (!partnerLoc) return <div className="p-4 text-center text-sm text-gray-500 bg-gray-100 rounded-lg mt-2">Waiting for delivery partner location...</div>;

  const showRouteToPartner = status === 'preparing' || status === 'ready';
  const showRouteToCustomer = status === 'out_for_delivery' && customerLat && customerLng;

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden mt-2 border border-gray-200">
      <APIProvider apiKey={apiKey}>
        <Map 
          center={partnerLoc} 
          zoom={15} 
          gestureHandling={'greedy'} 
          disableDefaultUI={false} 
          mapTypeControl={false}
          streetViewControl={false}
          mapId="live-map-admin"
        >
          {showRouteToPartner && (
            <DirectionsRoute origin={cafeLoc} destination={partnerLoc} />
          )}
          {showRouteToCustomer && (
            <DirectionsRoute origin={partnerLoc} destination={{ lat: customerLat!, lng: customerLng! }} />
          )}
          <AdvancedMarker position={partnerLoc}>
            <div className="bg-white p-1.5 rounded-full shadow-lg border-2 border-blue-500 text-blue-600">
              <Bike size={20} />
            </div>
          </AdvancedMarker>
          {customerLat && customerLng && (
            <AdvancedMarker position={{ lat: customerLat, lng: customerLng }}>
              <div className="bg-red-500 p-1.5 rounded-full shadow-lg border-2 border-white text-white">
                <MapPin size={20} />
              </div>
            </AdvancedMarker>
          )}
          <AdvancedMarker position={cafeLoc}>
            <div className="bg-orange-500 p-1.5 rounded-full shadow-lg border-2 border-white text-white">
              <MapPin size={20} />
            </div>
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}"""

content = content.replace(map_target, map_replacement)

# 4. Update fetchOrders
fetch_target = """        id, created_at, status, order_type, grand_total, source, delivery_address, delivery_lat, delivery_lng, delivery_partner_id,
        customer(name, phone),
        partner:delivery_partners(name, phone_number),
        payments(razorpay_order_id, razorpay_payment_id, payment_method)"""

fetch_replacement = """        id, created_at, status, order_type, grand_total, items_subtotal, partner_commission, owner_platform_fee, source, delivery_address, delivery_lat, delivery_lng, delivery_partner_id,
        customer(name, phone),
        partner:delivery_partners(name, phone_number, current_lat, current_lng),
        payments(razorpay_order_id, razorpay_payment_id, payment_method)"""

content = content.replace(fetch_target, fetch_replacement)

# 5. Update LiveDeliveryMap invocation
call_target = """                    <LiveDeliveryMap 
                      orderId={selectedOrder.id} 
                      apiKey={mapKey} 
                      initialLat={selectedOrder.delivery_lat} 
                      initialLng={selectedOrder.delivery_lng} 
                    />"""

call_replacement = """                    <LiveDeliveryMap 
                      orderId={selectedOrder.id} 
                      status={selectedOrder.status}
                      apiKey={mapKey} 
                      initialLat={selectedOrder.partner?.current_lat} 
                      initialLng={selectedOrder.partner?.current_lng} 
                      customerLat={selectedOrder.delivery_lat}
                      customerLng={selectedOrder.delivery_lng}
                    />"""

content = content.replace(call_target, call_replacement)

# 6. Update Grand Total UI
total_target = """            <div className="p-6 bg-gray-50 border-t flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Grand Total</p>
                <p className="text-2xl font-bold text-gray-900">₹{selectedOrder.grand_total}</p>
              </div>
            </div>"""

total_replacement = """            <div className="p-6 bg-gray-50 border-t flex flex-col items-end">
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
            </div>"""

content = content.replace(total_target, total_replacement)

with open('apps/admin/src/pages/Orders.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
