// src/components/Nav.js
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/',         label: 'Outfits',  icon: '✦' },
  { href: '/wardrobe', label: 'Wardrobe', icon: '👗' },
  { href: '/inspo',    label: 'Inspo',    icon: '📌' },
  { href: '/saved',    label: 'Saved',    icon: '🔖' },
  { href: '/shopping', label: 'Shopping', icon: '🛍' },
  { href: '/purchase', label: 'Purchases', icon: '💳' },
];

export default function Nav() {
  const path = usePathname();

  return (
    <>
      {/* ── Desktop top nav ── */}
      <nav className="hidden md:flex border-b border-neutral-800 px-6 py-4 items-center gap-8">
        <span className="font-semibold tracking-tight text-white mr-4 shrink-0">✦ Outfit AI</span>
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm transition-colors shrink-0 ${
              path === l.href ? 'text-white font-medium' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* ── Mobile top header ── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <span className="font-semibold tracking-tight text-white">✦ Outfit AI</span>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-950 border-t border-neutral-800
                      flex items-center justify-around px-2 py-2 safe-area-pb">
        {links.map(l => {
          const active = path === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[52px] ${
                active ? 'text-white' : 'text-neutral-500'
              }`}
            >
              <span className="text-lg leading-none">{l.icon}</span>
              <span className={`text-[10px] leading-none ${active ? 'font-medium' : ''}`}>{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}