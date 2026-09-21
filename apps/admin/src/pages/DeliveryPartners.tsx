import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { APIProvider, Map, AdvancedMarker,  } from '@vis.gl/react-google-maps';
import { Bike, User, X, Phone, ShieldBan, ExternalLink } from 'lucide-react';
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
  total_earnings?: number;
  last_location_update?: string;
  profiles?: {
    name: string;
    phone: string;
  };
}

export default function DeliveryPartners() {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
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
    if (!background) setLoading(true);
    const { data, error } = await supabase
      .from('delivery_partners')
      .select('*')
      .order('status', { ascending: false });
      
    if (data && !error) {
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
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-1"><h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Delivery Partners</h1></div>
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
                      >
                        <div className="relative group cursor-pointer">
                          <Bike className="text-purple-600 bg-white p-1 rounded-full shadow-lg border border-gray-100 w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:scale-110" />
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {partner.name || 'Partner'}
                          </div>
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

