import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Bike, User, X } from 'lucide-react';
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
  const [selectedPartnerInfo, setSelectedPartnerInfo] = useState<DeliveryPartner | null>(null);
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
      .select(`
        *
      `)
      .order('status', { ascending: false });
      
    if (data && !error) {
      setPartners(data as any);
    }
    if (!background) setLoading(false);
  }

  const toggleSuspend = async (partner: DeliveryPartner) => {
    const newStatus = partner.status === 'suspend' ? 'offline' : 'suspend';
    await supabase
      .from('delivery_partners')
      .update({ status: newStatus })
      .eq('id', partner.id);
  };

    return (
    <div className="p-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Delivery Partners</h1>
          <button
            onClick={() => setShowMapModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <Bike size={18} />
            Live Map
          </button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-gray-500">Loading partners...</p>
        ) : partners.length === 0 ? (
          <p className="text-gray-500">No registered delivery partners found.</p>
        ) : (
          partners.map(partner => (
            <div key={partner.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-all">
              <div className="p-5 border-b border-gray-100 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User size={20} className="text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{partner.name || partner.vehicle_name || 'Unnamed'}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">{partner.phone_number || partner.vehicle_number}</p>
                        {partner.phone_number && (
                          <a href={`tel:${partner.phone_number}`} onClick={e => e.stopPropagation()} className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-medium hover:bg-blue-100">
                            Call
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  partner.status === 'online' ? 'bg-green-100 text-green-700' :
                  partner.status === 'suspend' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {partner.status}
                </div>
              </div>

              <div className="p-5 flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Vehicle</p>
                    <p className="text-sm font-medium text-gray-900">{partner.vehicle_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Plate Number</p>
                    <p className="text-sm font-medium text-gray-900">{partner.vehicle_number}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSuspend(partner);
                  }}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                    partner.status === 'suspend'
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {partner.status === 'suspend' ? 'Activate' : 'Suspend'}
                </button>
                <Link
                  to={`/partners/${partner.id}`}
                  className="flex-1 py-2 rounded-lg font-medium text-sm transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 text-center flex items-center justify-center"
                >
                  Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
      {showMapModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Live Delivery Partners</h3>
              <button onClick={() => {
                setShowMapModal(false);
                setSelectedPartnerInfo(null);
              }} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 w-full bg-gray-100 relative">
              <APIProvider apiKey={mapKey}>
                <Map 
                  defaultCenter={{ lat: 8.395596, lng: 78.052598 }} 
                  defaultZoom={13} 
                  gestureHandling={'greedy'} 
                  disableDefaultUI={true} 
                  mapId="admin-partners-map"
                >
                  <AdvancedMarker position={{ lat: 8.395596, lng: 78.052598 }} title="RR Cafe">
                    <div className="bg-red-600 text-white p-2 rounded-full shadow-lg border-2 border-white font-bold text-xs">
                      RR Cafe
                    </div>
                  </AdvancedMarker>
                  
                  {partners.filter(p => p.status === 'online' && p.current_lat && p.current_lng).map(partner => (
                    <AdvancedMarker 
                      key={partner.id}
                      position={{ lat: partner.current_lat as number, lng: partner.current_lng as number }}
                      onClick={() => setSelectedPartnerInfo(partner)}
                    >
                      <div className="bg-blue-600 text-white p-1.5 rounded-full shadow-lg border-2 border-white">
                        <Bike size={20} />
                      </div>
                    </AdvancedMarker>
                  ))}

                  {selectedPartnerInfo && selectedPartnerInfo.current_lat && selectedPartnerInfo.current_lng && (
                    <InfoWindow 
                      position={{ lat: selectedPartnerInfo.current_lat, lng: selectedPartnerInfo.current_lng }}
                      onCloseClick={() => setSelectedPartnerInfo(null)}
                    >
                      <div className="p-2 text-gray-900 font-sans min-w-[200px]">
                        <h4 className="font-bold text-lg mb-1">{selectedPartnerInfo.name || selectedPartnerInfo.vehicle_name || 'Unnamed'}</h4>
                        <p className="text-sm text-gray-600 mb-2">{selectedPartnerInfo.vehicle_name} ({selectedPartnerInfo.vehicle_number})</p>
                        <p className="text-sm bg-blue-50 text-blue-900 p-2 rounded border border-blue-100">
                          <DistanceCalculator partner={selectedPartnerInfo} shopLoc={{ lat: 8.395596, lng: 78.052598 }} />
                        </p>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DistanceCalculator({ 
  partner, 
  shopLoc 
}: { 
  partner: DeliveryPartner; 
  shopLoc: { lat: number, lng: number } 
}) {
  const [distText, setDistText] = useState('Calculating...');
  const olaApiKey = import.meta.env.VITE_OLA_MAPS_API_KEY;
  
  useEffect(() => {
    let active = true;
    const fetchDist = async () => {
      if (!partner.current_lat || !partner.current_lng) return;
      if (!olaApiKey) {
        setDistText('No API Key');
        return;
      }
      try {
        const response = await fetch(
          `https://api.olamaps.io/routing/v1/directions?origin=${shopLoc.lat},${shopLoc.lng}&destination=${partner.current_lat},${partner.current_lng}&api_key=${olaApiKey}`,
          { method: 'POST' }
        );
        const data = await response.json();
        if (data.routes && data.routes.length > 0 && active) {
          const route = data.routes[0];
          const distKm = (route.legs[0].distance / 1000).toFixed(1);
          const durationMin = Math.ceil(route.legs[0].duration / 60);
          setDistText(`${distKm} km, ~${durationMin} min`);
        } else if (active) {
          setDistText('Unavailable');
        }
      } catch (err) {
        if (active) setDistText('Unavailable');
      }
    };
    fetchDist();
    return () => { active = false; };
  }, [partner.current_lat, partner.current_lng, shopLoc, olaApiKey]);

  return <span className="font-semibold text-blue-700">{distText}</span>;
}
