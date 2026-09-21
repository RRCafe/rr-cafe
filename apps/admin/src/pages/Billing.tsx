import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Minus, Check, Receipt, Trash2, Search, ShoppingBag, Banknote, QrCode, Utensils, X } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_veg: boolean;
  business_type: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

export default function Billing() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'dine_in' | 'dine_out'>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'direct_qr'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', isError: false });
  
  // Combobox state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchItems();
    
    // Click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('name');
    if (!error && data) {
      setItems(data);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };
  
  const setQuantity = (id: string, value: number) => {
    if (value < 0 || isNaN(value)) return;
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return value === 0 ? { ...item, quantity: 0 } : { ...item, quantity: value };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const total = Number(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2));
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCompleteOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          status: 'delivered',
          order_type: orderType,
          total_amount: total,
          business_type: cart[0]?.business_type || 'RR Cafe',
          source: 'pos_manual'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: orderData.id,
        amount: total,
        payment_status: 'manual_success',
        payment_method: paymentMethod
      });
      if (paymentError) throw paymentError;

      setModalConfig({ isOpen: true, title: 'Success', message: 'Order completed successfully!', isError: false });
      setCart([]);
    } catch (err) {
      console.error(err);
      setModalConfig({ isOpen: true, title: 'Error', message: 'Error completing order', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] md:h-screen p-4 md:p-6 bg-gray-50/50">
      <div className="flex justify-between items-center mb-4 md:mb-6 shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">New Order</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 h-full min-h-0">
        {/* Left Side - Search & Cart List */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Item Search Bar */}
          <div className="p-3 md:p-4 border-b border-gray-100 bg-white z-50 shrink-0" ref={searchRef}>
            <div className="relative">
              <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <Search className="w-5 h-5 text-gray-400 ml-4" />
                <input
                  type="text"
                  placeholder="Search and add items..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="flex-1 p-3.5 bg-transparent outline-none text-gray-700 placeholder-gray-400 text-sm md:text-base font-medium"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-2 mr-1 text-gray-400 hover:text-gray-600 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Combobox Dropdown */}
              {isDropdownOpen && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-200/50 z-50 max-h-72 overflow-y-auto custom-scrollbar">
                  {filteredItems.length === 0 ? (
                    <div className="p-6 text-gray-500 text-center text-sm">No items found matching "{searchQuery}"</div>
                  ) : (
                    <ul className="py-2">
                      {filteredItems.map(item => (
                        <li 
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base">{item.is_veg ? '🟩' : '🟥'}</span>
                            <span className="font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 px-2 py-1 rounded-md text-gray-500">{item.business_type}</span>
                            <span className="font-bold text-gray-900">₹{item.price}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cart Container - Mobile Cards */}
          <div className="flex-1 overflow-y-auto bg-gray-50/30 p-2 md:hidden hide-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                <ShoppingBag className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-base font-medium">Cart is empty</p>
                <p className="text-xs text-center mt-1 opacity-70">Search for items above to start adding</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-2">
                        <span className="text-xs mt-0.5">{item.is_veg ? '🟩' : '🟥'}</span>
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-sm leading-tight">{item.name}</span>
                          <span className="text-xs text-gray-500 mt-0.5">₹{item.price} per item</span>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white rounded-md shadow-sm transition-all active:scale-95">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-bold text-sm text-gray-800">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white rounded-md shadow-sm transition-all active:scale-95">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="font-bold text-gray-900">₹{item.price * item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Container - Desktop Table */}
          <div className="hidden md:block flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm z-10">
                <tr>
                  <th className="p-4 font-semibold text-gray-500 text-sm uppercase tracking-wider w-12">#</th>
                  <th className="p-4 font-semibold text-gray-500 text-sm uppercase tracking-wider">Item Details</th>
                  <th className="p-4 font-semibold text-gray-500 text-sm uppercase tracking-wider text-right w-24">Price</th>
                  <th className="p-4 font-semibold text-gray-500 text-sm uppercase tracking-wider text-center w-36">Quantity</th>
                  <th className="p-4 font-semibold text-gray-500 text-sm uppercase tracking-wider text-right w-28">Total</th>
                  <th className="p-4 font-semibold text-gray-500 text-sm uppercase tracking-wider text-center w-16"></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-gray-400">
                      <div className="flex flex-col items-center">
                        <ShoppingBag className="w-12 h-12 mb-4 text-gray-300" />
                        <p className="text-lg font-medium text-gray-500">Cart is empty</p>
                        <p className="text-sm mt-1">Search and add items using the bar above</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors group">
                      <td className="p-4 text-gray-400 text-sm font-medium">{index + 1}</td>
                      <td className="p-4 font-semibold text-gray-700">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm shadow-sm rounded-md bg-white p-0.5">{item.is_veg ? '🟩' : '🟥'}</span>
                          {item.name}
                        </div>
                      </td>
                      <td className="p-4 text-right font-medium text-gray-500">₹{item.price}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1 border border-gray-200 rounded-xl bg-gray-50 p-1 w-[104px] mx-auto transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm transition-all">
                            <Minus className="w-4 h-4" />
                          </button>
                          <input 
                            type="number"
                            value={item.quantity}
                            onChange={(e) => setQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-8 text-center font-bold text-sm bg-transparent outline-none appearance-none"
                            min="1"
                          />
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm transition-all">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-gray-800 text-lg">₹{item.price * item.quantity}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side - Payment Summary & Controls */}
        <div className="w-full lg:w-96 flex flex-col shrink-0 gap-4 md:gap-6 pb-20 md:pb-0">
          
          {/* Order Details Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-400" />
              Order Configuration
            </h3>
            
            <div className="space-y-5">
              {/* Modern Segmented Control for Order Type */}
              <div className="bg-gray-100 p-1.5 rounded-xl flex gap-1 relative">
                <button
                  onClick={() => setOrderType('dine_in')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    orderType === 'dine_in' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  Dine In
                </button>
                <button
                  onClick={() => setOrderType('dine_out')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    orderType === 'dine_out' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Takeaway
                </button>
              </div>

              {/* Modern Segmented Control for Payment Method */}
              <div className="bg-gray-100 p-1.5 rounded-xl flex gap-1 relative">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    paymentMethod === 'cash' ? 'bg-white text-green-600 shadow-sm border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Cash
                </button>
                <button
                  onClick={() => setPaymentMethod('direct_qr')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    paymentMethod === 'direct_qr' ? 'bg-white text-blue-600 shadow-sm border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  UPI / QR
                </button>
              </div>
            </div>
          </div>

          {/* Grand Total & Checkout Card */}
          <div className="bg-gray-900 text-white rounded-2xl shadow-xl p-6 mt-auto">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-gray-400 font-medium text-sm mb-1">Grand Total ({totalItems} items)</p>
                <div className="text-4xl font-black tracking-tight">₹{total}</div>
              </div>
            </div>
            
            <button
              onClick={handleCompleteOrder}
              disabled={isSubmitting || cart.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                cart.length === 0 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : paymentMethod === 'cash' 
                    ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/25'
                    : 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/25'
              }`}
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  {cart.length === 0 ? 'Add Items to Bill' : 'Complete Order'}
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        hideCancel={modalConfig.isError}
        confirmText={modalConfig.isError ? "OK" : "Confirm"}
        isDestructive={modalConfig.isError}
      />
    </div>
  );
}
