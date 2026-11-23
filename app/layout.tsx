'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import './globals.css';

type StaffUser = {
  id: string;
  full_name: string;
  role: 'admin' | 'cashier' | 'waiter' | 'kitchen';
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('restaurant_staff');
    if (saved) {
      try {
        setStaff(JSON.parse(saved));
      } catch {
        localStorage.removeItem('restaurant_staff');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_code: pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid PIN');
      } else {
        setStaff(data.user);
        localStorage.setItem('restaurant_staff', JSON.stringify(data.user));
        setPin('');
      }
    } catch {
      setError('Cannot reach server (waking up—try again in 15s)');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setStaff(null);
    localStorage.removeItem('restaurant_staff');
  };

  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900 min-h-screen">
        <nav className="bg-gray-900 text-white px-4 py-3 sticky top-0 z-20">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <span className="font-bold text-amber-400">Auntie&apos;s POS</span>
            {staff && (
              <div className="flex items-center gap-3 text-xs sm:text-sm font-medium">
                <Link href="/" className="hover:text-amber-300">POS</Link>
                <Link href="/kitchen" className="hover:text-amber-300">Kitchen</Link>
                <Link href="/cashier" className="hover:text-amber-300">Cashier</Link>
                {staff.role === 'admin' && (
                  <Link href="/manager" className="text-amber-300 font-bold">Manager</Link>
                )}
                <button
                  onClick={handleLogout}
                  className="bg-gray-700 px-2 py-1 rounded text-xs hover:bg-red-600"
                >
                  Exit ({staff.full_name.split(' ')[0]})
                </button>
              </div>
            )}
          </div>
        </nav>

        {!staff ? (
          <div className="flex items-center justify-center min-h-[80vh] p-4">
            <form
              onSubmit={handleLogin}
              className="bg-white p-6 rounded-2xl shadow-md w-full max-w-sm border"
            >
              <h1 className="text-xl font-bold mb-1">Staff PIN Login</h1>
              <p className="text-xs text-gray-500 mb-4">
                Enter your 4-digit staff PIN to access the system
              </p>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center text-2xl tracking-widest border rounded-xl py-3 mb-3 font-bold"
                required
              />
              {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50"
              >
                {loading ? 'Checking PIN...' : 'Unlock System'}
              </button>
            </form>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
