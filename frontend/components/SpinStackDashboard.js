import { useState } from 'react';
import TopNav from './TopNav';
import StacksView from './StacksView';
import CollectionView from './CollectionGrid';
import StatsView from './StatsView';
import StackBuilderView from './StackBuilderView';

export default function SpinStackDashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('stacks');
  const [stacksViewKey, setStacksViewKey] = useState(0);
  const [pendingStackToStart, setPendingStackToStart] = useState(null);

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const handleOpenStackBuilder = () => {
    setCurrentView('builder');
  };

  const handleCancelBuilder = () => {
    setCurrentView('collection');
  };

  const handleStackCreated = (stack) => {
    // Refresh stacks view and switch to it
    setStacksViewKey(prev => prev + 1);
    setCurrentView('stacks');
    // Optionally start spinning the newly created stack
    setPendingStackToStart(stack);
  };

  return (
    <div className="min-h-screen bg-black text-white text-lg">
      <div>
        <TopNav user={user} onLogout={onLogout} currentView={currentView} onNavigate={handleViewChange} />
      </div>

      {currentView !== 'builder' && (
        <div>
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
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
              <button
                onClick={handleOpenStackBuilder}
                className="px-4 py-2 border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white rounded-full transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Stack
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={currentView === 'stacks' ? '' : 'hidden'}>
          <StacksView
            key={stacksViewKey}
            onOpenStackBuilder={handleOpenStackBuilder}
            pendingStackToStart={pendingStackToStart}
            onStackStarted={() => setPendingStackToStart(null)}
          />
        </div>
        <div className={currentView === 'collection' ? '' : 'hidden'}>
          <CollectionView onOpenStackBuilder={handleOpenStackBuilder} />
        </div>
        <div className={currentView === 'stats' ? '' : 'hidden'}>
          <StatsView />
        </div>
        <div className={currentView === 'builder' ? '' : 'hidden'}>
          <StackBuilderView
            onCancel={handleCancelBuilder}
            onStackCreated={handleStackCreated}
          />
        </div>
      </div>
    </div>
  );
}
