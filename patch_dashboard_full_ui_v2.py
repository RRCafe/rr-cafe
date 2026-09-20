import re

with open('apps/delivery/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Try with \s* to ignore \r\n vs \n
match = re.search(r'  return \(\s*<div className="space-y-6', content)
if match:
    # Everything before return
    top_part = content[:match.start()]
    new_ui = """  return (
    <div className="space-y-6 relative">
      {status === 'suspend' && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h2>
            <p className="text-gray-600 mb-6">
              Your delivery partner account has been suspended by the administrator. You cannot accept or deliver orders at this time.
            </p>
            <p className="text-sm text-gray-500">
              Please contact the Cafe owner for more information.
            </p>
          </div>
        </div>
      )}

      {/* Header Stats */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">Current Status</p>
          <p className="font-semibold text-lg capitalize">{status}</p>
        </div>
        <button
          onClick={toggleStatus}
          className={`px-6 py-2 rounded-full font-medium text-white transition-colors ${status === 'online' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'}`}
        >
          Go {status === 'online' ? 'Offline' : 'Online'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <p className="text-sm text-gray-500 mb-1">Today's Earnings</p>
        <p className="text-3xl font-bold text-gray-900">₹{earnings.toFixed(2)}</p>
      </div>

      <div>
        {activeOrders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Active Deliveries</h2>
            <div className="space-y-4">
              {activeOrders.map(order => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                  <div className="bg-red-50 p-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-red-700">Order RR-{order.id.split('-')[0].toUpperCase()}</span>
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">Commission: ₹{order.partner_commission || 0}</span>
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

        {availableOrders.length > 0 ? (
          <div className="space-y-4">
            {availableOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-bold text-gray-900">Order RR-{order.id.split('-')[0].toUpperCase()}</span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                    +₹{order.partner_commission || 0}
                  </span>
                </div>
                <div className="flex gap-2 text-gray-600 text-sm mb-4">
                  <MapPin size={16} className="shrink-0 mt-0.5 text-red-500" />
                  <p className="line-clamp-2">{order.delivery_address || 'Customer Location'}</p>
                </div>
                <button
                  onClick={() => acceptOrder(order.id)}
                  disabled={status === 'offline'}
                  className={`w-full font-medium py-2 rounded-lg transition-colors ${status === 'online' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                >
                  {status === 'online' ? 'Accept Order' : 'Go Online to Accept'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={32} />
            </div>
            <p className="text-gray-500 font-medium">No new orders available</p>
            <p className="text-sm text-gray-400 mt-1">We'll notify you when one arrives.</p>
          </div>
        )}
      </div>
      <Toaster position="bottom-center" />
    </div>
  );
}
"""
    with open('apps/delivery/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(top_part + new_ui)
    print("Success")
else:
    print("Failed")
