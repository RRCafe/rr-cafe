import re

with open('apps/admin/src/pages/Orders.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update LiveDeliveryMap function definition and internals
old_map_comp = """function LiveDeliveryMap({ 
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
          defaultCenter={partnerLoc} 
          zoom={15} 
          gestureHandling={'auto'} 
          disableDefaultUI={false} 
          zoomControl={true}
          fullscreenControl={true}
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
            <div className="bg-white p-1 rounded-full shadow-lg border-2 border-gray-800 text-gray-800 text-[10px] font-bold">
              Cafe
            </div>
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}"""

new_map_comp = """function LiveDeliveryMap({ 
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
    const trackChannel = supabase.channel(`track-${orderId}`)
      .on('broadcast', { event: 'loc' }, (payload) => {
        if (payload.payload) {
          setPartnerLoc({ lat: payload.payload.lat, lng: payload.payload.lng });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(trackChannel); };
  }, [orderId, hasPartner, status]);

  // Determine what to draw based on user requirements:
  const isPending = status === 'placed' || status === 'pending'; // In case it's called placed or pending
  const isPreparingOrReady = status === 'preparing' || status === 'ready';
  const isOutForDelivery = status === 'out_for_delivery';
  const isDelivered = status === 'delivered';
  
  // 1. Accepted but not assigned: Cafe -> Customer
  const showCafeToCustomer = (!hasPartner && (isPending || isPreparingOrReady)) || (hasPartner && isPreparingOrReady);
  // 2. Assigned but not collected: Partner -> Cafe
  const showPartnerToCafe = hasPartner && isPreparingOrReady && partnerLoc;
  // 3. Collected (out for delivery): Partner -> Customer
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
          mapId="live-map-admin"
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
}"""

content = content.replace(old_map_comp, new_map_comp)

# 2. Update LiveDeliveryMap invocation
old_invocation = """{selectedOrder.delivery_partner_id && (
                    <LiveDeliveryMap 
                      orderId={selectedOrder.id} 
                      status={selectedOrder.status}
                      apiKey={mapKey} 
                      initialLat={selectedOrder.partner?.current_lat} 
                      initialLng={selectedOrder.partner?.current_lng} 
                      customerLat={selectedOrder.delivery_lat}
                      customerLng={selectedOrder.delivery_lng}
                    />
                  )}"""

new_invocation = """{selectedOrder.order_type === 'delivery' && selectedOrder.delivery_lat && selectedOrder.delivery_lng && (
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
                  )}"""

content = content.replace(old_invocation, new_invocation)

with open('apps/admin/src/pages/Orders.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
