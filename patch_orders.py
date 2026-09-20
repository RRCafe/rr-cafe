import re

with open('apps/admin/src/pages/Orders.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports
content = content.replace("import { Search, ExternalLink, X, MapPin } from 'lucide-react';", "import { Search, ExternalLink, X, MapPin, Bike } from 'lucide-react';\nimport { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';")

# 2. Add LiveDeliveryMap component before Orders function
live_map = """
function LiveDeliveryMap({ orderId, apiKey, initialLat, initialLng }: { orderId: string, apiKey: string, initialLat?: number, initialLng?: number }) {
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
}

export default function Orders() {
"""

content = content.replace("export default function Orders() {", live_map)

# 3. Get API Key
content = content.replace("const [modalLoading, setModalLoading] = useState(false);", "const [modalLoading, setModalLoading] = useState(false);\n  const mapKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';")

# 4. Insert map in the modal
map_jsx = """                    {selectedOrder.delivery_lat && selectedOrder.delivery_lng && (
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&origin=8.395596,78.052598&destination=${selectedOrder.delivery_lat},${selectedOrder.delivery_lng}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center gap-1"
                      >
                        <ExternalLink size={12} /> View Route in Google Maps
                      </a>
                    )}
                  </div>
                  {selectedOrder.delivery_partner_id && (
                    <LiveDeliveryMap 
                      orderId={selectedOrder.id} 
                      apiKey={mapKey} 
                      initialLat={selectedOrder.delivery_lat} 
                      initialLng={selectedOrder.delivery_lng} 
                    />
                  )}
                </div>"""

content = content.replace("""                    {selectedOrder.delivery_lat && selectedOrder.delivery_lng && (
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&origin=8.395596,78.052598&destination=${selectedOrder.delivery_lat},${selectedOrder.delivery_lng}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center gap-1"
                      >
                        <ExternalLink size={12} /> View Route in Google Maps
                      </a>
                    )}
                  </div>
                </div>""", map_jsx)

with open('apps/admin/src/pages/Orders.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
