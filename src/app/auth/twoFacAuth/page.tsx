'use client';

import Link from 'next/link';

/*
 * Two-factor authentication is not implemented yet. The previous page only
 * simulated it (nothing was stored and the "disable" password was hard-coded),
 * which told users their account was protected when it wasn't.
 * Real 2FA should use Supabase MFA (supabase.auth.mfa.enroll / challenge / verify).
 */
const TwoFacAuth = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Two-factor authentication</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Two-factor authentication isn&apos;t available yet. We&apos;ll let you know when you can turn it on.
      </p>
      <Link
        href="/dashboard"
        className="inline-block py-3 px-6 rounded-lg bg-[#f54502] hover:bg-[#d63a02] text-white font-semibold"
      >
        Back to dashboard
      </Link>
    </div>
  </div>
);

export default TwoFacAuth;
