import { useState, useEffect } from 'react';
import { stacks as stacksApi } from '../lib/api';
import StackPlayer from './StackPlayer';
import Icon from './Icon';

export default function StacksView({ onOpenStackBuilder, pendingStackToStart, onStackStarted, onStackPlayerChange }) {
  const [dailyStack, setDailyStack] = useState(null);
  const [curatedStacks, setCuratedStacks] = useState([]);
  const [customStacks, setCustomStacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStack, setActiveStack] = useState(null);
  const [isStackMinimized, setIsStackMinimized] = useState(false);
  const [pendingStack, setPendingStack] = useState(null);
  const [showConflictPrompt, setShowConflictPrompt] = useState(false);
  const [showAllCustomStacks, setShowAllCustomStacks] = useState(false);
  const [deletingStackId, setDeletingStackId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stackToDelete, setStackToDelete] = useState(null);

  // Notify parent when stack player state changes
  useEffect(() => {
    if (onStackPlayerChange) {
      onStackPlayerChange(!!activeStack && !isStackMinimized);
    }
  }, [activeStack, isStackMinimized, onStackPlayerChange]);

  // Helper function to get unique artists from a stack
  const getArtistSubtitle = (albums) => {
    if (!albums || albums.length === 0) return '';
    const uniqueArtists = [...new Set(albums.map(a => a.artist).filter(Boolean))];
    const firstTwo = uniqueArtists.slice(0, 2);
    if (firstTwo.length === 0) return '';
    if (firstTwo.length === 1) return `Featuring ${firstTwo[0]}`;
    return `Featuring ${firstTwo[0]} & ${firstTwo[1]}`;
  };

  useEffect(() => {
    loadDailyStack();
    loadCuratedStacks();
    loadCustomStacks();
  }, []);

  // Handle pending stack to start
  useEffect(() => {
    if (pendingStackToStart) {
      if (activeStack) {
        // If a stack is already active, show conflict prompt
        setPendingStack(pendingStackToStart);
        setShowConflictPrompt(true);
      } else {
        // No active stack, start immediately
        setActiveStack(pendingStackToStart);
      }
      if (onStackStarted) {
        onStackStarted();
      }
    }
  }, [pendingStackToStart]);

  const loadDailyStack = async () => {
    try {
      setLoading(true);
      console.log('Loading daily stack...');
      const response = await stacksApi.getDaily();
      console.log('Daily stack response:', response.data);
      console.log('Stack albums:', response.data.stack?.albums);
      setDailyStack(response.data.stack);
    } catch (error) {
      console.error('Failed to load daily stack:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const loadCuratedStacks = async () => {
    try {
      const response = await stacksApi.getWeekly();
      setCuratedStacks(response.data.stacks || []);
    } catch (error) {
      console.error('Failed to load curated stacks:', error);
    }
  };

  const loadCustomStacks = async () => {
    try {
      const response = await stacksApi.getCustom();
      setCustomStacks(response.data.stacks || []);
    } catch (error) {
      console.error('Failed to load custom stacks:', error);
    }
  };

  const handleRefreshDaily = async () => {
    try {
      setLoading(true);
      const response = await stacksApi.refreshDaily();
      setDailyStack(response.data.stack);
    } catch (error) {
      console.error('Failed to refresh daily stack:', error);
      alert('Failed to refresh stack. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshWeekly = async () => {
    try {
      const response = await stacksApi.refreshWeekly();
      setCuratedStacks(response.data.stacks || []);
    } catch (error) {
      console.error('Failed to refresh weekly stacks:', error);
      alert('Failed to refresh stacks. Please try again.');
    }
  };

  const handleStartSpinning = () => {
    if (!dailyStack) return;

    // Check if there's a minimized stack
    if (isStackMinimized && activeStack) {
      setPendingStack(dailyStack);
      setShowConflictPrompt(true);
    } else {
      setActiveStack(dailyStack);
      setIsStackMinimized(false);
    }
  };

  const handleStartCurated = (stack) => {
    if (!stack) return;

    // Check if there's a minimized stack
    if (isStackMinimized && activeStack) {
      setPendingStack(stack);
      setShowConflictPrompt(true);
    } else {
      setActiveStack(stack);
      setIsStackMinimized(false);
    }
  };

  const handleStopCurrentSession = () => {
    setActiveStack(pendingStack);
    setPendingStack(null);
    setShowConflictPrompt(false);
    setIsStackMinimized(false);
  };

  const handleKeepSpinning = () => {
    setPendingStack(null);
    setShowConflictPrompt(false);
  };

  const handleDeleteStack = async () => {
    if (!stackToDelete) return;

    try {
      setDeletingStackId(stackToDelete.stackId);
      await stacksApi.deleteCustomStack(stackToDelete.stackId);

      // Refresh custom stacks
      await loadCustomStacks();

      setShowDeleteConfirm(false);
      setStackToDelete(null);
    } catch (error) {
      console.error('Failed to delete stack:', error);
      alert('Failed to delete stack. Please try again.');
    } finally {
      setDeletingStackId(null);
    }
  };

  const handleDeleteClick = (stack, e) => {
    e.stopPropagation();
    setStackToDelete(stack);
    setShowDeleteConfirm(true);
  };

  if (loading) {
    return <div className="text-center py-12">Cueing...</div>;
  }

  if (!dailyStack || !dailyStack.albums || dailyStack.albums.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <h2 className="text-xl font-bold mb-4">No Stacks Available</h2>
        <p className="text-gray-400 mb-6">
          We couldn't generate a stack for you. This usually means your collection needs to be synced.
        </p>
        <div className="space-y-3 max-w-md mx-auto text-left">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Troubleshooting:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
              <li>Go to the Collection tab to verify your records are showing</li>
              <li>Click the "Sync" button to sync from Discogs</li>
              <li>Wait for the sync confirmation message</li>
              <li>Return here and refresh to see your stacks</li>
            </ol>
            <p className="text-xs text-gray-500 mt-3">
              Tip: Check the browser console (F12) for error messages
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div className="bg-gray-900 rounded-lg p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            {/* Album grid - shown first on mobile, second on desktop */}
            <div className="order-2">
              <div className="grid grid-cols-4 gap-2 md:gap-1 max-w-full md:w-[420px] mx-auto md:mx-0">
                {dailyStack.albums.map((album, idx) => (
                  <img
                    key={idx}
                    src={album.album_art_url || '/placeholder-album.png'}
                    alt={album.title}
                    className="w-full aspect-square rounded-md md:rounded-sm object-cover"
                  />
                ))}
              </div>
            </div>

            {/* Text and button - shown second on mobile, first on desktop */}
            <div className="order-1 flex-1">
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-2xl md:text-3xl font-bold">Today's Stack</h2>
              </div>
              <p className="text-gray-400 mb-4 md:mb-6 text-sm md:text-base">
                {getArtistSubtitle(dailyStack.albums)}
              </p>
              <button
                onClick={handleStartSpinning}
                className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-yellow-400 transition inline-flex mr-4 items-center gap-2 w-full md:w-auto justify-center min-h-[44px] mb-4"
              >
                Start Spinning
                <Icon name="play-circle" size={20} />
              </button>
              <button
                onClick={handleRefreshDaily}
                className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-yellow-400 transition inline-flex items-center gap-2 w-full md:w-auto justify-center min-h-[44px]"
              >
                Shuffle
                <Icon name="shuffle" size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Stacks */}
      <div className="space-y-4 mt-10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg md:text-xl font-bold">Your Custom Stacks</h3>
          <button
            onClick={() => setShowAllCustomStacks(true)}
            disabled={customStacks.length === 0}
            className="text-sm px-3 py-1.5 border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white rounded-full transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-600 disabled:hover:text-gray-400"
            title={customStacks.length === 0 ? "No stacks to manage" : "Manage your custom stacks"}
          >
            Manage Stacks
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {customStacks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {customStacks.slice(0, 4).map((stack) => (
              <div
                key={stack.id}
                className="rounded-lg p-2 space-y-2 group transition-all duration-200"
              >
                <div
                  className="relative overflow-hidden rounded-md cursor-pointer active:scale-95 md:hover:scale-105 transition-transform"
                  onClick={() => handleStartCurated(stack)}
                >
                  <div className="grid grid-cols-2 gap-1 transition-opacity duration-200 md:group-hover:opacity-70">
                    {stack.albums.slice(0, 4).map((album, idx) => (
                      <img
                        key={`${stack.id}-${idx}`}
                        src={album.album_art_url || '/placeholder-album.png'}
                        alt={album.title}
                        className="w-full aspect-square rounded-sm object-cover"
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs md:text-sm font-semibold rounded-full shadow-lg">
                      <span>Start Spinning</span>
                      <Icon name="play-circle" size={18} />
                    </div>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs md:text-sm truncate">{stack.name}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {getArtistSubtitle(stack.albums)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(stack, e)}
                    className="p-1.5 text-gray-500 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Delete stack"
                  >
                    <Icon name="trash-2" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-900 rounded-lg border-2 border-dashed border-gray-800">
            <p className="text-gray-400 mb-4">You haven't created any custom stacks yet</p>
            <button
              onClick={onOpenStackBuilder}
              className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-yellow-400 transition inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Stack
            </button>
          </div>
        )}
      </div>

      {/* Curated Stacks */}
          {curatedStacks.length > 0 && (
            <div className="space-y-4 mt-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg md:text-xl font-bold">This Week's Stacks</h3>
                {/* <button
                  onClick={handleRefreshWeekly}
                  className="text-gray-400 hover:text-white transition p-2"
                  title="Refresh weekly stacks"
                >
                  <Icon name="refresh" size={20} />
                </button> */}
              </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {curatedStacks.map((stack) => (
              <div
                key={stack.id}
                className="rounded-lg p-2 space-y-2 group transition-all duration-200 active:scale-95 md:hover:scale-105 cursor-pointer"
                onClick={() => handleStartCurated(stack)}
              >
                <div className="relative overflow-hidden rounded-md">
                  <div className="grid grid-cols-2 gap-1 transition-opacity duration-200 md:group-hover:opacity-70">
                    {stack.albums.slice(0, 4).map((album, idx) => (
                      <img
                            key={`${stack.id}-${idx}`}
                            src={album.album_art_url || '/placeholder-album.png'}
                            alt={album.title}
                            className="w-full aspect-square rounded-sm object-cover"
                          />
                        ))}
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs md:text-sm font-semibold rounded-full shadow-lg">
                      <span>Start Spinning</span>
                      <Icon name="play-circle" size={18} />
                    </div>
                  </div>
                </div>
                <div>
                      <div className="font-semibold text-xs md:text-sm truncate">{stack.name}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {getArtistSubtitle(stack.albums)}
                      </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeStack && (
        <StackPlayer
          stack={activeStack}
          onClose={() => {
            setActiveStack(null);
            setIsStackMinimized(false);
          }}
          onMinimize={() => setIsStackMinimized(true)}
          onMaximize={() => setIsStackMinimized(false)}
        />
      )}

      {/* Session Conflict Prompt */}
      {showConflictPrompt && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-800">
            <h3 className="text-lg font-semibold">Stop current session?</h3>
            <p className="text-gray-300">
              You have a stack session in progress. Would you like to stop it and start a new one?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleStopCurrentSession}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
              >
                Stop Session
              </button>
              <button
                onClick={handleKeepSpinning}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                Keep Spinning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View All Custom Stacks Modal */}
      {showAllCustomStacks && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowAllCustomStacks(false)}
        >
          <div
            className="bg-gray-900 rounded-xl w-full max-w-5xl max-h-[85vh] overflow-hidden border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h3 className="text-xl font-bold">Manage Your Stacks</h3>
                <p className="text-sm text-gray-400 mt-1">{customStacks.length} stack{customStacks.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenStackBuilder}
                  className="text-sm px-4 py-2 border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white rounded-full transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Stack
                </button>
                <button
                  onClick={() => setShowAllCustomStacks(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stacks Grid */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {customStacks.map((stack) => (
                  <div
                    key={stack.id}
                    className="rounded-lg p-2 space-y-2 group transition-all duration-200"
                  >
                    <div
                      className="relative overflow-hidden rounded-md cursor-pointer active:scale-95 md:hover:scale-105 transition-transform"
                      onClick={() => {
                        setShowAllCustomStacks(false);
                        handleStartCurated(stack);
                      }}
                    >
                      <div className="grid grid-cols-2 gap-1 transition-opacity duration-200 md:group-hover:opacity-70">
                        {stack.albums.slice(0, 4).map((album, idx) => (
                          <img
                            key={`${stack.id}-${idx}`}
                            src={album.album_art_url || '/placeholder-album.png'}
                            alt={album.title}
                            className="w-full aspect-square rounded-sm object-cover"
                          />
                        ))}
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs md:text-sm font-semibold rounded-full shadow-lg">
                          <span>Start Spinning</span>
                          <Icon name="play-circle" size={18} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm truncate">{stack.name}</div>
                      <div className="text-xs text-gray-400 truncate mb-2">
                        {getArtistSubtitle(stack.albums)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteClick(stack, e)}
                      className="w-full text-xs px-3 py-2 border border-gray-600 hover:border-red-500 text-gray-400 hover:text-red-500 rounded-full transition min-h-[36px]"
                    >
                      Delete Stack
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Stack Confirmation Modal */}
      {showDeleteConfirm && stackToDelete && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-800">
            <h3 className="text-lg font-semibold">Delete "{stackToDelete.name}"?</h3>
            <p className="text-gray-300">
              This will permanently delete this stack. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteStack}
                disabled={deletingStackId !== null}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 rounded-lg font-semibold transition-colors"
              >
                {deletingStackId ? 'Deleting...' : 'Delete Stack'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setStackToDelete(null);
                }}
                disabled={deletingStackId !== null}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
