import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import MenuManager from './pages/MenuManager';
import Settings from './pages/Settings';
import POS from './pages/POS';
import LiveOrders from './pages/LiveOrders';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<LiveOrders />} />
            <Route path="/menu" element={<MenuManager />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
