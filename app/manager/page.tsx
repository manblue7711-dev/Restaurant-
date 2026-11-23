'use client';

import { useEffect, useState } from 'react';

type DashboardData = {
  sales: { sale_date: string; total_orders: number; gross_revenue: number }[];
  lowStock: { id: number; name: string; unit: string; stock_quantity: number }[];
  menu: { id: number; name: string; price: number; is_available: boolean }[];
  ingredients: { id: number; name: string; unit: string; stock_quantity: number }[];
};

export default function ManagerPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [newDish, setNewDish] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const loadDashboard = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/manager/dashboard`);
      if (res.ok) setData(await res.json());
    } catch {
      alert('Could not load manager data');
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const addDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDish || !newPrice) return;
    setSaving(true);
    await fetch(`${apiUrl}/api/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newDish, price: Number(newPrice) }),
    });
    setNewDish('');
    setNewPrice('');
    setSaving(false);
    loadDashboard();
  };

  const toggleDish = async (id: number, current: boolean) => {
    await fetch(`${apiUrl}/api/menu/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !current }),
    });
    loadDashboard();
  };

  const restockIngredient = async (id: number, name: string, unit: string) => {
    const qty = prompt(`How many ${unit} of ${name} are you adding?`);
    if (!qty || isNaN(Number(qty))) return;
    await fetch(`${apiUrl}/api/ingredients/${id}/restock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ add_quantity: Number(qty) }),
    });
    loadDashboard();
  };

  if (!data) return <div className="p-6 text-sm text-gray-500">Loading dashboard...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Manager Dashboard</h1>

      {/* 1. Low Stock Alerts */}
      {data.lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-300 p-4 rounded-xl">
          <h2 className="font-bold text-red-800 text-sm mb-2">Low Stock Alerts</h2>
          <div className="flex flex-wrap gap-2">
            {data.lowStock.map((item) => (
              <span
                key={item.id}
                className="bg-red-600 text-white text-xs px-2.5 py-1 rounded-full font-medium"
              >
                {item.name}: {item.stock_quantity} {item.unit} left
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2. Daily Sales Revenue */}
      <div className="bg-white p-4 rounded-xl border">
        <h2 className="font-bold text-lg mb-3">Daily Sales Summary</h2>
        {data.sales.length === 0 ? (
          <p className="text-xs text-gray-500">No completed sales recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {data.sales.map((day) => (
              <div key={day.sale_date} className="flex justify-between text-sm border-b pb-1">
                <span>{day.sale_date} ({day.total_orders} orders)</span>
                <span className="font-bold text-green-700">
                  GH₵ {Number(day.gross_revenue).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Menu Manager */}
      <div className="bg-white p-4 rounded-xl border">
        <h2 className="font-bold text-lg mb-3">Menu Management</h2>
        <form onSubmit={addDish} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Dish name (e.g. Red Red & Plantain)"
            value={newDish}
            onChange={(e) => setNewDish(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Price (GH₵)"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-full sm:w-32 border rounded-lg px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-amber-600 text-white font-bold px-4 py-2 rounded-lg text-sm"
          >
            Add Dish
          </button>
        </form>

        <div className="divide-y">
          {data.menu.map((item) => (
            <div key={item.id} className="py-2.5 flex justify-between items-center">
              <div>
                <span className="font-medium">{item.name}</span>
                <span className="text-sm text-amber-700 font-bold ml-2">
                  GH₵ {Number(item.price).toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => toggleDish(item.id, item.is_available)}
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  item.is_available
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {item.is_available ? 'Available' : 'Sold Out'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Ingredient Stock */}
      <div className="bg-white p-4 rounded-xl border">
        <h2 className="font-bold text-lg mb-3">Kitchen Inventory</h2>
        <div className="divide-y">
          {data.ingredients.map((ing) => (
            <div key={ing.id} className="py-2.5 flex justify-between items-center">
              <div>
                <div className="font-medium">{ing.name}</div>
                <div className="text-xs text-gray-500">
                  In stock: {ing.stock_quantity} {ing.unit}
                </div>
              </div>
              <button
                onClick={() => restockIngredient(ing.id, ing.name, ing.unit)}
                className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
              >
                + Restock
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
