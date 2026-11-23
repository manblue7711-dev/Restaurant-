'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Order = {
  id: string;
  order_type: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: {
    quantity: number;
    unit_price: number;
    menu_items: { name: string } | null;
  }[];
};

export default function CashierPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [method, setMethod] = useState<'cash' | 'momo'>('cash');
  const [refCode, setRefCode] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    order: Order;
    method: string;
    refCode: string;
    paidAt: string;
  } | null>(null);

  const fetchUnpaidOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_type, status, total_amount, created_at,
        order_items ( quantity, unit_price, menu_items ( name ) )
      `)
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: false });

    if (data) setOrders(data as unknown as Order[]);
  };

  useEffect(() => {
    fetchUnpaidOrders();
  }, []);

  const handlePayment = async (order: Order) => {
    setPayingId(order.id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/orders/${order.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: order.total_amount,
          method,
          reference_code: method === 'momo' ? refCode : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Payment failed: ' + (err.error || 'Unknown error'));
      } else {
        setReceipt({
          order,
          method: method.toUpperCase(),
          refCode,
          paidAt: new Date().toLocaleString(),
        });
        setRefCode('');
        fetchUnpaidOrders();
      }
    } catch {
      alert('Network error reaching payment server');
    }
    setPayingId(null);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Cashier &amp; Payments</h1>
        <button
          onClick={fetchUnpaidOrders}
          className="text-xs bg-gray-200 px-3 py-1.5 rounded-lg font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <div className="mb-6 bg-white p-5 rounded-xl border-2 border-green-600 shadow">
          <div className="text-center border-b pb-3 mb-3">
            <h2 className="font-bold text-lg">AUNTIE&apos;S RESTAURANT</h2>
            <p className="text-xs text-gray-500">Official Payment Receipt</p>
            <p className="text-xs text-gray-400 mt-1">{receipt.paidAt}</p>
          </div>
          <div className="space-y-1 text-sm mb-3">
            {receipt.order.order_items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span>
                  {item.quantity}x {item.menu_items?.name}
                </span>
                <span>GH₵ {(item.quantity * item.unit_price).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 flex justify-between font-bold text-base">
            <span>TOTAL PAID ({receipt.method})</span>
            <span>GH₵ {Number(receipt.order.total_amount).toFixed(2)}</span>
          </div>
          {receipt.refCode && (
            <p className="text-xs text-gray-600 mt-1">MoMo Ref: {receipt.refCode}</p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => window.print()}
              className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold"
            >
              Print Receipt
            </button>
            <button
              onClick={() => setReceipt(null)}
              className="flex-1 py-2 bg-gray-200 rounded-lg text-sm font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Payment Method Selector */}
      <div className="bg-white p-4 rounded-xl border mb-4">
        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
          Select Payment Method
        </label>
        <div className="flex gap-2 mb-3">
          {(['cash', 'momo'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 py-2 rounded-lg font-bold text-sm uppercase ${
                method === m ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {m === 'momo' ? 'Mobile Money (MoMo)' : 'Cash'}
            </button>
          ))}
        </div>
        {method === 'momo' && (
          <input
            type="text"
            placeholder="Enter MoMo Transaction ID (optional)"
            value={refCode}
            onChange={(e) => setRefCode(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        )}
      </div>

      {/* Active Orders List */}
      <div className="space-y-3">
        {orders.length === 0 && (
          <p className="text-sm text-gray-500">No unpaid orders right now.</p>
        )}
        {orders.map((order) => (
          <div key={order.id} className="bg-white p-4 rounded-xl border shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                {order.status} • {order.order_type.replace('_', ' ')}
              </span>
              <span className="font-bold text-lg text-green-700">
                GH₵ {Number(order.total_amount).toFixed(2)}
              </span>
            </div>
            <ul className="text-sm text-gray-700 mb-3">
              {order.order_items.map((item, idx) => (
                <li key={idx}>
                  {item.quantity}x {item.menu_items?.name}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePayment(order)}
              disabled={payingId === order.id}
              className="w-full py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {payingId === order.id
                ? 'Processing...'
                : `Confirm ${method.toUpperCase()} Payment`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
