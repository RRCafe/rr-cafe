import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function MenuManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase.from('menu_items').select('*').order('name');
    if (!error && data) setItems(data);
    setLoading(false);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Menu Manager</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          <Plus size={20} />
          <span>Add Item</span>
        </button>
      </div>
      
      {loading ? (
        <div>Loading menu...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.is_veg ? '?? Veg' : '?? Non-Veg'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">?{item.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{item.business_type.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={\px-2 inline-flex text-xs leading-5 font-semibold rounded-full \\}>
                      {item.is_available ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3"><Pencil size={18} /></button>
                    <button className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No menu items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
