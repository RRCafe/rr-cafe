import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Receipt, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Order {
  id: string;
  status: string;
  grand_total: number;
  created_at: string;
  order_items: {
    item_name: string;
    quantity: number;
  }[];
}

export default function CustomerOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          grand_total:total_amount,
          created_at,
          order_items (
            quantity,
            item_name:menu_items (name)
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Flatten the relation
        const formattedOrders = data.map(o => ({
          ...o,
          order_items: o.order_items.map((i: any) => ({
            quantity: i.quantity,
            item_name: i.item_name.name
          }))
        }));
        setOrders(formattedOrders);
      }
      setLoading(false);
    };

    fetchOrders();

    const channel = supabase.channel(`customer_orders_list_${user.id}`)
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
      <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in-up">
        <div className="glass-card w-24 h-24 rounded-full flex items-center justify-center mb-6">
          <Receipt size={48} className="text-white/30" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-white mb-2 tracking-wide">Sign In Required</h2>
        <p className="text-white/50 mb-8 max-w-md">Please sign in to view your past orders.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pt-10">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card animate-pulse h-28 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in-up">
        <div className="glass-card w-24 h-24 rounded-full flex items-center justify-center mb-6 border border-dashed border-white/20 shadow-inner">
          <Receipt size={48} className="text-white/30" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-white mb-2 tracking-wide">No orders yet</h2>
        <p className="text-white/50 mb-8 max-w-md">You haven't placed any exquisite orders with us yet.</p>
        <button
          onClick={() => navigate('/')}
          className="glass-button px-8 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center gap-2"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
      <h1 className="text-3xl font-serif font-bold text-white tracking-wide border-b border-white/10 pb-4">Your Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => {
          const isLive = !['delivered', 'cancelled'].includes(order.status);
          const shortId = `RR-${order.id.split('-')[0].toUpperCase()}`;
          return (
            <div
              key={order.id}
              onClick={() => navigate(`/track/${order.id}`)}
              className="glass-card group p-5 sm:p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer hover:bg-white/[0.08] hover:-translate-y-1 transition-all duration-300 gap-4"
            >
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-serif font-bold text-xl text-white">Order {shortId}</span>
                  {isLive ? (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-300 border border-green-500/30 text-xs font-bold rounded uppercase tracking-wider animate-pulse">
                      Live
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-white/10 text-white/60 border border-white/10 text-xs font-bold rounded uppercase tracking-wider">
                      {order.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-white/50 flex items-center gap-1.5 font-medium">
                  <Clock size={14} className="text-white/30" /> 
                  {new Date(order.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>

                <p className="text-sm text-white/70 max-w-sm truncate leading-relaxed">
                  {order.order_items.map(i => `${i.quantity}x ${i.item_name}`).join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-4 text-right sm:border-l border-white/10 sm:pl-6 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Total</div>
                  <div className="font-bold text-red-400 text-xl tracking-wide">,1{order.grand_total}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-red-500 flex items-center justify-center text-white/50 group-hover:text-white transition-all duration-300">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
