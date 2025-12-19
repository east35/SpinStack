import { useState, useEffect } from 'react';
import { stacks as stacksApi } from '../lib/api';
import StackPlayer from './StackPlayer';
import Icon from './Icon';

export default function StacksView() {
  const [dailyStack, setDailyStack] = useState(null);
  const [curatedStacks, setCuratedStacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStack, setActiveStack] = useState(null);

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
  }, []);

  const loadDailyStack = async () => {
    try {
      setLoading(true);
      const response = await stacksApi.getDaily();
      setDailyStack(response.data.stack);
    } catch (error) {
      console.error('Failed to load daily stack:', error);
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
    if (dailyStack) {
      setActiveStack(dailyStack);
    }
  };

  const handleStartCurated = (stack) => {
    if (stack) {
      setActiveStack(stack);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Cueing...</div>;
  }

  if (!dailyStack || dailyStack.albums.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No albums available for today's stack.</p>
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

      {/* Curated Stacks */}
          {curatedStacks.length > 0 && (
            <div className="space-y-4 mt-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg md:text-xl font-bold">This Week's Stacks</h3>
                <button
                  onClick={handleRefreshWeekly}
                  className="text-gray-400 hover:text-white transition p-2"
                  title="Refresh weekly stacks"
                >
                  <Icon name="refresh" size={20} />
                </button>
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
          onClose={() => setActiveStack(null)}
        />
      )}
    </>
  );
}
