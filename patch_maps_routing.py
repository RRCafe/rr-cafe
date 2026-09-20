import sys, re
sys.stdout.reconfigure(encoding='utf-8')

# ─────────────────────────────────────────────────────────────
# 1. Customer OrderTracker.tsx - zoom= -> defaultZoom=
# ─────────────────────────────────────────────────────────────
with open('apps/customer/src/pages/OrderTracker.tsx', 'r', encoding='utf-8') as f:
    ct = f.read()

ct = ct.replace('zoom={14}', 'defaultZoom={14}')
ct = ct.replace('zoom={15}', 'defaultZoom={15}')

with open('apps/customer/src/pages/OrderTracker.tsx', 'w', encoding='utf-8') as f:
    f.write(ct)
print("DONE: OrderTracker.tsx")

# ─────────────────────────────────────────────────────────────
# 2. Admin Orders.tsx - Rewrite LiveDeliveryMap + fix route link
# ─────────────────────────────────────────────────────────────
with open('apps/admin/src/pages/Orders.tsx', 'r', encoding='utf-8') as f:
    ot = f.read()

new_live_map = '''function LiveDeliveryMap({ 
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
  // Always center on customer location
  const mapCenter = (customerLat && customerLng) 
    ? { lat: customerLat, lng: customerLng } 
    : partnerLoc || cafeLoc;

  useEffect(() => {
    if (!hasPartner) return;
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

  // Route logic:
  // - No partner / placed: cafe->customer
  // - Partner assigned + preparing/ready: partner->cafe AND cafe->customer
  // - Out for delivery: partner->customer
  // - Delivered: cafe->customer (historical)
  const showCafeToCustomer = (!hasPartner || isPreparingOrReady || isDelivered) && customerLat && customerLng;
  const showPartnerToCafe = hasPartner && isPreparingOrReady && partnerLoc;
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
}'''

# Find and replace the entire LiveDeliveryMap function using regex
ot = re.sub(
    r'function LiveDeliveryMap\(\{.*?\}\n\}',
    new_live_map,
    ot,
    flags=re.DOTALL
)

# Fix the "View Route in Google Maps" link
old_link_pattern = r'\{selectedOrder\.delivery_lat && selectedOrder\.delivery_lng && \(\s*<a\s+href=\{`https://www\.google\.com/maps/dir/\?api=1&origin=8\.395596,78\.052598&destination=\$\{selectedOrder\.delivery_lat\},\$\{selectedOrder\.delivery_lng\}`\}\s+target="_blank"\s+rel="noreferrer"\s+className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center gap-1"\s+>\s+<ExternalLink size=\{12\} /> View Route in Google Maps\s+</a>\s+\)\}'

new_link = """{selectedOrder.delivery_lat && selectedOrder.delivery_lng && (() => {
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
                      })()}"""

ot = re.sub(old_link_pattern, new_link, ot, flags=re.DOTALL)

with open('apps/admin/src/pages/Orders.tsx', 'w', encoding='utf-8') as f:
    f.write(ot)
print("DONE: Orders.tsx")

# ─────────────────────────────────────────────────────────────
# 3. Delivery Dashboard.tsx - zoom= -> defaultZoom= + distance
# ─────────────────────────────────────────────────────────────
with open('apps/delivery/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    dt = f.read()

dt = dt.replace('zoom={14}', 'defaultZoom={14}')
dt = dt.replace('zoom={15}', 'defaultZoom={15}')
dt = dt.replace('zoom={13}', 'defaultZoom={13}')

with open('apps/delivery/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(dt)
print("DONE: Dashboard.tsx")
