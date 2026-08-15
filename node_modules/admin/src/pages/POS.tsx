import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Check, Receipt } from 'lucide-react';

export default function POS() {
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<{item: any, qty: number}[]>([]);
  const [orderType, setOrderType] = useState('dine_in');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase.from('menu_items').select('*').eq('is_available', true);
    if (!error && data) setItems(data);
    setLoading(false);
  };

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { item, qty: 1 }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.item.id === id) {
        return { ...c, qty: Math.max(0, c.qty + delta) };
      }
      return c;
    }).filter(c => c.qty > 0));
  };

  const subtotal = cart.reduce((sum, c) => sum + (c.item.price * c.qty), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    
    // Create order
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      order_type: orderType,
      status: 'delivered', // POS means instant fulfillment usually
      business_type: cart[0].item.business_type,
      source: 'pos_manual',
      items_subtotal: subtotal,
      grand_total: subtotal
    }).select().single();

    if (orderError) {
      alert('Error creating order');
      setSaving(false);
      return;
    }

    // Insert items
    const orderItems = cart.map(c => ({
      order_id: orderData.id,
      menu_item_id: c.item.id,
      item_name: c.item.name,
      quantity: c.qty,
      unit_price: c.item.price,
      total_price: c.item.price * c.qty
    }));
    await supabase.from('order_items').insert(orderItems);

    // Insert payment
    await supabase.from('payments').insert({
      order_id: orderData.id,
      payment_status: 'manual_success',
      payment_method: paymentMethod,
      amount: subtotal
    });

    setCart([]);
    setSaving(false);
    alert('Order logged successfully!');
  };

  if (loading) return <div className="p-8">Loading POS...</div>;

  return (
    <div className="flex h-full p-4 gap-4">
      <div className="flex-1 bg-white rounded-lg shadow-sm border p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Menu Items</h2>
        <div className="grid grid-cols-3 gap-4 overflow-auto">
          {items.map(item => (
            <div 
              key={item.id} 
              onClick={() => addToCart(item)}
              className="border rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col justify-between h-32"
            >
              <div className="font-medium">{item.name}</div>
              <div className="text-blue-600 font-bold">?{item.price}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-96 bg-white rounded-lg shadow-sm border p-4 flex flex-col">
        <div className="flex items-center space-x-2 border-b pb-4 mb-4">
          <Receipt size={24} />
          <h2 className="text-xl font-bold">Current Order</h2>
        </div>

        <div className="flex-1 overflow-auto space-y-4">
          {cart.length === 0 ? (
            <div className="text-gray-500 text-center py-8">Cart is empty</div>
          ) : (
            cart.map(c => (
              <div key={c.item.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium">{c.item.name}</div>
                  <div className="text-sm text-gray-500">?{c.item.price} x {c.qty}</div>
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => updateQty(c.item.id, -1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200">-</button>
                  <span className="w-4 text-center">{c.qty}</span>
                  <button onClick={() => updateQty(c.item.id, 1)} className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold hover:bg-blue-200">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-4 mt-4 space-y-4">
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>?{subtotal}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select 
              className="border rounded p-2 text-sm"
              value={orderType}
              onChange={e => setOrderType(e.target.value)}
            >
              <option value="dine_in">Dine-in</option>
              <option value="dine_out">Takeaway</option>
            </select>
            <select 
              className="border rounded p-2 text-sm"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="direct_qr">Direct QR Scan</option>
            </select>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0 || saving}
            className="w-full bg-green-600 text-white p-3 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50 flex justify-center items-center space-x-2"
          >
            {saving ? <span>Processing...</span> : <><Check size={20} /><span>Complete Order</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}
