const fs = require('fs');

const cartTsx = `import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Store, ShoppingBag, Truck, Navigation } from 'lucide-react';

const CAFE_LOC = { lat: 8.395596, lng: 78.052598 };

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Cart() {
  const { cartItems: cart, updateQty, clearCart, subtotal } = useCart();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pinLocation, setPinLocation] = useState(CAFE_LOC);
  const [mapCenter, setMapCenter] = useState(CAFE_LOC);
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deliveryData, setDeliveryData] = useState<any>(null);
  
  const [orderType, setOrderType] = useState<'delivery'|'take_away'|'dine_in'>('delivery');
  const [isCalculated, setIsCalculated] = useState(false);
  const [drivingDistanceKm, setDrivingDistanceKm] = useState<number | null>(null);

  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', isError: false });
  const showAlert = (title: string, message: string, isError = true) => setModalConfig({ isOpen: true, title, message, isError });

  const { user } = useAuth();
  const navigate = useNavigate();

  const mapKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (user) {
      supabase.from('customer').select('address, phone_number, delivery_lat, delivery_lng').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          if (data.address) setDeliveryAddress(data.address);
          if (data.phone_number) setPhoneNumber(data.phone_number);
          if (data.delivery_lat && data.delivery_lng) {
            setPinLocation({ lat: data.delivery_lat, lng: data.delivery_lng });
            setMapCenter({ lat: data.delivery_lat, lng: data.delivery_lng });
          }
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (orderType !== 'delivery') {
      setIsCalculated(true);
      setDrivingDistanceKm(0);
      setDeliveryData({ total_delivery_charge: 0, breakdown_internal: { base_delivery: 0, platform_fee: 0 } });
    } else {
      setIsCalculated(false);
      setDeliveryData(null);
    }
  }, [orderType]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showAlert("Error", "Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setPinLocation(loc);
        setMapCenter(loc);
        setLoading(false);
      },
      (_error) => {
        setLoading(false);
        showAlert("Location Error", "Unable to retrieve your location. Please check your browser permissions.");
      },
      { enableHighAccuracy: true }
    );
  };

  const calculateDistanceAndFee = async () => {
    if (orderType !== 'delivery') return;
    
    if (!phoneNumber.trim()) {
      showAlert("Required", "Please enter your phone number.");
      return;
    }
    if (!deliveryAddress.trim()) {
      showAlert("Required", "Please enter your delivery address.");
      return;
    }

    setLoading(true);
    let distKm = 0;
    try {
      const olaKey = import.meta.env.VITE_OLA_MAPS_API_KEY;
      const url = \`https://api.olamaps.io/routing/v1/directions?origin=\${CAFE_LOC.lat},\${CAFE_LOC.lng}&destination=\${pinLocation.lat},\${pinLocation.lng}&api_key=\${olaKey}\`;
      const response = await fetch(url, { method: 'POST' });
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const distMeters = data.routes[0].legs[0].distance || 0;
        distKm = distMeters / 1000;
      } else {
        throw new Error("No route found in Ola Maps");
      }
    } catch (err) {
      console.warn("Ola Maps Directions failed, using Haversine distance", err);
      distKm = calculateHaversineDistance(CAFE_LOC.lat, CAFE_LOC.lng, pinLocation.lat, pinLocation.lng) * 1.3;
    }

    setDrivingDistanceKm(distKm);

    const { data, error } = await supabase.functions.invoke('calculate-delivery-fee', {
      body: { items_subtotal: subtotal, distance_km: distKm }
    });
    
    if (!error && data) {
      setDeliveryData(data);
      setIsCalculated(true);
    } else {
      showAlert("Error", "Failed to calculate delivery fee. Please try again.");
    }
    setLoading(false);
  };

  const handleCheckout = async () => {
    if (!user) {
      showAlert("Sign In Required", "Please sign in to checkout.");
      return;
    }

    if (!phoneNumber.trim()) {
      showAlert("Required", "Please enter your phone number.");
      return;
    }

    if (orderType === 'delivery') {
      if (!isCalculated || drivingDistanceKm === null) {
        showAlert("Confirmation Required", "Please confirm your location first.");
        return;
      }
      if (!deliveryAddress.trim()) {
        showAlert("Required", "Please enter your delivery address.");
        return;
      }
    }

    setLoading(true);
    try {
      await supabase.from('customer').update({
        phone_number: phoneNumber,
        ...(orderType === 'delivery' ? {
          address: deliveryAddress,
          delivery_lat: pinLocation.lat,
          delivery_lng: pinLocation.lng
        } : {})
      }).eq('id', user.id);

      const grandTotal = subtotal + (deliveryData?.total_delivery_charge || 0);

      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        delivery_address: orderType === 'delivery' ? deliveryAddress : null,
        delivery_lat: orderType === 'delivery' ? pinLocation.lat : null,
        delivery_lng: orderType === 'delivery' ? pinLocation.lng : null,
        distance_km: orderType === 'delivery' ? drivingDistanceKm : 0,
        type: orderType,
        customer_phone: phoneNumber,
        grand_total: grandTotal
      }).select().single();

      if (orderError) throw orderError;

      const orderItems = cart.map((c: any) => ({
        order_id: orderData.id,
        menu_item_id: c.item.id,
        item_name: c.item.name,
        quantity: c.qty,
        unit_price: c.item.price,
        total_price: c.item.price * c.qty
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: orderData.id,
        payment_status: 'pending',
        payment_method: 'online',
        amount: grandTotal
      });
      if (paymentError) throw paymentError;

      const { data: rzpOrder, error: rzpError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { amount: grandTotal, receipt: orderData.id }
      });
      if (rzpError || !rzpOrder) throw new Error('Razorpay order creation failed');

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) throw new Error('Razorpay SDK failed to load');

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: 'RR Cafe',
        description: 'Food Order',
        order_id: rzpOrder.id,
        handler: async function (response: any) {
          const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              system_order_id: orderData.id
            }
          });

          if (verifyError) {
            showAlert("Payment Failed", "Payment verification failed.");
          } else {
            clearCart();
            navigate('/track/' + orderData.id);
          }
        },
        prefill: { email: user.email, contact: phoneNumber },
        theme: { color: '#DC2626' }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      showAlert("Error", err.message);
    }
    setLoading(false);
  };

  if (cart.length === 0) return <div className="p-8 text-center text-gray-500">Your cart is empty</div>;

  return (
    <APIProvider apiKey={mapKey}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-2xl font-bold">Checkout</h2>
          <button onClick={() => setConfirmClear(true)} className="text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1">
            Clear Cart
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button onClick={() => setOrderType('delivery')} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${orderType === 'delivery' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-200 text-gray-600'}`}>
            <Truck className="mb-2" />
            <span className="font-semibold text-sm sm:text-base">Delivery</span>
          </button>
          <button onClick={() => setOrderType('take_away')} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${orderType === 'take_away' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-200 text-gray-600'}`}>
            <ShoppingBag className="mb-2" />
            <span className="font-semibold text-sm sm:text-base">Take Away</span>
          </button>
          <button onClick={() => setOrderType('dine_in')} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${orderType === 'dine_in' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-200 text-gray-600'}`}>
            <Store className="mb-2" />
            <span className="font-semibold text-sm sm:text-base">Dine In</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
              {cart.map((c: any) => (
                <div key={c.item.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium">{c.item.name}</div>
                    <div className="text-gray-500 text-sm">\u20B9{c.item.price} x {c.qty}</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => updateQty(c.item.id, -1)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold">-</button>
                    <span>{c.qty}</span>
                    <button onClick={() => updateQty(c.item.id, 1)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Items Subtotal</span>
                <span className="font-medium">\u20B9{subtotal.toFixed(2)}</span>
              </div>
              {orderType === 'delivery' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery & Handling Fee</span>
                  <span className="font-medium">
                    {deliveryData ? `\u20B9${deliveryData.total_delivery_charge?.toFixed(2)}` : 'Calculated next'}
                  </span>
                </div>
              )}
              <div className="border-t pt-3 mt-3 flex justify-between text-lg font-bold">
                <span>Grand Total</span>
                <span>\u20B9{(subtotal + (orderType === 'delivery' ? (deliveryData?.total_delivery_charge || 0) : 0)).toFixed(2)}</span>
              </div>
            </div>
            
            {isCalculated && (
              <button 
                onClick={handleCheckout}
                disabled={loading || (orderType === 'delivery' && !deliveryData)}
                className="w-full bg-red-600 text-white font-bold text-lg py-4 rounded-lg hover:bg-red-700 disabled:opacity-50 shadow-lg"
              >
                {loading ? 'Processing...' : 'Pay with Razorpay'}
              </button>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white p-5 rounded-lg shadow-sm border space-y-5">
              <h3 className="font-bold text-lg">Contact & Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              {orderType === 'delivery' && (
                <>
                  <div className="pt-2">
                    <div className="flex justify-between items-end mb-2">
                      <label className="block text-sm font-medium text-gray-700">Delivery Location *</label>
                      <button 
                        onClick={handleUseCurrentLocation}
                        className="text-xs flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 font-medium"
                      >
                        <Navigation size={14} /> Use Current Location
                      </button>
                    </div>
                    <div className="h-64 bg-gray-100 rounded-lg overflow-hidden relative border">
                      <Map
                        mapId="DEMO_MAP_ID"
                        defaultZoom={15}
                        defaultCenter={mapCenter}
                        onClick={(ev: any) => !isCalculated && setPinLocation(ev.detail.latLng)}
                        gestureHandling={isCalculated ? 'none' : 'greedy'}
                        disableDefaultUI={true}
                        style={{ width: '100%', height: '100%' }}
                      >
                        <AdvancedMarker
                          position={pinLocation}
                          draggable={!isCalculated}
                          onDragEnd={(ev: any) =>
                            setPinLocation({ lat: ev.latLng.lat(), lng: ev.latLng.lng() })
                          }
                        />
                      </Map>
                      {!isCalculated && (
                        <div className="absolute top-2 left-2 right-2 bg-white/90 backdrop-blur text-xs p-2 text-center rounded shadow-sm text-gray-700 pointer-events-none">
                          Drag the map or pin to set exact location
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Complete Address *</label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      disabled={isCalculated}
                      placeholder="House/Flat No, Building Name, Street, Landmark..."
                      className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none disabled:bg-gray-50"
                      rows={3}
                    />
                  </div>

                  {!isCalculated ? (
                    <button
                      onClick={calculateDistanceAndFee}
                      disabled={loading}
                      className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Calculating...' : 'Confirm Location & Proceed'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsCalculated(false)}
                      className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Edit Address & Location
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <ConfirmModal
          isOpen={confirmClear}
          title="Clear Cart"
          message="Are you sure you want to remove all items from your cart?"
          confirmText="Clear All"
          isDestructive={true}
          onConfirm={() => {
            clearCart();
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
        <ConfirmModal
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText="OK"
          hideCancel={true}
          isDestructive={modalConfig.isError}
          onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}
          onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
        />
      </div>
    </APIProvider>
  );
}
`;

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', cartTsx, 'utf-8');
