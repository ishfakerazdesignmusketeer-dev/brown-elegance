import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  id: string;
  name: string;
  slug: string;
  image: string;
  size: string;
  quantity: number;
  unit_price: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: { id: string; name: string; slug: string; image: string; price: number }, size: string, qty?: number) => void;
  removeItem: (id: string, size: string) => void;
  updateQuantity: (id: string, size: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sessionId: string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = "brown_cart";
const SESSION_KEY = "brown_session_id";

function getOrCreateSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const sessionId = useRef<string>(getOrCreateSessionId()).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));

    // Debounced upsert to abandoned_carts — only when cart has items
    if (items.length > 0) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
        await supabase.from("abandoned_carts").upsert(
          {
            session_id: sessionId,
            items: items as unknown as import("@/integrations/supabase/types").Json,
            subtotal,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_id" }
        );
      }, 2000);
    }
  }, [items, sessionId]);

  const addItem = useCallback((
    product: { id: string; name: string; slug: string; image: string; price: number },
    size: string,
    qty = 1
  ) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id && i.size === size);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id && i.size === size
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.image,
          size,
          quantity: qty,
          unit_price: product.price,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: string, size: string) => {
    setItems((prev) => prev.filter((i) => !(i.id === id && i.size === size)));
  }, []);

  const updateQuantity = useCallback((id: string, size: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => !(i.id === id && i.size === size)));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === id && i.size === size ? { ...i, quantity: qty } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal, isOpen, setIsOpen, sessionId }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
