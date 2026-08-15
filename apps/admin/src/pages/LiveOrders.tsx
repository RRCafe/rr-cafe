import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, ChefHat, CheckCircle, Truck, Package } from 'lucide-react';

export default function LiveOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    const channel = supabase.channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), profiles(full_name, phone)')
      .neq('status', 'delivered')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });
      
    if (!error && data) setOrders(data);
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', id);
  };

  const columns = [
    { id: 'placed', title: 'New', icon: <Package size={18} /> },
    { id: 'preparing', title: 'Preparing', icon: <ChefHat size={18} /> },
    { id: 'ready', title: 'Ready', icon: <CheckCircle size={18} /> },
    { id: 'out_for_delivery', title: 'Out', icon: <Truck size={18} /> },
  ];

  if (loading) return <div className="p-8">Loading Live Board...</div>;

  return (
    <div className="p-8 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
        <Clock className="text-blue-600" />
        <span>Live Orders Kanban</span>
      </h2>
      
      <div className="flex-1 flex gap-4 overflow-x-auto">
        {columns.map(col => (
          <div key={col.id} className="bg-gray-50 flex-1 min-w-[300px] rounded-lg border flex flex-col">
            <div className="p-3 border-b bg-gray-100 font-bold flex items-center space-x-2 rounded-t-lg">
              {col.icon}
              <span>{col.title}</span>
              <span className="ml-auto bg-gray-200 text-xs px-2 py-1 rounded-full">
                {orders.filter(o => o.status === col.id).length}
              </span>
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {orders.filter(o => o.status === col.id).map(order => (
                <div key={order.id} className="bg-white p-3 rounded shadow-sm border border-l-4 border-l-blue-500 text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold">#{order.order_number}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  
                  <div className="mb-2">
                    <div className="font-medium">{order.order_type.replace('_', '-').toUpperCase()}</div>
                    <div className="text-gray-500 capitalize">{order.business_type.replace('_', ' ')}</div>
                  </div>
                  
                  <div className="bg-gray-50 p-2 rounded mb-3 max-h-24 overflow-y-auto">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span>{item.quantity}x {item.item_name}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 mt-auto pt-2 border-t">
                    {col.id === 'placed' && (
                      <button onClick={() => updateStatus(order.id, 'preparing')} className="flex-1 bg-blue-100 text-blue-700 py-1 rounded hover:bg-blue-200">Accept</button>
                    )}
                    {col.id === 'preparing' && (
                      <button onClick={() => updateStatus(order.id, 'ready')} className="flex-1 bg-green-100 text-green-700 py-1 rounded hover:bg-green-200">Mark Ready</button>
                    )}
                    {col.id === 'ready' && order.order_type === 'delivery' && (
                      <button className="flex-1 bg-orange-100 text-orange-700 py-1 rounded cursor-not-allowed opacity-50" disabled>Waiting for Driver</button>
                    )}
                    {col.id === 'ready' && order.order_type !== 'delivery' && (
                      <button onClick={() => updateStatus(order.id, 'delivered')} className="flex-1 bg-gray-800 text-white py-1 rounded hover:bg-gray-900">Complete</button>
                    )}
                    {col.id === 'out_for_delivery' && (
                      <button className="flex-1 bg-gray-100 text-gray-500 py-1 rounded cursor-not-allowed opacity-50" disabled>Driver Completing...</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
