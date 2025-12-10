import { redirect } from 'next/navigation';

/**
 * Root Page - Redirects to dashboard
 */
export default function HomePage() {
  // Redirect directly to dashboard (no auth required)
  redirect('/dashboard');
}
