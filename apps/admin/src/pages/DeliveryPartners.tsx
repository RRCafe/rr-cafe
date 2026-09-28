import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { APIProvider, Map, AdvancedMarker,  } from '@vis.gl/react-google-maps';
import { Truck, Bike, User, X, Phone, ShieldBan, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DeliveryPartner {
  id: string;
  name: string;
  phone_number: string;
  email: string;
  vehicle_name: string;
  vehicle_number: string;
  status: string;
  current_lat?: number;
  current_lng?: number;
  last_seen?: string;
  total_earnings?: number;
  last_location_update?: string;
  profiles?: {
    name: string;
    phone: string;
  };
}


function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}
let cachedPartners: DeliveryPartner[] = [];
export default function DeliveryPartners() {
  const [partners, setPartners] = useState<DeliveryPartner[]>(cachedPartners);
  const [loading, setLoading] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [olaDistances, setOlaDistances] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const fetchDistances = async () => {
      const olaApiKey = import.meta.env.VITE_OLA_MAPS_API_KEY;
      if (!olaApiKey) return;
      
      for (const p of partners) {
        if (p.current_lat && p.current_lng && !olaDistances[p.id]) {
          try {
            const res = await fetch(`https://api.olamaps.io/routing/v1/directions?origin=8.395596,78.052598&destination=${p.current_lat},${p.current_lng}&api_key=${olaApiKey}`, {
              method: 'POST',
              headers: { 'X-Request-Id': crypto.randomUUID() }
            });
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
              const distanceMeters = data.routes[0].legs[0].distance; // assuming this structure
              setOlaDistances(prev => ({ ...prev, [p.id]: (distanceMeters / 1000).toFixed(1) }));
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    };
    fetchDistances();
  }, [partners]);
  const mapKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    fetchPartners();
    
    const channel = supabase.channel('partner_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_partners' }, () => {
        fetchPartners(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchPartners(background = false) {
    if (!background) if (cachedPartners.length === 0) setLoading(true);
      const { data, error } = await supabase
      .from('delivery_partners')
      .select('*')
      .order('status', { ascending: false });
      
    if (data && !error) {
      cachedPartners = data as any;
        setPartners(data as any);
    }
    if (!background) setLoading(false);
  }

  const toggleSuspend = async (partner: DeliveryPartner) => {
    const newStatus = partner.status === 'suspend' ? 'offline' : 'suspend';
    await supabase.from('delivery_partners').update({ status: newStatus }).eq('id', partner.id);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-4 md:p-6 pb-24 md:pb-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0 bg-transparent">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-1"><div className="flex items-center gap-2.5">
          <div className="md:hidden w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/30 shrink-0">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Delivery Partners</h1>
        </div></div>
        <button
          onClick={() => setShowMapModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-sm shadow-red-500/30"
        >
          <Bike className="w-5 h-5" />
          Live Map
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-gray-500 font-medium">Loading partners...</div>
          ) : partners.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500 font-medium">No registered delivery partners found.</div>
          ) : (
            partners.map(partner => (
              <div key={partner.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-all">
                <div className="p-4 md:p-5 flex items-start gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200 shrink-0">
                    <User className="w-6 h-6 md:w-7 md:h-7 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-lg md:text-xl truncate">{partner.name || partner.vehicle_name || 'Unnamed Partner'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <p className="text-sm font-medium text-gray-600 truncate">{partner.phone_number}</p>
                    </div>
                  </div>
                </div>

                <div className="px-4 md:px-5 py-3 bg-white border-y border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Status</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                      partner.status === 'online' ? 'bg-green-100 text-green-700' :
                      partner.status === 'suspend' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {partner.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Plate Number</p>
                    <p className="text-sm font-bold text-gray-800">{partner.vehicle_number}</p>
                  </div>
                </div>
                
                <div className="p-3 md:p-4 bg-white flex gap-2 md:gap-3">
                  <button
                    onClick={() => toggleSuspend(partner)}
                    className={`flex-1 py-2.5 md:py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      partner.status === 'suspend'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {partner.status === 'suspend' ? (
                      <>Activate</>
                    ) : (
                      <><ShieldBan className="w-4 h-4" /> Suspend</>
                    )}
                  </button>
                  <Link
                    to={`/partners/${partner.id}`}
                    className="flex-1 py-2.5 md:py-2 rounded-xl font-bold text-sm transition-all active:scale-95 bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center gap-2"
                  >
                    Details <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showMapModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[60] p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] md:h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 md:p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Live Delivery Partners</h3>
              <button onClick={() => setShowMapModal(false)} className="p-2 hover:bg-gray-200 bg-gray-100 rounded-full transition-colors active:scale-95 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 w-full bg-gray-100 relative">
              {mapKey ? (
                <APIProvider apiKey={mapKey}>
                  <Map 
                    defaultCenter={{ lat: 8.395596, lng: 78.052598 }} 
                    defaultZoom={13} 
                    gestureHandling={'greedy'} 
                    disableDefaultUI={true} 
                    mapId="admin-partners-map"
                  >
                    <AdvancedMarker position={{ lat: 8.395596, lng: 78.052598 }} title="RR Cafe">
                      <div className="bg-red-600 text-white p-2 rounded-full shadow-lg border-2 border-white font-bold text-xs drop-shadow-md">
                        RR Cafe
                      </div>
                    </AdvancedMarker>
                    
                    {partners.filter(p => p.current_lat && p.current_lng).map(partner => (
                      <AdvancedMarker 
                        key={partner.id}
                        position={{ lat: partner.current_lat!, lng: partner.current_lng! }} 
                        title={partner.name}
                        onClick={() => setSelectedMarker(selectedMarker === partner.id ? null : partner.id)}
                      >
                        <div className="relative flex flex-col items-center cursor-pointer">
                          <Bike className={`text-white p-1 rounded-full shadow border-2 border-white w-6 h-6 md:w-8 md:h-8 ${partner.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                          {selectedMarker === partner.id && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-100 text-gray-800 text-[10px] font-medium px-2 py-1.5 rounded shadow-xl whitespace-nowrap z-50 flex flex-col items-center min-w-[100px]">
                              <span className="font-bold text-gray-900 text-xs mb-0.5">{partner.name || 'Partner'}</span>
                              
                              <span className="text-blue-600 font-bold mt-0.5">{olaDistances[partner.id] ? `${olaDistances[partner.id]} km` : `${getDistance(8.395596, 78.052598, partner.current_lat!, partner.current_lng!).toFixed(1)} km (est)`}</span>
                            </div>
                          )}
                        </div>
                      </AdvancedMarker>
                    ))}
                  </Map>
                </APIProvider>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Google Maps API Key missing
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

