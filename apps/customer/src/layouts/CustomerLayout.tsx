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
    <div className="min-h-screen bg-transparent flex flex-col pb-24 text-[var(--color-foreground)]">
      <header className="glass sticky top-0 z-50 border-b-0 border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-serif font-bold text-white tracking-wider flex items-center gap-2">
            <span className="bg-gradient-to-br from-red-500 to-amber-500 text-transparent bg-clip-text">RR Cafe</span>
          </Link>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {user && (
              <Link to="/orders" className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300">
                <Receipt size={22} />
              </Link>
            )}

            <Link to="/cart" className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300">
              <ShoppingBag size={22} />
              {itemsCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-[var(--color-background)] shadow-lg animate-scale-in">
                  {itemsCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center space-x-2 p-1 hover:bg-white/10 rounded-full transition-all duration-300"
                >
                  {avatar ? (
                    <img src={avatar} alt="Profile" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-white/20 shadow-md" />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-full flex items-center justify-center shadow-md">
                      <User size={18} />
                    </div>
                  )}
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="glass absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl z-20 overflow-hidden border border-white/10 animate-fade-in-up">
                      <div className="p-4 border-b border-white/10 bg-white/5">
                        <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Signed in as</p>
                        <p className="text-sm text-white font-medium truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { signOut(); setShowMenu(false); }}
                        className="w-full text-left p-4 text-red-400 hover:bg-white/5 hover:text-red-300 flex items-center space-x-3 transition-colors"
                      >
                        <LogOut size={18} />
                        <span className="font-medium tracking-wide">Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="glass-button px-5 py-2 rounded-full font-medium shadow-lg tracking-wide text-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 animate-fade-in-up">
        <Outlet />
      </main>

      {/* Sticky Cart Banner */}
      {itemsCount > 0 && location.pathname !== '/cart' && !location.pathname.includes('/track') && (
        <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 animate-fade-in-up">
          <Link 
            to="/cart"
            className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-[0_8px_32px_rgba(16,185,129,0.4)] p-4 flex items-center justify-between transition-all hover:scale-[1.02] border border-white/20"
          >
            {/* Glassmorphism sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform"></div>
            
            <div className="relative z-10 text-white">
              <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mb-1 opacity-90">View Your Order</p>
              <p className="font-bold text-lg leading-none">{itemsCount} {itemsCount === 1 ? 'Item' : 'Items'} <span className="opacity-70 mx-1">|</span> ,1{subtotal}</p>
            </div>
            <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/20 group-hover:bg-white/30 text-white transition-colors">
              <ChevronRight size={24} />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
