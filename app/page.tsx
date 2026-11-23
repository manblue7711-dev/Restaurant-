'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type MenuItem = {
  id: number;
  name: string;
  price: number;
  is_available: boolean;
};

type CartItem = MenuItem & { quantity: number; notes: string };

export default function POSScreen() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('name');
      if (data) setMenu(data);
    };
    fetchMenu();
  }, []);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1, notes: '' }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ order_type: orderType, status: 'pending' })
      .select()
      .single();

    if (orderError || !order) {
      alert('Failed to create order: ' + orderError?.message);
      setSubmitting(false);
      return;
    }

    const itemsPayload = cart.map((item) => ({
      order_id: order.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsPayload);

    if (itemsError) {
      alert('Error adding items: ' + itemsError.message);
    } else {
      setCart([]);
      alert('Order sent to kitchen!');
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Menu Grid */}
      <div className="w-full md:w-2/3 p-4">
        <h1 className="text-xl font-bold mb-3">Menu</h1>
        {menu.length === 0 && (
          <p className="text-sm text-gray-500">
            No menu items found. Add items to your Supabase menu_items table.
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {menu.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="p-4 bg-white rounded-xl shadow-sm active:bg-amber-100 text-left border border-gray-200"
            >
              <div className="font-semibold text-base">{item.name}</div>
              <div className="text-amber-700 font-bold mt-1">
                GH₵ {Number(item.price).toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Order Cart */}
      <div className="w-full md:w-1/3 bg-white p-4 flex flex-col justify-between border-t md:border-t-0 md:border-l">
        <div>
          <h2 className="text-lg font-bold mb-3">Current Order</h2>
          <div className="flex gap-2 mb-4">
            {(['dine_in', 'takeaway'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-2 rounded-lg font-medium text-sm capitalize ${
                  orderType === type
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="space-y-3 mb-6">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center border-b pb-2"
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    GH₵ {(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="w-8 h-8 rounded bg-gray-200 font-bold"
                  >
                    -
                  </button>
                  <span className="font-semibold w-5 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="w-8 h-8 rounded bg-gray-200 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between text-lg font-bold mb-3">
            <span>Total</span>
            <span>GH₵ {total.toFixed(2)}</span>
          </div>
          <button
            onClick={submitOrder}
            disabled={submitting || cart.length === 0}
            className="w-full py-3.5 bg-green-600 text-white font-bold rounded-xl active:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send to Kitchen'}
          </button>
        </div>
      </div>
    </div>
  );
}
