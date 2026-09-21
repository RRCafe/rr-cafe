import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, X, Image as ImageIcon, Pencil, Check, Search, ChevronDown } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

let cached_items: any = null;

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_veg: boolean;
  business_type: string;
  is_available: boolean;
  image_url: string | null;
}

const BUSINESS_TYPES = ['cafe', 'restaurant', 'bakery', 'sweets'];

export default function MenuManager() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemVeg, setNewItemVeg] = useState(true);
  const [newItemBusiness, setNewItemBusiness] = useState('cafe');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // UI states
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', isError: false });
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, imageUrl: string | null } | null>(null);

  // Custom Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cached_items) {
      setItems(cached_items);
      fetchItems();
    } else {
      fetchItems();
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('menu_items').select('*').order('name');
    if (!error && data) {
      cached_items = data;
      setItems(data);
    }
    setLoading(false);
  };

  const handleSavePrice = async (id: string) => {
    const newPrice = parseFloat(editingPriceValue);
    if (isNaN(newPrice) || newPrice < 0) {
      setModalConfig({ isOpen: true, title: 'Error', message: 'Invalid price', isError: true });
      return;
    }
    
    const { error } = await supabase.from('menu_items').update({ price: newPrice }).eq('id', id);
    if (!error) {
      setEditingPriceId(null);
      fetchItems();
    } else {
      setModalConfig({ isOpen: true, title: 'Error', message: 'Failed to update price', isError: true });
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id);
    fetchItems();
  };

  const deleteItem = async (id: string, imageUrl: string | null) => {
    await supabase.from('menu_items').delete().eq('id', id);
    if (imageUrl) {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('menu-items').remove([fileName]);
      }
    }
    fetchItems();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let publicImageUrl = null;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('menu-items').upload(fileName, imageFile);
      
      if (!uploadError) {
        const { data } = supabase.storage.from('menu-items').getPublicUrl(fileName);
        publicImageUrl = data.publicUrl;
      }
    }

    const { error } = await supabase.from('menu_items').insert({
      name: newItemName,
      price: parseFloat(newItemPrice),
      is_veg: newItemVeg,
      business_type: newItemBusiness,
      is_available: true,
      image_url: publicImageUrl
    });
    
    if (!error) {
      setModalConfig({ isOpen: true, title: 'Success', message: 'Menu item added successfully!', isError: false });
      setIsModalOpen(false);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemVeg(true);
      setNewItemBusiness('cafe');
      setImageFile(null);
      fetchItems();
    } else {
      console.error(error);
      setModalConfig({ isOpen: true, title: 'Error', message: 'Error adding item: ' + error.message, isError: true });
    }
    setIsSubmitting(false);
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">Menu Manager</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-sm shadow-blue-500/30 hover:bg-blue-500 transition-all active:scale-95 text-sm md:text-base"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Item</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="bg-white border border-gray-200/60 shadow-sm rounded-2xl p-3 mb-6 shrink-0 flex items-center focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
        <Search className="w-5 h-5 text-gray-400 ml-2" />
        <input 
          type="text" 
          placeholder="Search menu items..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none px-3 py-1 text-gray-700 placeholder-gray-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No items found.</div>
          ) : (
            filteredItems.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-xl shrink-0 border border-gray-100" />
                ) : (
                  <div className="w-20 h-20 bg-gray-50 rounded-xl shrink-0 flex items-center justify-center text-gray-300 border border-gray-100">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 truncate leading-tight flex items-center gap-1.5">
                      <span className="text-xs">{item.is_veg ? 'ðŸŸ©' : 'ðŸŸ¥'}</span>
                      {item.name}
                    </h3>
                    <button 
                      onClick={() => toggleAvailability(item.id, item.is_available)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {item.is_available ? 'In Stock' : 'Out'}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-md">{item.business_type}</span>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    {editingPriceId === item.id ? (
                      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                        <span className="text-gray-500 text-sm font-medium pl-2">â‚¹</span>
                        <input
                          type="number"
                          autoFocus
                          value={editingPriceValue}
                          onChange={(e) => setEditingPriceValue(e.target.value)}
                          className="w-16 bg-transparent outline-none text-sm font-bold text-gray-900"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSavePrice(item.id);
                            if (e.key === 'Escape') setEditingPriceId(null);
                          }}
                        />
                        <button onClick={() => handleSavePrice(item.id)} className="p-1 bg-blue-600 text-white rounded-md">
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="font-black text-gray-900 text-lg flex items-center gap-2">
                        â‚¹{item.price}
                        <button onClick={() => { setEditingPriceValue(item.price.toString()); setEditingPriceId(item.id); }} className="text-blue-500 p-1 hover:bg-blue-50 rounded-md">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    
                    <button onClick={() => setConfirmDelete({ id: item.id, imageUrl: item.image_url })} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-gray-500 text-sm uppercase tracking-wider w-20 text-center">Image</th>
                <th className="p-4 font-semibold text-gray-500 text-sm uppercase tracking-wider">Item Name</th>
                <th className="p-4 font-semibold text-gray-500 text-sm uppercase tracking-wider">Price</th>
                <th className="p-4 font-semibold text-gray-500 text-sm uppercase tracking-wider">Business Type</th>
                <th className="p-4 font-semibold text-gray-500 text-sm uppercase tracking-wider">Available</th>
                <th className="p-4 font-semibold text-gray-500 text-sm uppercase tracking-wider text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading menu items...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No items found</td></tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors group">
                    <td className="p-4 flex justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-xl shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm bg-white shadow-sm p-1 rounded-md">{item.is_veg ? 'ðŸŸ©' : 'ðŸŸ¥'}</span>
                        <span className="font-bold text-gray-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700 font-medium">
                      {editingPriceId === item.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-bold">â‚¹</span>
                          <input
                            type="number"
                            autoFocus
                            value={editingPriceValue}
                            onChange={(e) => setEditingPriceValue(e.target.value)}
                            className="w-20 px-3 py-1.5 border-2 border-blue-500 rounded-lg text-sm font-bold focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSavePrice(item.id);
                              if (e.key === 'Escape') setEditingPriceId(null);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/price cursor-pointer w-max" onClick={() => { setEditingPriceValue(item.price.toString()); setEditingPriceId(item.id); }}>
                          <span>â‚¹{item.price}</span>
                          <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover/price:text-blue-500 transition-colors" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-lg">
                        {item.business_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleAvailability(item.id, item.is_available)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                          item.is_available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {item.is_available ? 'Available' : 'Out of Stock'}
                      </button>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <button 
                        onClick={() => setConfirmDelete({ id: item.id, imageUrl: item.image_url })}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Add New Menu Item</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddItem} className="p-6 overflow-y-auto hide-scrollbar space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. Masala Dosa"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Price (â‚¹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dietary Type</label>
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setNewItemVeg(true)}
                    className={`py-2.5 flex justify-center items-center gap-2 rounded-lg text-sm font-bold transition-all ${newItemVeg ? 'bg-white text-green-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    ðŸŸ© Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewItemVeg(false)}
                    className={`py-2.5 flex justify-center items-center gap-2 rounded-lg text-sm font-bold transition-all ${!newItemVeg ? 'bg-white text-red-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    ðŸŸ¥ Non-Veg
                  </button>
                </div>
              </div>

              {/* Custom Smooth Dropdown for Business Type */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Business Type</label>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <span className="capitalize font-medium text-gray-800">{newItemBusiness}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-200/50 overflow-hidden z-50 py-1">
                    {BUSINESS_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setNewItemBusiness(type);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 ${newItemBusiness === type ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'}`}
                      >
                        <span className="capitalize">{type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Image (Optional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-400 transition-colors bg-gray-50/50">
                  <div className="space-y-1 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">{imageFile ? imageFile.name : 'PNG, JPG, GIF up to 5MB'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Add Item to Menu'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Delete Item"
        message="Are you sure you want to delete this menu item? This action cannot be undone."
        onConfirm={() => {
          if (confirmDelete) deleteItem(confirmDelete.id, confirmDelete.imageUrl);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
        isDestructive={true}
        confirmText="Delete"
      />

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        hideCancel={modalConfig.isError}
        confirmText={modalConfig.isError ? "OK" : "Confirm"}
        isDestructive={modalConfig.isError}
      />
    </div>
  );
}

