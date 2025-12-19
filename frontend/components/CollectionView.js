import { useState, useEffect } from 'react';
import { collection as collectionApi } from '../lib/api';

export default function CollectionView() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('date_added_desc');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    liked: false,
    unlistened: false,
  });

  useEffect(() => {
    loadCollection();
  }, [sort, filters]);

  const loadCollection = async () => {
    try {
      setLoading(true);
      const response = await collectionApi.getAll({
        sort,
        search,
        liked: filters.liked || undefined,
        unlistened: filters.unlistened || undefined,
      });
      setRecords(response.data.records);
    } catch (error) {
      console.error('Failed to load collection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadCollection();
  };

  const handleToggleLike = async (id) => {
    try {
      await collectionApi.toggleLike(id);
      loadCollection();
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleMarkPlayed = async (id) => {
    try {
      await collectionApi.markPlayed(id);
      loadCollection();
    } catch (error) {
      console.error('Failed to mark played:', error);
    }
  };

  if (loading && records.length === 0) {
    return <div className="text-center py-12">Loading collection...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Search bar - full width on mobile */}
        <form onSubmit={handleSearch} className="w-full">
          <input
            type="text"
            placeholder="Search albums, artists, labels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 md:py-2 focus:outline-none focus:border-gray-700 text-base"
          />
        </form>

        {/* Filters and sort - wrapped on mobile */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilters(f => ({ ...f, liked: !f.liked }))}
              className={`px-4 py-3 md:py-2 rounded-lg min-h-[44px] flex-1 sm:flex-none ${
                filters.liked ? 'bg-red-600' : 'bg-gray-900'
              }`}
            >
              Liked
            </button>
            <button
              onClick={() => setFilters(f => ({ ...f, unlistened: !f.unlistened }))}
              className={`px-4 py-3 md:py-2 rounded-lg min-h-[44px] flex-1 sm:flex-none ${
                filters.unlistened ? 'bg-blue-600' : 'bg-gray-900'
              }`}
            >
              Unlistened
            </button>
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full sm:w-auto bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 md:py-2 min-h-[44px]"
          >
            <option value="date_added_desc">Date Added (Newest)</option>
            <option value="date_added_asc">Date Added (Oldest)</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="title_desc">Title (Z-A)</option>
            <option value="artist_asc">Artist (A-Z)</option>
            <option value="artist_desc">Artist (Z-A)</option>
            <option value="year_desc">Year (Newest)</option>
            <option value="year_asc">Year (Oldest)</option>
            <option value="listened_count_desc">Most Played</option>
            <option value="listened_count_asc">Least Played</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {records.map((record) => (
          <AlbumCard
            key={record.id}
            record={record}
            onToggleLike={handleToggleLike}
            onMarkPlayed={handleMarkPlayed}
          />
        ))}
      </div>

      {records.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No records found. Try syncing your collection.
        </div>
      )}
    </div>
  );
}

function AlbumCard({ record, onToggleLike, onMarkPlayed }) {
  const [showControls, setShowControls] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <img
        src={record.album_art_url || '/placeholder-album.png'}
        alt={record.title}
        className="w-full aspect-square rounded-lg object-cover"
      />

      {showControls && (
        <div className="absolute inset-0 bg-black bg-opacity-75 rounded-lg flex flex-col items-center justify-center gap-2 p-4">
          <button
            onClick={() => onToggleLike(record.id)}
            className={`w-full py-2 px-4 rounded ${
              record.is_liked ? 'bg-red-600' : 'bg-gray-700'
            }`}
          >
            {record.is_liked ? '♥' : '♡'}
          </button>
          <button
            onClick={() => onMarkPlayed(record.id)}
            className="w-full py-2 px-4 rounded bg-gray-700 hover:bg-gray-600"
          >
            Mark Played
          </button>
        </div>
      )}

      <div className="mt-2">
        <h4 className="font-semibold text-sm truncate">{record.title}</h4>
        <p className="text-xs text-gray-400 truncate">{record.artist}</p>
        {record.listened_count > 0 && (
          <p className="text-xs text-gray-500">Played {record.listened_count}x</p>
        )}
      </div>
    </div>
  );
}
