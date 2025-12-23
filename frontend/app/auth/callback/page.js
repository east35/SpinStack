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
      // Get state from URL (Discogs passes it back) or from sessionStorage
      const stateFromUrl = searchParams.get('state');
      const stateFromStorage = sessionStorage.getItem('oauth_state');
      const state = stateFromUrl || stateFromStorage;

      if (!oauthVerifier) {
        alert('Authentication failed: Missing verification code');
        router.replace('/');
        return;
      }

      try {
        // Pass both verifier and state to backend
        const response = await auth.callback(oauthVerifier, state);

        // Store session ID if provided (fallback for when cookies don't work)
        if (response.data.sessionId) {
          localStorage.setItem('vinyl_session_id', response.data.sessionId);
          console.log('✅ Session ID stored:', response.data.sessionId);
        }

        // Clear stored state and set completion flag
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_in_progress');
        sessionStorage.setItem('oauth_completed', 'true');
        // Use location.replace to avoid adding callback page to history
        window.location.replace('/');
      } catch (error) {
        console.error('Authentication callback failed:', error);
        alert('Authentication failed. Please try again.');
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_in_progress');
        sessionStorage.removeItem('oauth_completed');
        window.location.replace('/');
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
