import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { Search, Info } from 'lucide-react';

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
    <div className="space-y-8 animate-fade-in-up">
      {/* Hero Section */}
      <div className="pt-4 pb-2">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-3 tracking-wide">
          Our Menu
        </h1>
        <p className="text-white/60 text-lg max-w-xl">
          Discover a symphony of flavors crafted with passion. From savory classics to sweet indulgences.
        </p>
      </div>

      {/* Search Bar */}
      <div className="sticky top-20 z-40 pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="relative group max-w-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-amber-500/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="glass-card relative flex items-center rounded-2xl overflow-hidden shadow-lg border border-white/10 group-focus-within:border-white/30 transition-colors">
            <Search className="absolute left-5 text-white/40 group-focus-within:text-red-400 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search for your cravings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-white placeholder-white/30 pl-14 pr-6 py-4 outline-none text-lg"
            />
          </div>
        </div>
      </div>

      <div className="pb-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="glass-card animate-pulse p-5 rounded-3xl flex gap-4">
                <div className="flex-1 space-y-4 py-2">
                  <div className="h-5 bg-white/10 rounded w-3/4"></div>
                  <div className="h-4 bg-white/10 rounded w-1/4"></div>
                  <div className="h-10 bg-white/5 rounded w-full mt-4"></div>
                </div>
                <div className="w-28 h-28 bg-white/10 rounded-2xl"></div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-3xl border border-dashed border-white/20">
            <Info className="mx-auto h-12 w-12 text-white/20 mb-4" />
            <p className="text-white/50 text-xl font-medium tracking-wide">No exquisite dishes found.</p>
            <p className="text-white/30 mt-2">Try searching for something else.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => {
              const cartItem = cartItems.find(c => c.item.id === item.id);
              const qty = cartItem?.qty || 0;

              return (
                <div key={item.id} className="glass-card group relative p-5 rounded-3xl flex flex-col justify-between transition-all duration-300 hover:bg-white/[0.08] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
                  
                  <div className="flex justify-between gap-5 mb-4">
                    {/* Left Side: Info */}
                    <div className="flex-1 flex flex-col pt-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider border ${
                          item.is_veg ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {item.is_veg ? 'VEG' : 'NON-VEG'}
                        </span>
                        {item.business_type === 'wholesale_icecream' && (
                          <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-sm border border-amber-500/20 uppercase tracking-widest">
                            Dessert
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif font-bold text-white text-xl leading-tight mb-1 drop-shadow-md">{item.name}</h3>
                      <p className="font-bold text-red-400 text-lg mb-3 tracking-wide">,1{item.price}</p>
                    </div>

                    {/* Right Side: Image */}
                    <div className="relative shrink-0">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-inner shadow-black/50 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-500">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20 bg-gradient-to-br from-white/5 to-white/0">
                            <span className="text-[10px] font-medium uppercase tracking-widest">No Image</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description & Add Button Row */}
                  <div className="flex items-end justify-between gap-4 mt-auto">
                    <p className="text-white/50 text-sm line-clamp-2 leading-relaxed flex-1 font-light">
                      {item.description || "A signature delight crafted for your tastebuds."}
                    </p>
                    
                    <div className="shrink-0 w-28">
                      {qty === 0 ? (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-full relative overflow-hidden bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl border border-white/10 backdrop-blur-md shadow-lg uppercase text-xs tracking-widest transition-all duration-300 active:scale-95"
                        >
                          <span className="relative z-10">Add</span>
                        </button>
                      ) : (
                        <div className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white font-bold p-1 rounded-xl shadow-[0_4px_15px_rgba(220,38,38,0.4)] flex items-center justify-between transition-all">
                          <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg text-xl leading-none transition-colors">&minus;</button>
                          <span className="text-sm">{qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg text-xl leading-none transition-colors">+</button>
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
