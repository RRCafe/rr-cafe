import { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, ShoppingBag, Navigation, Store, Receipt, CreditCard, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import ConfirmModal from '../components/ConfirmModal';
import { Link, useNavigate } from 'react-router-dom';

const CAFE_LOC = { lat: 11.233496, lng: 77.015112 };

export default function Cart() {
  const { cartItems, updateQty, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  const [mapCenter, setMapCenter] = useState(CAFE_LOC);
  const [pinLocation, setPinLocation] = useState(CAFE_LOC);
  const [mapMountKey, setMapMountKey] = useState(0); 

  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', isError: false });

  const [isCalculated, setIsCalculated] = useState(false);
  const [drivingDistanceKm, setDrivingDistanceKm] = useState<number | null>(null);
  const [deliveryData, setDeliveryData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      supabase.from('customer').select('phone, address').eq('id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            if (data.phone) setPhoneNumber(data.phone);
            if (data.address) setDeliveryAddress(data.address);
          }
        });
    }
  }, [user]);

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setPinLocation(loc);
          setMapCenter(loc);
          setMapMountKey(k => k + 1); 
        },
        (error) => {
          console.error("Location error:", error);
          setModalConfig({ isOpen: true, title: 'Location Error', message: 'Could not fetch your location. Please check permissions.', isError: true });
        }
      );
    }
  };

  const calculateDistanceAndFee = async () => {
    if (!phoneNumber) return setModalConfig({ isOpen: true, title: 'Missing Info', message: 'Phone number is required.', isError: true });
    if (orderType === 'delivery' && !deliveryAddress) return setModalConfig({ isOpen: true, title: 'Missing Info', message: 'Delivery address is required.', isError: true });

    setLoading(true);

    try {
      if (orderType === 'delivery') {
        const res = await fetch('https://rrcafe.vercel.app/api/distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originLat: CAFE_LOC.lat, originLng: CAFE_LOC.lng, destLat: pinLocation.lat, destLng: pinLocation.lng })
        });
        const distData = await res.json();
        
        if (distData.distance_km === null) {
           throw new Error('Could not calculate driving distance (e.g. no roads found).');
        }
        
        const distKm = distData.distance_km;
        setDrivingDistanceKm(distKm);

        const feeRes = await supabase.rpc('calculate_delivery_fee', { distance_km: distKm });
        if (feeRes.error) throw feeRes.error;
        
        const dData = feeRes.data[0];
        if (!dData.is_deliverable) {
          throw new Error(`Location is too far! Max delivery radius is ${dData.max_radius_km} km. You are ${distKm.toFixed(1)} km away.`);
        }

        setDeliveryData(dData);
      }
      setIsCalculated(true);
    } catch (err: any) {
      setModalConfig({ isOpen: true, title: 'Calculation Error', message: err.message, isError: true });
      setIsCalculated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
       sessionStorage.setItem('returnUrl', '/cart');
       return setModalConfig({ isOpen: true, title: 'Sign In Required', message: 'Please sign in to place an order.', isError: true });
    }

    setLoading(true);

    try {
      const orderSubtotal = subtotal;
      const deliveryCharge = orderType === 'delivery' ? (deliveryData?.total_delivery_charge || 0) : 0;
      const totalAmount = orderSubtotal + deliveryCharge;
      
      const { data: orderParams, error: paramError } = await supabase.rpc('create_razorpay_order', {
         amount_in_rupees: totalAmount,
         receipt_prefix: 'ORDER_'
      });

      if (paramError) throw paramError;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
        amount: orderParams.amount,
        currency: orderParams.currency,
        name: "RR Cafe",
        description: `Order Payment (${orderType})`,
        order_id: orderParams.id, 
        handler: async function (response: any) {
           await verifyAndCreateOrder(response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature, totalAmount, deliveryCharge);
        },
        prefill: {
          email: user.email,
          contact: phoneNumber
        },
        theme: {
          color: "#DC2626"
        },
        modal: {
           ondismiss: function() {
              setLoading(false);
           }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
          setModalConfig({ isOpen: true, title: 'Payment Failed', message: response.error.description, isError: true });
          setLoading(false);
      });
      rzp.open();

    } catch (err: any) {
      setModalConfig({ isOpen: true, title: 'Checkout Error', message: err.message || 'Error initiating payment', isError: true });
      setLoading(false);
    }
  };

  const verifyAndCreateOrder = async (paymentId: string, orderId: string, signature: string, totalAmount: number, deliveryCharge: number) => {
     try {
       setModalConfig({ isOpen: true, title: 'Processing', message: 'Verifying payment and creating order...', isError: false });
       
       const verifyRes = await fetch('https://rrcafe.vercel.app/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature
          })
       });
       
       const verifyData = await verifyRes.json();
       if (!verifyData.success) {
           throw new Error('Payment verification failed.');
       }

       const { data: dbOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user?.id,
          order_type: orderType,
          status: 'pending',
          payment_status: 'paid',
          payment_id: paymentId,
          subtotal: subtotal,
          delivery_charge: deliveryCharge,
          total_amount: totalAmount,
          customer_phone: phoneNumber,
          delivery_address: orderType === 'delivery' ? deliveryAddress : null,
          delivery_lat: orderType === 'delivery' ? pinLocation.lat : null,
          delivery_lng: orderType === 'delivery' ? pinLocation.lng : null
        })
        .select()
        .single();

       if (orderError) throw orderError;

       const orderItems = cartItems.map(item => ({
        order_id: dbOrder.id,
        item_id: item.item.id,
        quantity: item.qty,
        unit_price: item.item.price,
        total_price: item.item.price * item.qty
       }));

       const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

       if (itemsError) throw itemsError;

       clearCart();
       setModalConfig({ isOpen: false, title: '', message: '', isError: false });
       navigate(`/track/${dbOrder.id}`, { replace: true });

     } catch(err: any) {
       setModalConfig({ isOpen: true, title: 'Order Error', message: err.message, isError: true });
       setLoading(false);
     }
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in-up">
        <div className="glass-card w-24 h-24 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag size={48} className="text-white/30" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-white mb-2 tracking-wide">Your Cart is Empty</h2>
        <p className="text-white/50 mb-8 max-w-md">Looks like you haven't added any delicious items to your cart yet.</p>
        <Link to="/" className="glass-button px-8 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center gap-2">
          <ChevronLeft size={20} /> Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <div className="space-y-8 animate-fade-in-up">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-wide">Your Cart</h1>
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm font-medium tracking-wide bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={16} /> Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-3xl p-6 space-y-5">
              {cartItems.map((item) => (
                <div key={item.item.id} className="flex gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors">
                  <div className="w-20 h-20 bg-white/5 rounded-xl overflow-hidden shrink-0 shadow-inner">
                    {item.item.image_url ? (
                      <img src={item.item.image_url} alt={item.item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-medium uppercase tracking-widest">Image</div>
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col pt-1">
                    <div className="flex justify-between gap-4 mb-2">
                      <h3 className="font-serif font-bold text-white text-lg leading-tight">{item.item.name}</h3>
                      <p className="font-bold text-red-400 whitespace-nowrap">,1{(item.item.price * item.qty).toFixed(2)}</p>
                    </div>
                    <p className="text-white/40 text-sm mb-auto">,1{item.item.price} each</p>
                    
                    <div className="flex items-center gap-3 mt-3 w-fit">
                      <div className="flex items-center bg-white/10 rounded-lg p-1 border border-white/10">
                        <button onClick={() => updateQty(item.item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md text-white transition-colors">&minus;</button>
                        <span className="w-8 text-center font-bold text-white">{item.qty}</span>
                        <button onClick={() => updateQty(item.item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md text-white transition-colors">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Billing Summary */}
            <div className="glass-card p-6 rounded-3xl space-y-4 text-sm font-medium text-white/70">
              <h3 className="text-xl font-serif font-bold text-white mb-4 border-b border-white/10 pb-4 flex items-center gap-2"><Receipt size={20}/> Bill Summary</h3>
              
              <div className="flex justify-between items-center">
                <span>Items Subtotal</span>
                <span className="text-white text-lg">,1{subtotal.toFixed(2)}</span>
              </div>
              
              {orderType === 'delivery' && (
                <>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                    <span>Delivery Distance</span>
                    <span className="text-white">
                      {drivingDistanceKm !== null ? drivingDistanceKm.toFixed(1) + ' km' : 'Calculated at checkout'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                    <span>Delivery & Handling Fee</span>
                    <span className="text-white">
                      {deliveryData ? ",1" + deliveryData.total_delivery_charge?.toFixed(2) : 'Calculated at checkout'}
                    </span>
                  </div>
                </>
              )}
              
              <div className="border-t border-white/10 pt-5 mt-5 flex justify-between items-center text-xl font-bold">
                <span className="text-white uppercase tracking-wider text-sm">Grand Total</span>
                <span className="text-red-400 text-2xl">,1{(subtotal + (orderType === 'delivery' ? (deliveryData?.total_delivery_charge || 0) : 0)).toFixed(2)}</span>
              </div>
            </div>
            
            {isCalculated && (
              <button 
                onClick={handleCheckout}
                disabled={loading || (orderType === 'delivery' && !deliveryData)}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-lg py-5 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-[0_8px_30px_rgba(220,38,38,0.3)] uppercase tracking-widest flex justify-center items-center gap-2"
              >
                <CreditCard size={24} />
                {loading ? 'Processing...' : 'Pay with Razorpay'}
              </button>
            )}
          </div>

          {/* Right Column: Checkout Details */}
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-3xl space-y-6">
              <h3 className="font-serif font-bold text-xl text-white border-b border-white/10 pb-4">Checkout Details</h3>
              
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => { setOrderType('delivery'); setIsCalculated(false); }}
                  className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${orderType === 'delivery' ? 'bg-red-500 text-white shadow-lg' : 'text-white/50 hover:text-white/80'}`}
                >
                  Delivery
                </button>
                <button
                  onClick={() => { setOrderType('pickup'); setIsCalculated(false); }}
                  className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${orderType === 'pickup' ? 'bg-red-500 text-white shadow-lg' : 'text-white/50 hover:text-white/80'}`}
                >
                  Pickup
                </button>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isCalculated}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:border-red-500 focus:bg-white/10 outline-none transition-all disabled:opacity-50"
                />
              </div>

              {orderType === 'delivery' && (
                <>
                  <div className="pt-2 space-y-3">
                    <div className="flex justify-between items-end mb-2">
                      <label className="block text-xs font-bold text-white/50 uppercase tracking-widest">Delivery Location *</label>
                      <button 
                        onClick={handleUseCurrentLocation}
                        disabled={isCalculated}
                        className="text-[10px] flex items-center gap-1 bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-500/30 transition-colors border border-blue-500/30 disabled:opacity-50 font-bold uppercase tracking-wider"
                      >
                        <Navigation size={12} /> Auto-Detect
                      </button>
                    </div>
                    <div className="h-48 md:h-64 bg-white/5 rounded-2xl overflow-hidden relative border border-white/10 shadow-inner">
                      <Map
                        key={mapMountKey}
                        mapId="DEMO_MAP_ID"
                        defaultZoom={15}
                        defaultCenter={mapCenter}
                        onClick={(ev: any) => {
                          if (!isCalculated) {
                            setPinLocation(ev.detail.latLng);
                          }
                        }}
                        gestureHandling={isCalculated ? 'none' : 'greedy'}
                        disableDefaultUI={true}
                        style={{ width: '100%', height: '100%' }}
                      >
                        <AdvancedMarker position={CAFE_LOC} title="Cafe Location">
                           <div className="bg-gradient-to-br from-red-600 to-red-800 p-1.5 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)] border-2 border-white">
                             <Store size={18} className="text-white" />
                           </div>
                        </AdvancedMarker>

                        <AdvancedMarker
                          position={pinLocation}
                          draggable={!isCalculated}
                          onDragEnd={(ev: any) => {
                            setPinLocation({ lat: ev.latLng.lat(), lng: ev.latLng.lng() });
                          }}
                        />
                      </Map>
                      {!isCalculated && (
                        <div className="absolute top-3 left-3 right-3 bg-black/60 backdrop-blur-md text-[10px] uppercase tracking-widest p-2.5 text-center rounded-xl shadow-lg text-white/90 border border-white/10 pointer-events-none">
                          Tap map or drag pin to set location
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Complete Address *</label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      disabled={isCalculated}
                      placeholder="House/Flat No, Building Name, Street, Landmark..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:border-red-500 focus:bg-white/10 outline-none transition-all disabled:opacity-50"
                      rows={3}
                    />
                  </div>
                </>
              )}
              
              {!isCalculated ? (
                <button
                  onClick={calculateDistanceAndFee}
                  disabled={loading}
                  className="w-full glass-button py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? 'Calculating...' : 'Confirm Details'}
                </button>
              ) : (
                <button
                  onClick={() => setIsCalculated(false)}
                  className="w-full bg-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/20 transition-colors uppercase tracking-widest text-sm border border-white/10"
                >
                  Edit Details
                </button>
              )}
            </div>
          </div>
        </div>

        <ConfirmModal
          isOpen={confirmClear}
          title="Clear Cart"
          message="Are you sure you want to remove all items from your cart? This cannot be undone."
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
