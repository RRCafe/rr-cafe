import re

with open('apps/delivery/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

ui_target = """        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {activeOrder ? 'Active Delivery' : 'Available Orders'}
          </h2>

          {activeOrder ? (
            <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
              <div className="bg-red-50 p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-red-700">Order RR-{activeOrder.id.split('-')[0].toUpperCase()}</span>
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">Commission: â‚¹{activeOrder.partner_commission || 0}</span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex flex-col gap-2 text-gray-700">
                  <div className="flex gap-3">
                    <MapPin className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-sm">{activeOrder.delivery_address || 'Customer Location'}</p>
                  </div>
                  {activeOrder.delivery_lat && activeOrder.delivery_lng && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=8.395596,78.052598&destination=${activeOrder.delivery_lat},${activeOrder.delivery_lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-8 text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1"
                    >
                      View Route in Google Maps
                    </a>
                  )}
                </div>
                
                {activeOrder.status === 'out_for_delivery' ? (
                  <button
                    onClick={() => markDelivered(activeOrder.id)}
                    className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-medium py-3 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle size={20} />
                    Mark Delivered
                  </button>
                ) : (
                  <button
                    onClick={() => supabase.from('orders').update({ status: 'out_for_delivery' }).eq('id', activeOrder.id)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white font-medium py-3 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Package size={20} />
                    Mark Picked Up
                  </button>
                )}
              </div>
            </div>
          ) : availableOrders.length > 0 ? ("""

ui_replace = """        <div>
          {activeOrders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Active Deliveries</h2>
              <div className="space-y-4">
                {activeOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                    <div className="bg-red-50 p-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-red-700">Order RR-{order.id.split('-')[0].toUpperCase()}</span>
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">Commission: â‚¹{order.partner_commission || 0}</span>
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex flex-col gap-2 text-gray-700">
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${order.status === 'ready' ? 'bg-green-100 text-green-700' : order.status === 'preparing' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{order.status.replace('_', ' ')}</span>
                        </div>
                        <div className="flex gap-3 mt-2">
                          <MapPin className="text-red-500 shrink-0 mt-0.5" size={20} />
                          <p className="text-sm">{order.delivery_address || 'Customer Location'}</p>
                        </div>
                        {order.delivery_lat && order.delivery_lng && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&origin=8.395596,78.052598&destination=${order.delivery_lat},${order.delivery_lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-8 text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1"
                          >
                            View Route in Google Maps
                          </a>
                        )}
                      </div>
                      
                      {order.status === 'out_for_delivery' ? (
                        <button
                          onClick={() => markDelivered(order.id)}
                          className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-medium py-3 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <CheckCircle size={20} />
                          Mark Delivered
                        </button>
                      ) : (
                        <button
                          onClick={() => markPickedUp(order.id)}
                          disabled={order.status !== 'ready'}
                          className={`w-full flex items-center justify-center gap-2 font-medium py-3 rounded-lg transition-colors ${order.status === 'ready' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                        >
                          <Package size={20} />
                          {order.status === 'ready' ? 'Mark Picked Up' : 'Waiting for Cafe (Preparing)'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Available Orders
          </h2>

          {availableOrders.length > 0 ? ("""

content = content.replace(ui_target, ui_replace)

# Also fix the old markDelivered that I couldn't delete effectively
old_mark_delivered = """  async function markDelivered(orderId: string) {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    fetchDashboardData();
  }"""
content = content.replace(old_mark_delivered, "") # Delete all occurrences

# Fix encoding issues with rupees
content = content.replace("â‚¹", "₹")

with open('apps/delivery/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
