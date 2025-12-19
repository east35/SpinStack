import { useState, useEffect } from 'react';
import { stats as statsApi, collection } from '../lib/api';

export default function StatsView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filteredRecords, setFilteredRecords] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [loadingFilter, setLoadingFilter] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await statsApi.get();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterClick = async (filterType, filterValue) => {
    try {
      setLoadingFilter(true);
      setActiveFilter({ type: filterType, value: filterValue });

      const params = { limit: 100 };
      if (filterType === 'genre') {
        params.genre = filterValue;
      }

      const response = await collection.getAll(params);
      setFilteredRecords(response.data.records);
    } catch (error) {
      console.error('Failed to load filtered records:', error);
    } finally {
      setLoadingFilter(false);
    }
  };

  const clearFilter = () => {
    setFilteredRecords(null);
    setActiveFilter(null);
  };

  if (loading) {
    return <div className="text-center py-12">Loading stats...</div>;
  }

  if (!stats) {
    return <div className="text-center py-12">No stats available</div>;
  }

  if (filteredRecords) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {activeFilter.value}: {filteredRecords.length} albums
          </h2>
          <button
            onClick={clearFilter}
            className="btn-secondary px-4 py-2 min-h-[44px]"
          >
            ← Back to Stats
          </button>
        </div>

        {loadingFilter ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredRecords.map((record) => (
              <div key={record.id} className="bg-gray-900 rounded-lg overflow-hidden">
                <img
                  src={record.album_art_url || '/placeholder-album.png'}
                  alt={record.title}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{record.title}</p>
                  <p className="text-xs text-gray-400 truncate">{record.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Collection Stats</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Records"
            value={stats.collection.total_records}
          />
          <StatCard
            label="Listened"
            value={stats.collection.total_listened}
          />
          <StatCard
            label="Unlistened"
            value={stats.collection.total_unlistened}
          />
          <StatCard
            label="Liked"
            value={stats.collection.total_liked}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {stats.favoriteGenre && (
            <button
              onClick={() => handleFilterClick('genre', stats.favoriteGenre)}
              className="bg-gray-900 rounded-lg p-6 text-left hover:bg-gray-800 transition-colors cursor-pointer group"
            >
              <h3 className="text-lg font-semibold mb-2 text-gray-400 group-hover:text-white transition-colors">
                Favorite Genre
              </h3>
              <p className="text-3xl font-bold text-yellow-400">{stats.favoriteGenre}</p>
              <p className="text-xs text-gray-500 mt-2">Click to view albums</p>
            </button>
          )}

          {stats.favoriteArtist && (
            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-400">Favorite Artist</h3>
              <p className="text-3xl font-bold text-yellow-400">{stats.favoriteArtist}</p>
            </div>
          )}
        </div>
      </div>

      {stats.topGenres && stats.topGenres.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">Top Genres</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats.topGenres.map((genre) => (
              <button
                key={genre.genre}
                onClick={() => handleFilterClick('genre', genre.genre)}
                className="bg-gray-900 rounded-lg p-4 text-left hover:bg-gray-800 transition-colors cursor-pointer group"
              >
                <p className="font-semibold group-hover:text-yellow-400 transition-colors">
                  {genre.genre}
                </p>
                <p className="text-2xl font-bold text-yellow-400">{genre.count}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {stats.mostPlayed && stats.mostPlayed.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">Most Played</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats.mostPlayed.map((record) => (
              <div key={record.id} className="bg-gray-900 rounded-lg overflow-hidden">
                <img
                  src={record.album_art_url || '/placeholder-album.png'}
                  alt={record.title}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{record.title}</p>
                  <p className="text-xs text-gray-400 truncate">{record.artist}</p>
                  <p className="text-xs text-yellow-400 mt-1">
                    {record.listened_count} plays
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.dustyGems && stats.dustyGems.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">Dusty Gems</h3>
          <p className="text-gray-400 mb-4">Records you haven't played in a while (or ever)</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats.dustyGems.map((record) => (
              <div key={record.id} className="bg-gray-900 rounded-lg overflow-hidden">
                <img
                  src={record.album_art_url || '/placeholder-album.png'}
                  alt={record.title}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{record.title}</p>
                  <p className="text-xs text-gray-400 truncate">{record.artist}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {record.listened_count === 0 ? 'Never played' : `${record.listened_count} plays`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
