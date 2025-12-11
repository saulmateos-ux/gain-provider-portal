/**
 * Header Component
 *
 * Main application header with GAIN branding and navigation
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { COLORS } from '@/lib/design-tokens';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Users,
  Wallet,
  Layers,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Collections', href: '/collections', icon: TrendingUp },
  { name: 'Receivables', href: '/receivables', icon: Wallet },
  { name: 'Partial Advances', href: '/tranches', icon: Layers },
  { name: 'Law Firms', href: '/law-firms', icon: Users },
  { name: 'Cases', href: '/cases', icon: FileText },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-xl"
                style={{ backgroundColor: COLORS.brand.teal }}
              >
                G
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">GAIN</h1>
                <p className="text-xs text-gray-500">Provider Portal</p>
              </div>
            </Link>

            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: COLORS.brand.tealLight, color: COLORS.brand.tealDark }
                        : undefined
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Side - Provider Name */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Therapy Partners Group
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
