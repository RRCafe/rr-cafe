import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, UtensilsCrossed, Receipt, Settings as SettingsIcon, LogOut, History, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DashboardLayout() {
  const { user, loading, isOwner } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isOwner) {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: 'Live Orders', path: '/', icon: LayoutDashboard },
    { name: 'Billing', path: '/billing', icon: Receipt },
    { name: 'Menu Manager', path: '/menu', icon: UtensilsCrossed },
    { name: 'Orders History', path: '/orders', icon: History },
    { name: 'Delivery Partners', path: '/partners', icon: Users },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-20 hover:w-64 transition-all duration-300 ease-in-out bg-white border-r border-gray-200 flex-col overflow-hidden group z-50 h-full">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0 whitespace-nowrap">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
            RR
          </div>
          <h1 className="text-xl font-bold text-gray-800 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">RR Cafe Admin</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.name}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-6 h-6 shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 shrink-0">
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="w-full flex items-center gap-3 px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            <LogOut className="w-6 h-6 shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex items-center justify-around z-40 h-16 px-2 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'fill-blue-50' : ''}`} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
