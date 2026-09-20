import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { ShoppingBag, User, LogOut, ChevronRight, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';

import { requestNotificationPermission, showNotification } from '../lib/notifications';

export default function CustomerLayout() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const { itemsCount, subtotal } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    requestNotificationPermission();

    if (user) {
      // Check for missing profile setup
      const checkProfile = async () => {
        const { data } = await supabase.from('customer').select('phone, address, avatar_url').eq('id', user.id).maybeSingle();
        // Set avatar with fallback
        if (data?.avatar_url) {
          setAvatar(data.avatar_url);
        } else if (user?.user_metadata?.avatar_url) {
          setAvatar(user.user_metadata.avatar_url);
        }

        if (data) {
          if ((!data.phone || !data.address) && sessionStorage.getItem('profileSetup') !== 'skipped') {
            if (location.pathname !== '/profile-setup') {
              navigate('/profile-setup');
            }
          }
        } else {
          // No customer row yet, still show fallback avatar if available
          if (user?.user_metadata?.avatar_url) {
            setAvatar(user.user_metadata.avatar_url);
          }
        }
      };
      checkProfile();

      // Listen for order updates
      const channel = supabase.channel('customer_orders')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` }, (payload: any) => {
           if (payload.old.status !== payload.new.status) {
              const statusMap: any = {
                'preparing': 'Your order is now being prepared!',
                'ready': 'Your order is ready for delivery!',
                'out_for_delivery': 'Your order is on the way!',
                'delivered': 'Your order has been delivered!'
              };
              if (statusMap[payload.new.status]) {
                 showNotification('Order Update', { body: statusMap[payload.new.status] }, `/track/${payload.new.id}`);
              }
           }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setAvatar(null);
    }
  }, [user, navigate, location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-red-600">RR Cafe</Link>

          <div className="flex items-center space-x-4">
            {user && (
              <Link to="/orders" className="relative p-2 text-gray-700 hover:bg-gray-100 hover:text-red-600 rounded-full transition-colors">
                <Receipt size={24} />
              </Link>
            )}

            <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ShoppingBag size={24} />
              {itemsCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {itemsCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  {avatar ? (
                    <img src={avatar} alt="Profile" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-gray-200" />
                  ) : (
                    <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                      <User size={18} />
                    </div>
                  )}
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-20 overflow-hidden">
                      <div className="p-3 border-b text-sm text-gray-500 truncate bg-gray-50">{user.email}</div>
                      <button
                        onClick={() => { signOut(); setShowMenu(false); }}
                        className="w-full text-left p-3 text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                      >
                        <LogOut size={16} />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4">
        <Outlet />
      </main>

      {/* Sticky Cart Banner */}
      {itemsCount > 0 && location.pathname !== '/cart' && !location.pathname.includes('/track') && (
        <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 animate-fade-in-up">
          <Link 
            to="/cart"
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-xl p-4 flex items-center justify-between transition-all"
          >
            <div>
              <p className="text-xs text-green-100 font-medium uppercase tracking-wider mb-0.5">Your Cart</p>
              <p className="font-bold">{itemsCount} {itemsCount === 1 ? 'item' : 'items'} | ₹{subtotal}</p>
            </div>
            <div className="flex items-center gap-1 font-bold">
              View Cart <ChevronRight size={20} />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
