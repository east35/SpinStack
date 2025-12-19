'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '../../../lib/api';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasHandled = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      const oauthVerifier = searchParams.get('oauth_verifier');

      if (!oauthVerifier) {
        alert('Authentication failed: Missing verification code');
        router.replace('/');
        return;
      }

      try {
        await auth.callback(oauthVerifier);
        // Use replace instead of push to prevent back button issues
        router.replace('/');
      } catch (error) {
        console.error('Authentication callback failed:', error);
        alert('Authentication failed. Please try again.');
        router.replace('/');
      }
    };

    if (!hasHandled.current) {
      hasHandled.current = true;
      handleCallback();
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl mb-4">Completing authentication...</div>
        <div className="text-gray-400">Please wait while we connect your account.</div>
      </div>
    </div>
  );
}
