'use client';

import { useEffect, useState } from 'react';
import { auth } from '../lib/api';
import SpinStackDashboard from '../components/SpinStackDashboard';
import Login from '../components/Login';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    // Prevent back button from going to OAuth pages after authentication
    const preventOAuthBackNav = () => {
      // If user just completed OAuth, they shouldn't be able to go back to it
      const oauthCompleted = sessionStorage.getItem('oauth_completed');
      if (oauthCompleted === 'true') {
        // Push a new state to prevent going back
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    // Check on mount
    preventOAuthBackNav();

    // Listen for popstate (back/forward button)
    window.addEventListener('popstate', preventOAuthBackNav);
    return () => window.removeEventListener('popstate', preventOAuthBackNav);
  }, []);

  const checkAuth = async () => {
    try {
      const response = await auth.me();
      setUser(response.data.user);
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    checkAuth();
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
      // Clear session ID from localStorage
      localStorage.removeItem('vinyl_session_id');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Cueing...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      {user ? (
        <SpinStackDashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </main>
  );
}
