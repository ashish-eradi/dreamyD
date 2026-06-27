'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';

const NAV = [
  { label: 'OVERVIEW', items: [
    { href: '/dashboard',               icon: '◈', label: 'Overview'         },
  ]},
  { label: 'USERS', items: [
    { href: '/dashboard/users',         icon: '◉', label: 'User Management'  },
    { href: '/dashboard/subscriptions', icon: '◎', label: 'Subscriptions'    },
  ]},
  { label: 'MONEY', items: [
    { href: '/dashboard/revenue',       icon: '₹', label: 'Revenue'          },
    { href: '/dashboard/expenses',      icon: '◱', label: 'Expenses'         },
  ]},
  { label: 'AI & INFRA', items: [
    { href: '/dashboard/api-costs',     icon: '⬡', label: 'API Costs'        },
    { href: '/dashboard/health',        icon: '♡', label: 'App Health'       },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <aside className="w-56 shrink-0 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <span className="text-xl mr-2">☾</span>
        <span className="text-sm font-semibold text-gray-800">DreamDiary</span>
        <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium">Admin</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {NAV.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <span className="text-base w-4 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <span>↩</span> Sign out
        </button>
      </div>
    </aside>
  );
}
