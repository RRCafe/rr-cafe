import os
import shutil

# 1. Copy DirectionsRoute.tsx
os.makedirs('apps/customer/src/components', exist_ok=True)
shutil.copy('apps/admin/src/components/DirectionsRoute.tsx', 'apps/customer/src/components/DirectionsRoute.tsx')

# 2. Patch OrderTracker.tsx
with open('apps/customer/src/pages/OrderTracker.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace imports
content = content.replace("import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';",
                          "import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';\nimport { DirectionsRoute } from '../components/DirectionsRoute';")
# if useMap wasn't there
content = content.replace("import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';",
                          "import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';\nimport { DirectionsRoute } from '../components/DirectionsRoute';")

# Replace Map logic
# I'll just write a regex to replace everything from useEffect fetch Ola Maps Route up to {eta && (
import re

live_map_code = """function LiveDeliveryMap({ 
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

  useEffect(() => {
    if (!hasPartner && status !== 'out_for_delivery') return;
    const trackChannel = supabase.channel(`track-${orderId}-customer`)
      .on('broadcast', { event: 'loc' }, (payload) => {
        if (payload.payload) {
          setPartnerLoc({ lat: payload.payload.lat, lng: payload.payload.lng });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(trackChannel); };
  }, [orderId, hasPartner, status]);

  const isPending = status === 'placed' || status === 'pending';
  const isPreparingOrReady = status === 'preparing' || status === 'ready';
  const isOutForDelivery = status === 'out_for_delivery';
  const isDelivered = status === 'delivered';
  
  const showCafeToCustomer = (!hasPartner && (isPending || isPreparingOrReady)) || (hasPartner && isPreparingOrReady);
  const showPartnerToCafe = hasPartner && isPreparingOrReady && partnerLoc;
  const showPartnerToCustomer = isOutForDelivery && partnerLoc && customerLat && customerLng;

  const defaultCenter = (partnerLoc && !isDelivered) ? partnerLoc : (customerLat && customerLng ? {lat: customerLat, lng: customerLng} : cafeLoc);

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden mt-2 border border-gray-200">
      <APIProvider apiKey={apiKey}>
        <Map 
          defaultCenter={defaultCenter} 
          zoom={14} 
          gestureHandling={'greedy'} 
          disableDefaultUI={true} 
          mapId="tracking-map-customer"
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
          
          {(!isDelivered) && (
            <AdvancedMarker position={cafeLoc}>
              <div className="bg-white p-1.5 rounded-full shadow-lg border-2 border-gray-800 text-gray-800 text-[10px] font-bold">
                Cafe
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}

function OrderTrackerContent() {"""

content = re.sub(r'function OrderTrackerContent\(\) \{', live_map_code, content)

# Remove the old routing logic from OrderTrackerContent
content = re.sub(r'const \[eta, setEta\].*?const currentIndex = getStepIndex\(status\);', 'const currentIndex = getStepIndex(status);', content, flags=re.DOTALL)

# Replace the Map rendering in the JSX
old_jsx_map = """          {orderType === 'delivery' && status === 'out_for_delivery' && deliveryLocation && (
            <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 shadow-sm" style={{ height: '300px' }}>
              <Map
                mapId="TRACKING_MAP_ID"
                defaultZoom={14}
                center={partnerLocation || deliveryLocation}
                disableDefaultUI={true}
              >
                {/* Customer Marker */}
                <AdvancedMarker position={deliveryLocation}>
                  <div className="bg-red-600 text-white p-2 rounded-full shadow-lg border-2 border-white">
                    <MapPin size={20} />
                  </div>
                </AdvancedMarker>

                {/* Delivery Partner Marker */}
                {partnerLocation && (
                  <AdvancedMarker position={partnerLocation}>
                    <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white transform hover:scale-110 transition-transform">
                      <Bike size={20} />
                    </div>
                  </AdvancedMarker>
                )}
              </Map>
              {eta && (
                <div className="bg-white border-t p-3 text-center text-sm font-semibold text-gray-700">
                  Estimated Time of Arrival: <span className="text-blue-600">{eta}</span>
                </div>
              )}
            </div>
          )}"""

new_jsx_map = """          {orderType === 'delivery' && deliveryLocation && (
            <div className="mb-8 shadow-sm">
              <LiveDeliveryMap 
                orderId={orderId!} 
                status={status}
                apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''} 
                initialLat={partnerLocation?.lat} 
                initialLng={partnerLocation?.lng} 
                customerLat={deliveryLocation.lat}
                customerLng={deliveryLocation.lng}
                hasPartner={!!partnerLocation}
              />
            </div>
          )}"""

content = content.replace(old_jsx_map, new_jsx_map)

# Also fix the order status labels
# The user wants:
# - for takeaway/dine_in, out for delivery -> 'done preparing' (wait, the step is 'ready' for them)
# "for orders of dine-in/takeaway, in the order history modify the 'out for delivery' stage in customer app to, 'done preparing'"
# Wait, let's redefine the steps array depending on orderType!
old_steps = """    const steps = [
      { key: 'placed', label: 'Order Confirmed', icon: Package },
      { key: 'preparing', label: 'Preparing', icon: ChefHat },
      { key: 'out_for_delivery', label: 'Out for Delivery', icon: Bike },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle },
    ];"""

new_steps = """    const steps = orderType === 'delivery' ? [
      { key: 'placed', label: 'Order Confirmed', icon: Package },
      { key: 'preparing', label: 'Preparing', icon: ChefHat },
      { key: 'out_for_delivery', label: 'Out for Delivery', icon: Bike },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle },
    ] : [
      { key: 'placed', label: 'Order Confirmed', icon: Package },
      { key: 'preparing', label: 'Preparing', icon: ChefHat },
      { key: 'ready', label: 'Done Preparing', icon: ChefHat },
      { key: 'delivered', label: 'Completed', icon: CheckCircle },
    ];"""

content = content.replace(old_steps, new_steps)

# Status descriptions
old_descriptions = """                        <p className="text-sm text-gray-500 mt-1">
                          {status === 'placed' && 'We have received your order.'}
                          {(status === 'preparing' || status === 'ready') && 'The chef is preparing your meal.'}
                          {status === 'out_for_delivery' && 'Your food is on the way!'}
                          {status === 'delivered' && 'Enjoy your meal!'}
                        </p>"""

new_descriptions = """                        <p className="text-sm text-gray-500 mt-1">
                          {status === 'placed' && 'We have received your order.'}
                          {status === 'preparing' && 'The chef is preparing your meal.'}
                          {status === 'ready' && orderType === 'delivery' && 'Food prepared, waiting for delivery partner to pickup.'}
                          {status === 'ready' && orderType !== 'delivery' && 'Your order is ready! Please collect it.'}
                          {status === 'out_for_delivery' && 'Your food is on the way!'}
                          {status === 'delivered' && (orderType === 'delivery' ? 'Enjoy your meal!' : 'Order completed! Enjoy.')}
                        </p>"""

content = content.replace(old_descriptions, new_descriptions)

# getStepIndex fix for non-delivery
old_index = """    const getStepIndex = (s: OrderStatus) => {
      if (s === 'pending') return -1; // Payment pending
      if (s === 'ready') return 1; // Maps to preparing visually
      const i = steps.findIndex(step => step.key === s);
      return i === -1 ? 0 : i;
    };"""

new_index = """    const getStepIndex = (s: OrderStatus) => {
      if (s === 'pending') return -1; // Payment pending
      if (s === 'ready' && orderType === 'delivery') return 1; // Maps to preparing visually for delivery (since they wait for pickup)
      if (s === 'ready' && orderType !== 'delivery') return 2; // Maps to "Done Preparing" step for non-delivery
      const i = steps.findIndex(step => step.key === s);
      return i === -1 ? 0 : i;
    };"""

content = content.replace(old_index, new_index)

with open('apps/customer/src/pages/OrderTracker.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
