import { useState } from 'react';
import { auth } from '../lib/api';
import { enableDemoMode } from '../lib/demoApi';
import RoadmapModal from './RoadmapModal';
import axios from 'axios';

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      // Clear any existing session data before starting new login
      localStorage.removeItem('vinyl_session_id');
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_in_progress');
      sessionStorage.removeItem('oauth_completed');

      const response = await auth.login();
      // Store state in sessionStorage for the callback
      if (response.data.state) {
        sessionStorage.setItem('oauth_state', response.data.state);
      }
      // Store a flag to prevent back button from showing login page after auth
      sessionStorage.setItem('oauth_in_progress', 'true');
      // Redirect user to Discogs authorization
      window.location.href = response.data.authorizeUrl;
    } catch (error) {
      console.error('Login failed:', error);
      alert('Failed to initiate login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    enableDemoMode();
    onLogin(); // Trigger re-check which will now use demo mode
  };

  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/import/csv`,
        formData,
        { withCredentials: true }
      );

      alert(`Successfully imported ${response.data.imported} records!`);
      onLogin(); // Refresh to show the dashboard
    } catch (error) {
      console.error('CSV import failed:', error);
      alert('Failed to import CSV. Please check the format and try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
         <img
          src="/icons/SpinStack Logo.svg"
          alt="SpinStack"
          className='mx-auto'
        />
        <p className="text-gray-400 mb-8 mt-4">
          Discover your vinyl collection in a whole new way. Generate playlists, track listening stats, and rediscover forgotten gems.
        </p>

        <button
          onClick={handleDemoMode}
          className="btn-primary w-full"
        >
          Explore Demo
        </button>
        <p className="text-xs text-gray-500 mt-3">
          Experience SpinStack with a sample collection. No login required.
        </p>

        <div className="mt-8 pt-6 border-t border-gray-800">
          <p className="text-sm text-gray-400 mb-4">
            The full app connects to your Discogs account to sync your real collection and track your listening habits.
          </p>
          <button
            onClick={() => setShowRoadmap(true)}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            View Roadmap →
          </button>
        </div>
      </div>

      {showRoadmap && <RoadmapModal onClose={() => setShowRoadmap(false)} />}
    </div>
  );
}
