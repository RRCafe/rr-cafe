import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import LiveOrders from './pages/LiveOrders';
import MenuManager from './pages/MenuManager';
import Billing from './pages/Billing';
import Orders from './pages/Orders';
import DeliveryPartners from './pages/DeliveryPartners';
import DeliveryPartnerDetails from './pages/DeliveryPartnerDetails';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<LiveOrders />} />
            <Route path="menu" element={<MenuManager />} />
            <Route path="billing" element={<Billing />} />
            <Route path="orders" element={<Orders />} />
            <Route path="partners" element={<DeliveryPartners />} />
            <Route path="partners/:id" element={<DeliveryPartnerDetails />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
