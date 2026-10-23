import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Receipt, Clock, ChevronRight } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  grand_total: number;
  created_at: string;
  order_items: { item_name: string; quantity: number }[];
}

export default function CustomerOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, grand_total, created_at, order_items(item_name, quantity)')
        .eq('customer_id', user.id)
        .neq('status', 'pending') // don't show unpaid incomplete orders
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data);
      }
      setLoading(false);
    };

    fetchOrders();

    const channel = supabase
      .channel('customer-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view your orders</h2>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-xl shadow-sm border border-gray-100">
        <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
        <p className="text-gray-500 mb-6">You haven't placed any orders with us.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-medium shadow-sm hover:bg-red-700 transition"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Your Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => {
          const isLive = !['delivered', 'cancelled'].includes(order.status);
          const shortId = `RR-${order.id.split('-')[0].toUpperCase()}`;
          return (
            <div
              key={order.id}
              onClick={() => navigate(`/track/${order.id}`)}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-red-200 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-gray-900">Order {shortId}</span>
                  {isLive ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md uppercase tracking-wider">
                      Live
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md uppercase tracking-wider">
                      {order.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock size={14} /> 
                  {new Date(order.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>

                <p className="text-sm text-gray-700 max-w-sm truncate">
                  {order.order_items.map(i => `${i.quantity}x ${i.item_name}`).join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="font-bold text-red-600 text-lg">₹{order.grand_total}</div>
                </div>
                <ChevronRight className="text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
