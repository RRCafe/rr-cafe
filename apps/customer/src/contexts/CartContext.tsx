import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type CartItem = {
  item: {
    id: string;
    name: string;
    price: number;
    is_veg: boolean;
    image_url: string | null;
  };
  qty: number;
};

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: any) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  itemsCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('customer_cart');
    if (stored) {
      try {
        setCartItems(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const syncToStorage = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem('customer_cart', JSON.stringify(items));
  };

  const addToCart = (item: any) => {
    const existing = cartItems.find(c => c.item.id === item.id);
    if (existing) {
      syncToStorage(cartItems.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      syncToStorage([...cartItems, { item, qty: 1 }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    const updated = cartItems.map(c => {
      if (c.item.id === id) {
        return { ...c, qty: Math.max(0, c.qty + delta) };
      }
      return c;
    }).filter(c => c.qty > 0);
    syncToStorage(updated);
  };

  const clearCart = () => {
    syncToStorage([]);
  };

  const itemsCount = cartItems.reduce((acc, c) => acc + c.qty, 0);
  const subtotal = Number(cartItems.reduce((acc, c) => acc + (c.item.price * c.qty), 0).toFixed(2));

  return (
    <CartContext.Provider value={{ cartItems, addToCart, updateQty, clearCart, itemsCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
