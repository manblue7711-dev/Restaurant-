import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'https://restaurant.manblue7711.workers.dev',
}));
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auntie-restaurant-api' });
});

// 1. Staff PIN Login (shows exact DB error if something is wrong)
app.post('/api/staff/login', async (req, res) => {
  const { pin_code } = req.body;
  if (!pin_code) return res.status(400).json({ error: 'PIN is required' });

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('pin_code', String(pin_code).trim())
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: 'DB Error: ' + error.message });
  }
  if (!data) {
    return res.status(401).json({ error: 'No user found with PIN: ' + pin_code });
  }
  res.json({ user: data });
});

// 2. Cashier: Record Payment & Complete Order
app.post('/api/orders/:id/pay', async (req, res) => {
  const { id } = req.params;
  const { amount, method, reference_code } = req.body;

  const { error: payError } = await supabase
    .from('payments')
    .insert({
      order_id: id,
      amount: Number(amount),
      method,
      reference_code: reference_code || null,
    });

  if (payError) return res.status(400).json({ error: payError.message });

  const { error: orderError } = await supabase
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', id);

  if (orderError) return res.status(400).json({ error: orderError.message });

  res.json({ success: true });
});

// 3. Manager: Summary (Revenue, Low Stock, All Menu & Ingredients)
app.get('/api/manager/dashboard', async (req, res) => {
  const [salesRes, lowStockRes, menuRes, ingredientsRes] = await Promise.all([
    supabase.from('daily_sales_summary').select('*').limit(7),
    supabase.from('low_stock_alerts').select('*'),
    supabase.from('menu_items').select('*').order('name'),
    supabase.from('ingredients').select('*').order('name'),
  ]);

  res.json({
    sales: salesRes.data || [],
    lowStock: lowStockRes.data || [],
    menu: menuRes.data || [],
    ingredients: ingredientsRes.data || [],
  });
});

// 4. Manager: Add New Menu Item
app.post('/api/menu', async (req, res) => {
  const { name, price } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Name and price required' });

  const { data, error } = await supabase
    .from('menu_items')
    .insert({ name: name.trim(), price: Number(price), is_available: true })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ item: data });
});

// 5. Manager: Toggle Menu Availability or Update Price
app.patch('/api/menu/:id', async (req, res) => {
  const { id } = req.params;
  const updates = {};
  if (typeof req.body.is_available === 'boolean') updates.is_available = req.body.is_available;
  if (req.body.price !== undefined) updates.price = Number(req.body.price);

  const { error } = await supabase.from('menu_items').update(updates).eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// 6. Manager: Restock Ingredient
app.patch('/api/ingredients/:id/restock', async (req, res) => {
  const { id } = req.params;
  const { add_quantity } = req.body;

  const { data: current } = await supabase
    .from('ingredients')
    .select('stock_quantity')
    .eq('id', id)
    .single();

  if (!current) return res.status(404).json({ error: 'Ingredient not found' });

  const newQty = Number(current.stock_quantity) + Number(add_quantity);
  const { error } = await supabase
    .from('ingredients')
    .update({ stock_quantity: newQty })
    .eq('id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, stock_quantity: newQty });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Backend API listening on port ${PORT}`));
