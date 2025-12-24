import { useState, useEffect, useRef } from 'react';
import { auth, collection } from '../lib/api';
import Icon from './Icon';

export default function TopNav({ user, onLogout, currentView, onNavigate }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when view changes
  useEffect(() => {
    setShowDropdown(false);
  }, [currentView]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

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
      await collection.sync();
      alert('Collection synced successfully!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Failed to sync collection');
    } finally {
      setSyncing(false);
    }
  };

  return (
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

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 text-sm text-gray-400 bg-gray-900 rounded-lg px-4 py-2 overflow-hidden hover:text-gray-300 transition-all min-h-[44px]"
          >
            <Icon name="user" size={16} className="text-gray-400" />
            <span className="hidden md:inline">@{user?.discogs_username}</span>
            <Icon
              name={showDropdown ? "chevron-up" : "chevron-down"}
              size={16}
              className="text-gray-400 transition-transform duration-200"
            />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-900 rounded-lg shadow-lg z-50 animate-fadeIn border border-gray-800">
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
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 flex items-center gap-3 transition-colors min-h-[44px]"
              >
                <Icon name="log-out" size={18} className="text-gray-400" />
                <span className="text-white">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
