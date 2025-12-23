import { useState } from 'react';
import { isDemoMode } from '../lib/demoApi';
import TopNav from './TopNav';
import StacksView from './StacksView';
import CollectionView from './CollectionGrid';
import StatsView from './StatsView';
import StackBuilderView from './StackBuilderView';

export default function SpinStackDashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('stacks');
  const [stacksViewKey, setStacksViewKey] = useState(0);
  const [pendingStackToStart, setPendingStackToStart] = useState(null);
  const [showDemoMessage, setShowDemoMessage] = useState(false);

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const handleOpenStackBuilder = () => {
    if (isDemoMode()) {
      setShowDemoMessage(true);
    } else {
      setCurrentView('builder');
    }
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

      {/* Demo Mode Message Modal */}
      {showDemoMessage && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-800">
            <div className="flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-full mx-auto">
              <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-center">Stack Builder Not Available</h3>
            <p className="text-gray-400 text-center">
              The custom stack builder isn't available in demo mode. Mock data doesn't play nice with the variables we can't predict!
            </p>
            <p className="text-gray-300 text-center text-sm">
              But don't worry — you can check out the pre-made custom stacks we've created for you on the Stacks page.
            </p>

            <button
              onClick={() => setShowDemoMessage(false)}
              className="w-full px-4 py-3 bg-white hover:bg-yellow-400 text-black rounded-lg font-semibold transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
