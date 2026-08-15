import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, UtensilsCrossed, Receipt, Settings, LogOut } from 'lucide-react';

export default function DashboardLayout() {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = () => supabase.auth.signOut();

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r shadow-sm flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">RR Cafe Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
            <LayoutDashboard size={20} />
            <span>Live Orders</span>
          </Link>
          <Link to="/menu" className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
            <UtensilsCrossed size={20} />
            <span>Menu Manager</span>
          </Link>
          <Link to="/pos" className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
            <Receipt size={20} />
            <span>POS / Manual</span>
          </Link>
          <Link to="/settings" className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
            <Settings size={20} />
            <span>Settings</span>
          </Link>
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="flex items-center space-x-2 w-full p-2 text-red-600 hover:bg-red-50 rounded">
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
