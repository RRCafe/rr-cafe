import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Minus, Check, Receipt, Trash2, Search } from 'lucide-react';
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

  const handleCompleteOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          status: 'delivered',
          source: 'pos_manual',
          order_type: orderType,
          grand_total: total,
          items_subtotal: total,
          business_type: 'cafe'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        item_name: item.name,
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
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] sm:h-screen p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Billing Console</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
        {/* Left Side - Billing Table & Search */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Item Search Bar */}
          <div className="p-4 border-b border-gray-200 bg-gray-50" ref={searchRef}>
            <div className="relative">
              <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                <Search className="w-5 h-5 text-gray-400 ml-3" />
                <input
                  type="text"
                  placeholder="Search and add items (e.g. 'Coffee')..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="flex-1 p-3 outline-none"
                />
              </div>

              {/* Combobox Dropdown */}
              {isDropdownOpen && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                  {filteredItems.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center">No items found matching "{searchQuery}"</div>
                  ) : (
                    <ul>
                      {filteredItems.map(item => (
                        <li 
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span>{item.is_veg ? '🟩' : '🟥'}</span>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{item.business_type}</span>
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

          {/* Table Container */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-0">
                <tr>
                  <th className="p-4 font-semibold text-gray-600 w-12">#</th>
                  <th className="p-4 font-semibold text-gray-600">Item Name</th>
                  <th className="p-4 font-semibold text-gray-600 text-right w-24">Price</th>
                  <th className="p-4 font-semibold text-gray-600 text-center w-32">Qty</th>
                  <th className="p-4 font-semibold text-gray-600 text-right w-28">Total</th>
                  <th className="p-4 font-semibold text-gray-600 text-center w-16"></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-400">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg">No items added to bill yet</p>
                      <p className="text-sm">Search and add items using the bar above</p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                      <td className="p-4 text-gray-500">{index + 1}</td>
                      <td className="p-4 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{item.is_veg ? '🟩' : '🟥'}</span>
                          {item.name}
                        </div>
                      </td>
                      <td className="p-4 text-right text-gray-600">₹{item.price}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1 border border-gray-300 rounded-lg bg-white overflow-hidden w-24 mx-auto">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600">
                            <Minus className="w-4 h-4" />
                          </button>
                          <input 
                            type="number"
                            value={item.quantity}
                            onChange={(e) => setQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-8 text-center font-medium outline-none appearance-none"
                            min="1"
                          />
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-gray-900">₹{item.price * item.quantity}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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

        {/* Right Side - Payment Summary */}
        <div className="w-full lg:w-96 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col shrink-0">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-bold text-lg text-gray-800 mb-6">Payment Summary</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-gray-600">
                <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-medium">₹{total}</span>
              </div>
              
              <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="font-bold text-xl text-gray-800">Grand Total</span>
                <span className="font-bold text-3xl text-blue-600">₹{total}</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 flex-1 flex flex-col justify-between rounded-b-xl">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOrderType('dine_in')}
                    className={`py-3 rounded-lg font-medium border transition-colors ${
                      orderType === 'dine_in' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Dine In
                  </button>
                  <button
                    onClick={() => setOrderType('dine_out')}
                    className={`py-3 rounded-lg font-medium border transition-colors ${
                      orderType === 'dine_out' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Takeaway
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-3 rounded-lg font-medium border transition-colors ${
                      paymentMethod === 'cash' ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('direct_qr')}
                    className={`py-3 rounded-lg font-medium border transition-colors ${
                      paymentMethod === 'direct_qr' ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Direct QR
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleCompleteOrder}
              disabled={cart.length === 0 || isSubmitting}
              className={`w-full mt-8 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg text-white transition-all ${
                cart.length === 0 || isSubmitting 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-gray-900 hover:bg-black shadow-lg hover:shadow-xl hover:-translate-y-0.5'
              }`}
            >
              <Check className="w-6 h-6" />
              {isSubmitting ? 'Processing...' : 'Complete Billing'}
            </button>
          </div>
        </div>
      </div>
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
  );
}
