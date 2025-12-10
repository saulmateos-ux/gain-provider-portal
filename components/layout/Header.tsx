/**
 * Header Component
 *
 * Main application header with GAIN branding
 */

'use client';

import { COLORS } from '@/lib/design-tokens';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
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
            </div>
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
