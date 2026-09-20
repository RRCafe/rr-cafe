import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import CustomerLayout from './layouts/CustomerLayout';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import OrderTracker from './pages/OrderTracker';
import ProfileSetup from './pages/ProfileSetup';

import CustomerOrders from './pages/CustomerOrders';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<Menu />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/orders" element={<CustomerOrders />} />
              <Route path="/track/:id" element={<OrderTracker />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
