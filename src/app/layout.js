// src/app/layout.js
import { Geist } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';

const geist = Geist({ subsets: ['latin'] });

export const metadata = {
  title: 'Outfit AI',
  description: 'Your personal AI stylist',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-neutral-950 text-white min-h-screen`}>
        <Nav />
        {/* pb-20 on mobile so content clears the bottom tab bar */}
        <main className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}