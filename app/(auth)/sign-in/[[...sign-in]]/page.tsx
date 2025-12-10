import { SignIn } from '@clerk/nextjs';
import { Suspense } from 'react';

/**
 * Sign In Page
 *
 * CRITICAL RULE #9: Always wrap Clerk components in Suspense
 */
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">GAIN Provider Portal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your financial analytics
          </p>
        </div>
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <SignIn
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'shadow-lg',
              },
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
