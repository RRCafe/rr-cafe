import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, X, Image as ImageIcon, Pencil, Check } from 'lucide-react';
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

export default function MenuManager() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemVeg, setNewItemVeg] = useState(true);
  const [newItemBusiness, setNewItemBusiness] = useState('cafe');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', isError: false });
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');

  useEffect(() => {
    if (cached_items) {
      setItems(cached_items);
      fetchItems(); // background refresh
    } else {
      fetchItems();
    }
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

  const [confirmDelete, setConfirmDelete] = useState<{ id: string, imageUrl: string | null } | null>(null);

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
      const sanitizedName = newItemName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const fileName = `${sanitizedName}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('menu-items')
        .upload(fileName, imageFile);
        
      if (uploadError) {
        console.error('Image upload failed:', uploadError);
        setModalConfig({ isOpen: true, title: 'Error', message: 'Failed to upload image. Please try again.', isError: true });
        setIsSubmitting(false);
        return;
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('menu-items')
        .getPublicUrl(fileName);
        
      publicImageUrl = publicUrlData.publicUrl;
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

  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Menu Manager</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-semibold text-gray-600 w-16">Image</th>
              <th className="p-4 font-semibold text-gray-600">Item Name</th>
              <th className="p-4 font-semibold text-gray-600">Price (₹)</th>
              <th className="p-4 font-semibold text-gray-600">Business Type</th>
              <th className="p-4 font-semibold text-gray-600">Available</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">Loading menu items...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">No items found</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{item.is_veg ? '🟩' : '🟥'}</span>
                      <span className="font-medium text-gray-800">{item.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    {editingPriceId === item.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">₹</span>
                        <input
                          type="number"
                          autoFocus
                          value={editingPriceValue}
                          onChange={(e) => setEditingPriceValue(e.target.value)}
                          className="w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:border-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSavePrice(item.id);
                            if (e.key === 'Escape') setEditingPriceId(null);
                          }}
                        />
                      </div>
                    ) : (
                      <span>₹{item.price}</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      {item.business_type}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleAvailability(item.id, item.is_available)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.is_available 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {item.is_available ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {editingPriceId === item.id ? (
                        <>
                          <button 
                            onClick={() => handleSavePrice(item.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Save Price"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingPriceId(null)}
                            className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => {
                            setEditingPriceId(item.id);
                            setEditingPriceValue(item.price.toString());
                          }}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Price"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => setConfirmDelete({ id: item.id, imageUrl: item.image_url })}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="Delete Menu Item"
        message="Are you sure you want to delete this menu item? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
        onConfirm={async () => {
          if (confirmDelete) {
            await deleteItem(confirmDelete.id, confirmDelete.imageUrl);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg">Add New Item</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input 
                  type="text" 
                  required 
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <input 
                  type="number" 
                  required 
                  min="0"
                  step="0.01"
                  value={newItemPrice}
                  onChange={e => setNewItemPrice(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="diet" 
                    checked={newItemVeg}
                    onChange={() => setNewItemVeg(true)}
                  />
                  <span>Veg 🟩</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="diet" 
                    checked={!newItemVeg}
                    onChange={() => setNewItemVeg(false)}
                  />
                  <span>Non-Veg 🟥</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <select 
                  value={newItemBusiness}
                  onChange={e => setNewItemBusiness(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="cafe">Cafe</option>
                  <option value="wholesale_icecream">Wholesale Icecream</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Save Item'}
              </button>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText="OK"
        hideCancel={true}
        isDestructive={modalConfig.isError}
        onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </div>
  );
}
