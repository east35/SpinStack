'use client';

import { useEffect, useState } from 'react';
import { collection } from '../lib/api';
import CollectionGrid from './CollectionGrid';
import PlaylistGenerator from './PlaylistGenerator';
import MusicTab from './MusicTab';

const NAV_ITEMS = [
  { id: 'music', label: 'Music' },
  { id: 'collection', label: 'Collection' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'account', label: 'Account' },
];

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('music');
  const [stats, setStats] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await collection.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await collection.sync();
      alert(`Synced ${response.data.synced} records!`);
      loadStats();
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Failed to sync collection. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const NavButton = ({ item }) => (
    <button
      onClick={() => setActiveTab(item.id)}
      className={`flex-1 md:flex-none md:w-full text-center py-3 md:py-2.5 rounded-lg transition-colors min-h-[44px] text-sm md:text-base ${
        activeTab === item.id
          ? 'bg-secondary text-white font-medium'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {item.label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-56 border-r border-gray-800 px-4 py-6 gap-6">
        <div>
          <h1 className="text-xl font-bold">Vinyl Collection</h1>
          <p className="text-gray-500 text-sm">@{user.discogs_username}</p>
        </div>
        <div className="space-y-2">
          {NAV_ITEMS.map((item) => (
            <NavButton key={item.id} item={item} />
          ))}
        </div>
        <div className="mt-auto space-y-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary w-full disabled:opacity-50 min-h-[44px]"
          >
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          <button onClick={onLogout} className="text-sm text-gray-400 hover:text-white w-full text-left py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors min-h-[44px]">
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between md:hidden">
          <div>
            <h1 className="text-xl font-bold">Vinyl Collection</h1>
            <p className="text-gray-500 text-sm">@{user.discogs_username}</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary disabled:opacity-50 min-h-[44px] px-4"
          >
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </header>

        {stats && (
          <div className="bg-secondary px-4 md:px-6 py-4">
            <div className="max-w-6xl mx-auto grid grid-cols-3 gap-2 md:gap-4 text-center md:text-left">
              <div>
                <div className="text-xl md:text-2xl font-bold">{stats.stats.total_records}</div>
                <div className="text-xs md:text-sm text-gray-400">Records</div>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold">{stats.stats.total_artists}</div>
                <div className="text-xs md:text-sm text-gray-400">Artists</div>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold">{stats.stats.total_genres}</div>
                <div className="text-xs md:text-sm text-gray-400">Genres</div>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-20 md:pb-8 w-full">
          {activeTab === 'music' && <MusicTab />}
          {activeTab === 'collection' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Your Collection</h2>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="btn-secondary hidden md:inline-flex disabled:opacity-50"
                >
                  {syncing ? 'Syncing…' : 'Sync'}
                </button>
              </div>
              <CollectionGrid />
            </div>
          )}
          {activeTab === 'playlists' && <PlaylistGenerator />}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Account</h2>
              <div className="bg-secondary rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Discogs Username</div>
                    <div className="font-semibold">{user.discogs_username}</div>
                  </div>
                  <button onClick={onLogout} className="btn-secondary min-h-[44px]">
                    Logout
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  Keep your session active to sync new purchases automatically.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Bottom nav for mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-black px-2 py-2 flex gap-2 safe-area-inset-bottom">
          {NAV_ITEMS.map((item) => (
            <NavButton key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
