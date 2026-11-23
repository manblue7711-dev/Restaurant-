import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Restaurant POS & Kitchen',
  description: 'Restaurant Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://tailwindcss.com"></script>
      </head>
      <body className="bg-gray-100 text-gray-900">
        <nav className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center sticky top-0 z-10">
          <span className="font-bold text-amber-400">Restaurant System</span>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/" className="hover:text-amber-300">
              POS Order
            </Link>
            <Link href="/kitchen" className="hover:text-amber-300">
              Kitchen Screen
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
