import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Package, ChefHat, Bike, CheckCircle, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { DirectionsRoute } from '../components/DirectionsRoute';

type OrderStatus = 'pending' | 'placed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered';

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
          defaultZoom={14} 
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

function OrderTrackerContent() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [orderType, setOrderType] = useState<string>('delivery');
  const [shortId, setShortId] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<{lat: number, lng: number} | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, partner:delivery_partners(current_lat, current_lng)')
        .eq('id', id)
        .single();
        
      if (!error && data) {
        setStatus(data.status as OrderStatus);
        setOrderType(data.order_type);
        setShortId(data.id.split('-')[0].toUpperCase());
        
        if (data.delivery_lat && data.delivery_lng) {
          setDeliveryLocation({ lat: data.delivery_lat, lng: data.delivery_lng });
        }
        
        if (data.partner && data.partner.current_lat && data.partner.current_lng) {
          setPartnerLocation({ lat: data.partner.current_lat, lng: data.partner.current_lng });
        }
      }
      setLoading(false);
    };

    fetchOrder();

    const channel = supabase.channel(`order_updates_${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (payload) => {
          setStatus(payload.new.status as OrderStatus);
          if (payload.new.delivery_partner_id) {
            // fetch partner details
            supabase.from('delivery_partners').select('current_lat, current_lng').eq('id', payload.new.delivery_partner_id).single().then(({data}) => {
              if (data && data.current_lat && data.current_lng) {
                setPartnerLocation({ lat: data.current_lat, lng: data.current_lng });
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const steps = orderType === 'delivery' ? [
    { key: 'placed', label: 'Order Confirmed', icon: Package },
    { key: 'preparing', label: 'Preparing', icon: ChefHat },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: Bike },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  ] : [
    { key: 'placed', label: 'Order Confirmed', icon: Package },
    { key: 'preparing', label: 'Preparing', icon: ChefHat },
    { key: 'ready', label: 'Done Preparing', icon: ChefHat },
    { key: 'delivered', label: 'Completed', icon: CheckCircle },
  ];

  const getStepIndex = (s: OrderStatus) => {
    if (s === 'pending') return -1; // Payment pending
    if (s === 'ready' && orderType === 'delivery') return 1; // Maps to preparing visually for delivery
    if (s === 'ready' && orderType !== 'delivery') return 2; // Maps to "Done Preparing" step for non-delivery
    const i = steps.findIndex(step => step.key === s);
    return i === -1 ? 0 : i;
  };

  if (loading) {
    return <div className="text-center py-24">Loading order details...</div>;
  }

  const currentIndex = getStepIndex(status);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Track Your Order</h1>
        <p className="text-gray-500 mb-12 font-mono text-sm">Order {shortId}</p>

        {status === 'pending' && (
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200 mb-8">
            <h3 className="font-bold">Payment Pending</h3>
            <p className="text-sm mt-1">We are awaiting payment confirmation. Please complete the payment to process your order.</p>
          </div>
        )}

        {orderType === 'delivery' && deliveryLocation && (
          <div className="mb-8 shadow-sm">
            <LiveDeliveryMap 
              orderId={id!} 
              status={status}
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''} 
              initialLat={partnerLocation?.lat} 
              initialLng={partnerLocation?.lng} 
              customerLat={deliveryLocation.lat}
              customerLng={deliveryLocation.lng}
              hasPartner={!!partnerLocation}
            />
          </div>
        )}

        <div className="relative">
          {/* Vertical line connecting steps */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-100 -ml-px"></div>
          
          <div className="space-y-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index <= currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div key={step.key} className="relative flex items-start group">
                  <div className={`
                    relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 bg-white transition-colors duration-300
                    ${isCompleted ? 'border-red-600 text-red-600' : 'border-gray-200 text-gray-400'}
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="ml-6 pt-2">
                    <h3 className={`text-lg font-medium ${isCurrent ? 'text-red-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </h3>
                    {isCurrent && (
                      <p className="text-sm text-gray-500 mt-1">
                        {status === 'placed' && 'We have received your order.'}
                        {status === 'preparing' && 'The chef is preparing your meal.'}
                        {status === 'ready' && orderType === 'delivery' && 'Food prepared, waiting for delivery partner to pickup.'}
                        {status === 'ready' && orderType !== 'delivery' && 'Your order is ready! Please collect it.'}
                        {status === 'out_for_delivery' && 'Your food is on the way!'}
                        {status === 'delivered' && (orderType === 'delivery' ? 'Enjoy your meal!' : 'Order completed! Enjoy.')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderTracker() {
  return <OrderTrackerContent />;
}
