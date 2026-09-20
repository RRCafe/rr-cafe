import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { Search } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  is_veg: boolean;
  business_type: string;
  image_url: string | null;
}

export default function Menu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToCart, cartItems, updateQty } = useCart();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    // Fetch all available items
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('name');
      
    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="sticky top-16 bg-gray-50 z-10 pt-4 pb-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-red-500 outline-none transition-shadow"
          />
          <Search className="absolute left-4 top-3.5 text-gray-400" />
        </div>
      </div>

      <div className="pb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu</h2>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex bg-white p-4 rounded-2xl">
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="ml-4 w-32 h-32 bg-gray-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No items found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredItems.map(item => {
              const cartItem = cartItems.find(c => c.item.id === item.id);
              const qty = cartItem?.qty || 0;

              return (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between gap-4">
                  
                  {/* Left Side: Info */}
                  <div className="flex-1 flex flex-col">
                    <div className="mb-1">
                      <span className="text-xs mr-2">{item.is_veg ? '🟩' : '🟥'}</span>
                      {item.business_type === 'wholesale_icecream' && (
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Icecream</span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{item.name}</h3>
                    <p className="font-semibold text-gray-700 mb-2">₹{item.price}</p>
                    {item.description && (
                      <p className="text-gray-500 text-sm line-clamp-2 mt-auto">{item.description}</p>
                    )}
                  </div>

                  {/* Right Side: Image & Add Button */}
                  <div className="relative flex flex-col items-center">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <span className="text-xs font-medium">No Image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24">
                      {qty === 0 ? (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-full bg-white text-green-600 font-bold py-1.5 px-4 rounded-lg border border-gray-200 shadow-md hover:bg-gray-50 uppercase text-sm tracking-wider"
                        >
                          ADD
                        </button>
                      ) : (
                        <div className="w-full bg-white text-green-600 font-bold py-1 px-2 rounded-lg border border-gray-200 shadow-md flex items-center justify-between text-sm">
                          <button onClick={() => updateQty(item.id, -1)} className="px-2 py-0.5 hover:bg-green-50 rounded text-xl leading-none">&minus;</button>
                          <span>{qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="px-2 py-0.5 hover:bg-green-50 rounded text-xl leading-none">+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
