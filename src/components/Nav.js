'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/',           label: 'Recommend'  },
  { href: '/wardrobe',   label: 'Wardrobe'   },
  { href: '/shopping',   label: 'Shopping'   },
  { href: '/boards',     label: 'Style Boards' },
  { href: '/trends',     label: 'Trends'     },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="border-b border-neutral-800 px-6 py-4 flex items-center gap-8">
      <span className="font-semibold tracking-tight text-white mr-4">✦ Outfit AI</span>
      {links.map(l => (
        <Link
          key={l.href}
          href={l.href}
          className={`text-sm transition-colors ${
            path === l.href
              ? 'text-white font-medium'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}