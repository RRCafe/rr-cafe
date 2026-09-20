import re

with open('apps/delivery/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
imports = """import { useAuth } from '../contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { DirectionsRoute } from '../components/DirectionsRoute';"""

content = re.sub(r"import \{ useAuth \} from '../contexts/AuthContext';\nimport \{ Toaster, toast \} from 'react-hot-toast';", imports, content)

# 2. Update Order Interface
old_order_int = """interface Order {
  id: string;
  created_at: string;
  delivery_fee: number;
  partner_commission: number;
  status: string;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
}"""

new_order_int = """interface Order {
  id: string;
  created_at: string;
  delivery_fee: number;
  partner_commission: number;
  calculated_distance_km: number;
  status: string;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
}"""
content = content.replace(old_order_int, new_order_int)

# 3. Add LiveDeliveryMap component for Partner
map_comp = """function LiveDeliveryMap({ 
  status,
  apiKey, 
  partnerLoc, 
  customerLat,
  customerLng
}: { 
  status: string,
  apiKey: string, 
  partnerLoc?: {lat: number, lng: number} | null,
  customerLat?: number,
  customerLng?: number
}) {
  const cafeLoc = { lat: 8.395596, lng: 78.052598 };

  const isPreparingOrReady = status === 'preparing' || status === 'ready';
  const isOutForDelivery = status === 'out_for_delivery';
  
  const showPartnerToCafe = isPreparingOrReady && partnerLoc;
  const showCafeToCustomer = isPreparingOrReady;
  const showPartnerToCustomer = isOutForDelivery && partnerLoc && customerLat && customerLng;

  const defaultCenter = partnerLoc || cafeLoc;

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden mt-4 border border-gray-200">
      <APIProvider apiKey={apiKey}>
        <Map 
          defaultCenter={defaultCenter} 
          zoom={14} 
          gestureHandling={'greedy'} 
          disableDefaultUI={true} 
          mapId="tracking-map-partner"
        >
          {showCafeToCustomer && customerLat && customerLng && (
            <DirectionsRoute origin={cafeLoc} destination={{ lat: customerLat, lng: customerLng }} />
          )}
          {showPartnerToCafe && (
            <DirectionsRoute origin={partnerLoc!} destination={cafeLoc} />
          )}
          {showPartnerToCustomer && (
            <DirectionsRoute origin={partnerLoc!} destination={{ lat: customerLat!, lng: customerLng! }} />
          )}
          
          {partnerLoc && (
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
            <div className="bg-white p-1.5 rounded-full shadow-lg border-2 border-gray-800 text-gray-800 text-[10px] font-bold">
              Cafe
            </div>
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}
"""

content = re.sub(r'export default function Dashboard\(\) \{', map_comp + '\nexport default function Dashboard() {', content)

# 4. Add currentLocation state and mapKey
old_state = """  const [earnings, setEarnings] = useState(0);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);"""

new_state = """  const [earnings, setEarnings] = useState(0);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const mapKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;"""

content = content.replace(old_state, new_state)

# 5. Update currentLocation in fetchLocation
old_fetch_loc = """              (position) => {
                const { latitude, longitude } = position.coords;
                
                if (channel) {"""

new_fetch_loc = """              (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentLocation({ lat: latitude, lng: longitude });
                
                if (channel) {"""
content = content.replace(old_fetch_loc, new_fetch_loc)

# 6. Fetch calculated_distance_km
content = content.replace("select('id, created_at, delivery_fee, partner_commission, status, delivery_address, delivery_lat, delivery_lng')", "select('id, created_at, delivery_fee, partner_commission, calculated_distance_km, status, delivery_address, delivery_lat, delivery_lng')")

# 7. Add LiveDeliveryMap to active order
old_active = """                        {order.delivery_lat && order.delivery_lng && (
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
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">"""

new_active = """                        {order.delivery_lat && order.delivery_lng && (
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
                      <LiveDeliveryMap 
                        status={order.status}
                        apiKey={mapKey || ''}
                        partnerLoc={currentLocation}
                        customerLat={order.delivery_lat}
                        customerLng={order.delivery_lng}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">"""

content = content.replace(old_active, new_active)


# 8. Show distance in available orders
old_avail = """                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                      +₹{order.partner_commission || 0}
                    </span>
                  </div>
                  <div className="flex gap-2 text-gray-600 text-sm mb-4">
                    <MapPin size={16} className="shrink-0 mt-0.5 text-red-500" />
                    <p className="line-clamp-2">{order.delivery_address || 'Customer Location'}</p>
                  </div>"""

new_avail = """                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      +₹{order.partner_commission || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2 text-gray-600 text-sm flex-1 mr-4">
                      <MapPin size={16} className="shrink-0 mt-0.5 text-red-500" />
                      <p className="line-clamp-2">{order.delivery_address || 'Customer Location'}</p>
                    </div>
                    {order.calculated_distance_km > 0 && (
                      <span className="shrink-0 text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {order.calculated_distance_km} km
                      </span>
                    )}
                  </div>"""

content = content.replace(old_avail, new_avail)


with open('apps/delivery/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
