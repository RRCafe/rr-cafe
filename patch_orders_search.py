import re

with open('apps/admin/src/pages/Orders.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add states and ref
target_states = """  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);"""
replace_states = """  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);"""

# We need to import React or useRef if not imported.
target_imports = "import { useEffect, useState } from 'react';"
replace_imports = "import React, { useEffect, useState, useRef } from 'react';"

# 2. Add click outside handler in useEffect
target_effect = """  useEffect(() => {
    fetchOrders();
  }, []);"""
replace_effect = """  useEffect(() => {
    fetchOrders();
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);"""

# 3. Add filtered orders logic
target_fetch = """  const fetchOrders = async () => {"""
replace_fetch = """  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    `RR-${o.id.split('-')[0].toUpperCase()}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchOrders = async () => {"""

# 4. Replace search bar UI
target_ui = """        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search orders..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
        </div>"""
replace_ui = """        <div className="relative w-72" ref={searchRef}>
          <input
            type="text"
            placeholder="Search Order ID (e.g. RR-XXX)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          
          {isDropdownOpen && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">No orders found</div>
              ) : (
                <ul>
                  {filteredOrders.map(order => (
                    <li 
                      key={order.id}
                      onClick={() => {
                        viewOrderDetails(order);
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                      }}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">RR-{order.id.split('-')[0].toUpperCase()}</span>
                        <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>"""

content = content.replace(target_imports, replace_imports)
content = content.replace(target_states, replace_states)
content = content.replace(target_effect, replace_effect)
content = content.replace(target_fetch, replace_fetch)
content = content.replace(target_ui, replace_ui)

with open('apps/admin/src/pages/Orders.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
