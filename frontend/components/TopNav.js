import { useState, useEffect } from 'react';
import { auth } from '../lib/api';
import { isDemoMode } from '../lib/demoApi';
import Icon from './Icon';

export default function TopNav({ user, onLogout, currentView, onNavigate }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const isDemo = isDemoMode();

  // Close dropdown when view changes
  useEffect(() => {
    setShowDropdown(false);
  }, [currentView]);

  const handleLogout = async () => {
    try {
      await auth.logout();
      onLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setShowDropdown(false);
      setSyncProgress({ status: 'connecting', message: 'Connecting to Discogs...' });

      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const eventSource = new EventSource(`${baseURL}/api/collection/sync`, {
        withCredentials: true
      });

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setSyncProgress(data);

        if (data.status === 'complete') {
          eventSource.close();
          setSyncing(false);
          setTimeout(() => {
            setSyncProgress(null);
            alert(`Sync complete! ${data.synced} albums synced.`);
          }, 1000);
        } else if (data.status === 'error') {
          eventSource.close();
          setSyncing(false);
          setSyncProgress(null);
          alert('Failed to sync collection');
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setSyncing(false);
        setSyncProgress(null);
        alert('Failed to sync collection');
      };
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncing(false);
      setSyncProgress(null);
      alert('Failed to sync collection');
    }
  };

  return (
    <>
      <nav className="bg-black px-4 py-3">
        <div className="mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate && onNavigate('stacks')}
            className="transition-opacity hover:opacity-80 cursor-pointer"
            aria-label="Go to Stacks"
          >
            <img
              src="/icons/SpinStack Logo.svg"
              alt="SpinStack"
              className="h-[18px]"
            />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 text-sm text-gray-400 bg-gray-900 rounded-lg px-4 py-2 overflow-hidden hover:text-gray-300 transition-all min-h-[44px]"
            >
              <Icon name="user" size={16} className="text-gray-400" />
              <span>@{user?.discogs_username}</span>
              <Icon
                name={showDropdown ? "chevron-up" : "chevron-down"}
                size={16}
                className="text-gray-400 transition-transform duration-200"
              />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-900 rounded-lg shadow-lg z-50 animate-fadeIn border border-gray-800">
                {!isDemo && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center gap-3 transition-colors min-h-[44px]"
                  >
                    <Icon
                      name="repeat"
                      size={18}
                      className={`${syncing ? 'animate-spin' : ''} text-gray-400`}
                    />
                    <span className="text-white">Sync with Discogs</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://spinstack.app';
                    const shareText = 'Check out SpinStack - Discover your vinyl collection in a whole new way!';
                    if (navigator.share) {
                      navigator.share({ title: 'SpinStack', text: shareText, url: shareUrl }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      alert('Link copied to clipboard!');
                    }
                    setShowDropdown(false);
                  }}
                  className="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 flex items-center gap-3 transition-colors min-h-[44px]"
                >
                  <Icon name="share" size={18} className="text-gray-400" />
                  <span className="text-white">Share SpinStack</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 flex items-center gap-3 transition-colors min-h-[44px]"
                >
                  <Icon name="log-out" size={18} className="text-gray-400" />
                  <span className="text-white">{isDemo ? 'End Demo' : 'Sign Out'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Sync progress banner */}
      {syncProgress && (
        <div className="bg-blue-600 px-4 py-3 text-white text-sm">
          <div className="mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="repeat" size={16} className="animate-spin" />
              <span>{syncProgress.message}</span>
            </div>
            {syncProgress.total && syncProgress.current !== undefined && (
              <div className="flex items-center gap-3">
                <span className="text-blue-100">
                  {syncProgress.current} / {syncProgress.total}
                </span>
                <div className="w-32 bg-blue-800 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
