import { useState, useEffect } from 'react';
import { stacks as stacksApi } from '../lib/api';

export default function SetlistView({ onStartStack }) {
  const [dailyStack, setDailyStack] = useState(null);
  const [randomStacks, setRandomStacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStacks();
  }, []);

  const loadStacks = async () => {
    try {
      setLoading(true);
      const [daily, random] = await Promise.all([
        stacksApi.getDaily(),
        stacksApi.getRandom(),
      ]);

      setDailyStack(daily.data.stack);
      setRandomStacks(random.data.stacks || []);
    } catch (error) {
      console.error('Failed to load stacks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Cueing...</div>;
  }

  return (
    <div className="space-y-8">
      {dailyStack && dailyStack.albums && dailyStack.albums.length > 0 && (
        <div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">Today's Stack</h2>
                <p className="text-gray-400 mb-6">
                  Creating playlists that always feel right
                </p>
                <button
                  onClick={() => onStartStack(dailyStack)}
                  className="bg-white text-black px-6 py-2 rounded-full font-semibold hover:bg-yellow-400 transition"
                >
                  Start Spinning →
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2" style={{ width: '400px' }}>
                {dailyStack.albums.map((album, idx) => (
                  <img
                    key={idx}
                    src={album.album_art_url || '/placeholder-album.png'}
                    alt={album.title || 'Album'}
                    className="w-full aspect-square rounded object-cover"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {randomStacks.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">Curated Stacks</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {randomStacks.map((stack) => (
              <StackCard
                key={stack.id}
                stack={stack}
                onStart={onStartStack}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StackCard({ stack, onStart }) {
  const [isHovered, setIsHovered] = useState(false);
  const albumCovers = stack.albums?.slice(0, 4) || [];

  return (
    <div
      className="rounded-lg p-2 cursor-pointer transition-transform duration-200 hover:scale-105 relative"
      onClick={() => onStart(stack)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="grid grid-cols-2 gap-1 mb-3 relative">
        {albumCovers.map((album, idx) => (
          <img
            key={idx}
            src={album?.album_art_url || '/placeholder-album.png'}
            alt=""
            className="w-full aspect-square object-cover rounded-sm"
          />
        ))}
        {[...Array(Math.max(0, 4 - albumCovers.length))].map((_, idx) => (
          <div key={`empty-${idx}`} className="w-full aspect-square" />
        ))}
        {isHovered && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded-sm transition-opacity duration-200">
            <span className="text-white font-semibold text-sm">Start Spinning →</span>
          </div>
        )}
      </div>
      <h4 className="font-semibold text-sm truncate">{stack.name}</h4>
      <p className="text-xs text-gray-400">
        {albumCovers.length} albums
      </p>
    </div>
  );
}
