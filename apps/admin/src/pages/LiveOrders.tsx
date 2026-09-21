import { useEffect, useState } from 'react';
import { requestNotificationPermission, showNotification } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import { ChefHat, CheckCircle, Truck, Package } from 'lucide-react';

let cached_orders: any = null;

interface Order {
  id: string;
  status: 'placed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  order_type: 'delivery' | 'dine_in' | 'dine_out';
  business_type: string;
  created_at: string;
  order_items: any[];
  delivery_partner_id?: string;
  order_number?: string;
  customer?: { name: string; phone: string } | null;
  partner?: { name: string; phone_number: string } | null;
}

export default function LiveOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    requestNotificationPermission();

    if (cached_orders) {
      setOrders(cached_orders);
      fetchOrders();
    } else {
      fetchOrders();
    }

    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          showNotification('New Order Received!', { body: `Order #${payload.new.order_number || payload.new.id.split('-')[0].toUpperCase()} has been placed.` }, `/orders?order_id=${payload.new.id}`);
        } else if (payload.eventType === 'UPDATE') {
          if (!payload.old.delivery_partner_id && payload.new.delivery_partner_id) {
            showNotification('Partner Assigned', { body: `A delivery partner accepted Order #${payload.new.order_number || payload.new.id.split('-')[0].toUpperCase()}` }, `/orders?order_id=${payload.new.id}`);
          }
        }
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), customer(name, phone), partner:delivery_partners(name, phone_number)')
      .neq('status', 'delivered')
      .neq('status', 'cancelled')
      .neq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      cached_orders = data;
        setOrders(data);
    }
  };

  const updateOrderStatus = async (id: string, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', id);
  };

  const newOrders = orders.filter(o => o.status === 'placed');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const outForDeliveryOrders = orders.filter(o => o.status === 'out_for_delivery');

  const getShortOrderId = (id: string) => `RR-${id.split('-')[0].toUpperCase()}`;

  const OrderCard = ({ order }: { order: Order }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-lg text-gray-800">{order.order_number || getShortOrderId(order.id)}</span>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
            {new Date(order.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
          </span>
        </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
          {order.order_type.replace('_', ' ')}
        </span>
        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
          {order.business_type}
        </span>
        {order.delivery_partner_id && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium flex items-center gap-1">
            Partner Assigned
          </span>
        )}
      </div>

      {order.customer && order.customer.phone && (
        <div className="mb-2 text-sm bg-gray-50 p-2 rounded flex justify-between items-center">
          <div>
            <p className="font-medium">{order.customer.name || 'Customer'}</p>
          </div>
          <a href={`tel:${order.customer.phone}`} className="text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1 font-medium hover:bg-green-100">
            Call
          </a>
        </div>
      )}

      {order.partner && order.partner.phone_number && (
        <div className="mb-3 text-sm bg-blue-50 p-2 rounded flex justify-between items-center">
          <div>
            <p className="font-medium text-blue-900">{order.partner.name || 'Partner'}</p>
          </div>
          <a href={`tel:${order.partner.phone_number}`} className="text-blue-700 bg-blue-100 px-2 py-1 rounded-full flex items-center gap-1 font-medium hover:bg-blue-200">
            Call
          </a>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {order.order_items?.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between text-sm">
            <span>{item.quantity}x {item.item_name || 'Item'}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
        {order.status === 'placed' && (
          <button 
            onClick={() => updateOrderStatus(order.id, 'preparing')}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700"
          >
            Accept Order
          </button>
        )}
        {order.status === 'preparing' && (
          <button 
            onClick={() => updateOrderStatus(order.id, 'ready')}
            className="flex-1 bg-yellow-500 text-white py-2 rounded-lg font-medium text-sm hover:bg-yellow-600"
          >
            Mark Ready
          </button>
        )}
        {order.status === 'ready' && order.order_type !== 'delivery' && (
          <button 
            onClick={() => updateOrderStatus(order.id, 'delivered')}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-green-700"
          >
            Delivered to Customer
          </button>
        )}
        {order.status === 'ready' && order.order_type === 'delivery' && (
          <button 
            disabled
            className="flex-1 bg-gray-300 text-gray-600 py-2 rounded-lg font-medium text-sm cursor-not-allowed"
          >
            Waiting for Driver
          </button>
        )}
        {order.status === 'out_for_delivery' && (
          <button 
            disabled
            className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg font-medium text-sm"
          >
            On the way
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="mb-4 md:mb-6 flex justify-between items-center shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Live Orders</h2>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 md:overflow-hidden snap-x snap-mandatory pb-4 md:pb-0 hide-scrollbar">
        
        {/* New Orders */}
        <div className="flex flex-col h-full bg-gray-50 rounded-xl p-4 min-w-[85vw] md:min-w-0 snap-center">
          <div className="flex items-center gap-2 mb-4 text-blue-700 font-semibold shrink-0">
            <Package className="w-5 h-5" />
            <h3>New ({newOrders.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {newOrders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        </div>

        {/* Preparing Orders */}
        <div className="flex flex-col h-full bg-orange-50 rounded-xl p-4 min-w-[85vw] md:min-w-0 snap-center">
          <div className="flex items-center gap-2 mb-4 text-orange-700 font-semibold shrink-0">
            <ChefHat className="w-5 h-5" />
            <h3>Preparing ({preparingOrders.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {preparingOrders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        </div>

        {/* Ready Orders */}
        <div className="flex flex-col h-full bg-green-50 rounded-xl p-4 min-w-[85vw] md:min-w-0 snap-center">
          <div className="flex items-center gap-2 mb-4 text-green-700 font-semibold shrink-0">
            <CheckCircle className="w-5 h-5" />
            <h3>Ready ({readyOrders.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {readyOrders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        </div>

        {/* Out for Delivery Orders */}
        <div className="flex flex-col h-full bg-purple-50 rounded-xl p-4 min-w-[85vw] md:min-w-0 snap-center">
          <div className="flex items-center gap-2 mb-4 text-purple-700 font-semibold shrink-0">
            <Truck className="w-5 h-5" />
            <h3>Out for Delivery ({outForDeliveryOrders.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {outForDeliveryOrders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        </div>

      </div>
    </div>
  );
}
