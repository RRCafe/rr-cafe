import { Outlet, Navigate, Link } from 'react-router-dom';
import { Truck, LogOut, Receipt } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function DeliveryLayout() {
  const { user, loading, isPartner, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isPartner) {
    return <Navigate to="/onboarding" replace />;
  }

  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-red-600 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Truck size={24} />
          <span>RR Partner</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center justify-center text-white border-2 border-transparent hover:border-white/50"
            aria-label="Orders History"
          >
            <Receipt size={20} />
          </Link>
          <Link
            to="/account"
            className="w-10 h-10 rounded-full bg-white/20 overflow-hidden hover:bg-white/30 transition border-2 border-white/50 cursor-pointer flex items-center justify-center"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-white uppercase">{user.email?.charAt(0) || 'U'}</span>
            )}
          </Link>
          <button
            onClick={signOut}
            className="p-2 hover:bg-red-700 rounded-full transition-colors text-white"
            aria-label="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 max-w-lg w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
