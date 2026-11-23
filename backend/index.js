import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Lock down API so only your Cloudflare frontend can call it
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'https://restaurant.manblue7711.workers.dev',
}));
app.use(express.json());

// Admin Supabase client (bypasses RLS safely on the server)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auntie-restaurant-api' });
});

// 2. Staff PIN Login Verification
app.post('/api/staff/login', async (req, res) => {
  const { pin_code } = req.body;
  if (!pin_code) return res.status(400).json({ error: 'PIN required' });

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('pin_code', pin_code)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  res.json({ user: data });
});

// 3. Record Payment & Complete Order
app.post('/api/orders/:id/pay', async (req, res) => {
  const { id } = req.params;
  const { amount, method, reference_code } = req.body;

  const { error: payError } = await supabase
    .from('payments')
    .insert({ order_id: id, amount, method, reference_code });

  if (payError) return res.status(400).json({ error: payError.message });

  const { error: orderError } = await supabase
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', id);

  if (orderError) return res.status(400).json({ error: orderError.message });

  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Backend API listening on port ${PORT}`));
