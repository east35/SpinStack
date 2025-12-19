import { useState } from 'react';
import TopNav from './TopNav';
import StacksView from './StacksView';
import CollectionView from './CollectionGrid';
import StatsView from './StatsView';

export default function SpinStackDashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('stacks');

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-black text-white text-lg">
      <TopNav user={user} onLogout={onLogout} currentView={currentView} />

      <div>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleViewChange('stacks')}
              className={`px-4 py-2 rounded-full transition ${
                currentView === 'stacks'
                  ? 'bg-white text-black font-bold'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              Stacks
            </button>
            <button
              onClick={() => handleViewChange('collection')}
              className={`px-4 py-2 rounded-full transition ${
                currentView === 'collection'
                  ? 'bg-white text-black font-bold'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              Collection
            </button>
            <button
              onClick={() => handleViewChange('stats')}
              className={`px-4 py-2 rounded-full transition ${
                currentView === 'stats'
                  ? 'bg-white text-black font-bold'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              Stats
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={`transition-opacity duration-300 ${currentView === 'stacks' ? 'opacity-100' : 'opacity-0 hidden'}`}>
          {currentView === 'stacks' && (
            <StacksView />
          )}
        </div>
        <div className={`transition-opacity duration-300 ${currentView === 'collection' ? 'opacity-100' : 'opacity-0 hidden'}`}>
          {currentView === 'collection' && (
            <CollectionView />
          )}
        </div>
        <div className={`transition-opacity duration-300 ${currentView === 'stats' ? 'opacity-100' : 'opacity-0 hidden'}`}>
          {currentView === 'stats' && (
            <StatsView />
          )}
        </div>
      </div>
    </div>
  );
}
