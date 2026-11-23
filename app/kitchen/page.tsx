'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Order = {
  id: string;
  order_type: string;
  status: string;
  created_at: string;
  order_items: {
    quantity: number;
    notes: string;
    menu_items: { name: string } | null;
  }[];
};

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchActiveOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_type, status, created_at,
        order_items ( quantity, notes, menu_items ( name ) )
      `)
      .in('status', ['pending', 'preparing'])
      .order('created_at', { ascending: true });

    if (data) setOrders(data as unknown as Order[]);
  };

  useEffect(() => {
    fetchActiveOrders();

    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchActiveOrders()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items' },
        () => fetchActiveOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    fetchActiveOrders();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Kitchen Display (Live)</h1>
      {orders.length === 0 && (
        <p className="text-gray-400">No active orders right now.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className={`p-4 rounded-xl border-2 ${
              order.status === 'pending'
                ? 'border-amber-500 bg-gray-800'
                : 'border-blue-500 bg-gray-800'
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="uppercase font-bold text-xs px-2 py-1 rounded bg-gray-700">
                {order.order_type.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(order.created_at).toLocaleTimeString()}
              </span>
            </div>

            <ul className="space-y-2 mb-5">
              {order.order_items?.map((item, idx) => (
                <li key={idx} className="text-base">
                  <span className="font-bold text-amber-400">{item.quantity}x</span>{' '}
                  {item.menu_items?.name}
                  {item.notes && (
                    <div className="text-xs text-red-300">Note: {item.notes}</div>
                  )}
                </li>
              ))}
            </ul>

            {order.status === 'pending' ? (
              <button
                onClick={() => updateStatus(order.id, 'preparing')}
                className="w-full py-3 bg-amber-600 active:bg-amber-700 rounded-lg font-bold"
              >
                Start Cooking
              </button>
            ) : (
              <button
                onClick={() => updateStatus(order.id, 'ready')}
                className="w-full py-3 bg-green-600 active:bg-green-700 rounded-lg font-bold"
              >
                Mark Ready
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
