import { useEffect, useState, useRef, useCallback } from 'react';
import { collection } from '../lib/api';
import Icon from './Icon';
import AlbumDetailModal from './AlbumDetailModal';

const SORT_OPTIONS = [
  { value: 'added_desc', label: 'Recently Added' },
  { value: 'title_asc', label: 'Title A → Z' },
  { value: 'title_desc', label: 'Title Z → A' },
  { value: 'year_desc', label: 'Year (newest)' },
  { value: 'year_asc', label: 'Year (oldest)' },
];

// Genre color mapping - consistent colors for each genre
const GENRE_COLORS = {
  'Rock': 'bg-red-500/20 text-red-400',
  'Electronic': 'bg-purple-500/20 text-purple-400',
  'Pop': 'bg-pink-500/20 text-pink-400',
  'Jazz': 'bg-blue-500/20 text-blue-400',
  'Classical': 'bg-indigo-500/20 text-indigo-400',
  'Hip Hop': 'bg-orange-500/20 text-orange-400',
  'Folk': 'bg-green-500/20 text-green-400',
  'Funk / Soul': 'bg-yellow-500/20 text-yellow-400',
  'Reggae': 'bg-lime-500/20 text-lime-400',
  'Latin': 'bg-red-400/20 text-red-300',
  'Blues': 'bg-cyan-500/20 text-cyan-400',
  'Metal': 'bg-gray-500/20 text-gray-300',
  'Punk': 'bg-rose-500/20 text-rose-400',
  'Country': 'bg-amber-500/20 text-amber-400',
  'Stage & Screen': 'bg-violet-500/20 text-violet-400',
};

const getGenreColor = (genre) => {
  return GENRE_COLORS[genre] || 'bg-gray-500/20 text-gray-400';
};

export default function CollectionGrid({ onOpenStackBuilder }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Separate state for input value
  const [selectedGenre, setSelectedGenre] = useState('');
  const [availableGenres, setAvailableGenres] = useState([]);
  const [sort, setSort] = useState('added_desc');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [autoSyncAttempted, setAutoSyncAttempted] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const observerTarget = useRef(null);
  const searchInputRef = useRef(null);
  const perPage = 50;


  const autoSyncCollection = async () => {
    try {
      setAutoSyncAttempted(true);
      setAutoSyncing(true);
      await collection.sync();
      setPage(0);
    } catch (error) {
      console.error('Auto sync failed:', error);
    } finally {
      setAutoSyncing(false);
    }
  };

  const loadCollection = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = {
        limit: perPage,
        offset: reset ? 0 : page * perPage,
        sort,
      };
      if (searchQuery) {
        params.search = searchQuery;
      }
      if (selectedGenre) {
        params.genre = selectedGenre;
      }

      const response = await collection.getAll(params);
      const newRecords = response.data.records;
      const total = response.data.totalCount ?? newRecords.length;

      if (reset) {
        setRecords(newRecords);
      } else {
        setRecords((prev) => [...prev, ...newRecords]);
      }

      setTotalCount(total);
      setHasMore(newRecords.length === perPage && (reset ? perPage : (page + 1) * perPage) < total);

      if (
        total === 0 &&
        !autoSyncAttempted &&
        !autoSyncing
      ) {
        autoSyncCollection();
      }
    } catch (error) {
      console.error('Failed to load collection:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, sort, searchQuery, selectedGenre, autoSyncAttempted, autoSyncing, perPage]);

  // Load available genres
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const response = await collection.getGenres();
        setAvailableGenres(response.data.genres);
      } catch (error) {
        console.error('Failed to load genres:', error);
      }
    };
    loadGenres();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset when filters change
  useEffect(() => {
    setRecords([]);
    setPage(0);
    setHasMore(true);
    loadCollection(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedGenre, sort]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  // Load more when page changes
  useEffect(() => {
    if (page > 0) {
      loadCollection(false);
    }
  }, [page, loadCollection]);

  // Restore focus to search input after re-renders if it was focused
  useEffect(() => {
    if (searchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [records, loading, loadingMore]);

  const handleToggleLike = async (recordId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await collection.toggleLike(recordId);
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId ? { ...r, is_liked: !r.is_liked } : r
        )
      );
      // Update selected album if it's the one being liked
      if (selectedAlbum && selectedAlbum.id === recordId) {
        setSelectedAlbum((prev) => ({ ...prev, is_liked: !prev.is_liked }));
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleMarkPlayed = async (recordId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await collection.markPlayed(recordId);
      const newCount = (selectedAlbum?.id === recordId ? selectedAlbum.listened_count : 0) + 1;
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId ? { ...r, listened_count: (r.listened_count || 0) + 1 } : r
        )
      );
      // Update selected album if it's the one being played
      if (selectedAlbum && selectedAlbum.id === recordId) {
        setSelectedAlbum((prev) => ({ ...prev, listened_count: newCount }));
      }
    } catch (error) {
      console.error('Failed to mark played:', error);
    }
  };

  const handleShowDetails = (record, e) => {
    e.stopPropagation();
    setSelectedAlbum(record);
  };

  const handleAddToStack = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    // Just open the builder - user can add albums there
    if (onOpenStackBuilder) {
      onOpenStackBuilder();
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading collection...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search your collection..."
            className="bg-secondary rounded px-4 py-3 md:py-2 text-sm w-full min-h-[44px] pr-10"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
              title="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="bg-secondary rounded px-3 py-3 md:py-2 text-sm md:w-48 min-h-[44px]"
        >
          <option value="">All Genres</option>
          {availableGenres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => {
            setPage(0);
            setSort(e.target.value);
          }}
          className="bg-secondary rounded px-3 py-3 md:py-2 text-sm md:w-48 min-h-[44px]"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {autoSyncing && (
        <div className="text-sm text-gray-400">Syncing your collection...</div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No records found in your collection.</p>
          <p className="text-sm text-gray-500">We’re syncing your Discogs library now.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {records.map((record) => {
              return (
              <div key={record.id} className="album-card group">
                <div
                  className="aspect-square bg-secondary mb-3 rounded overflow-hidden relative cursor-pointer"
                  onClick={() => setSelectedAlbum(record)}
                >
                  {record.album_art_url ? (
                    <>
                      {imageLoadingStates[record.id] !== 'loaded' && imageLoadingStates[record.id] !== 'error' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full border-2 border-gray-600 border-t-gray-400 animate-spin"></div>
                        </div>
                      )}
                      <img
                        src={record.album_art_url}
                        alt={record.title}
                        className={`w-full h-full object-cover transition-opacity duration-200 md:group-hover:opacity-70 ${
                          imageLoadingStates[record.id] === 'loaded' ? 'opacity-100' : 'opacity-0'
                        }`}
                        loading="lazy"
                        onLoad={() => setImageLoadingStates(prev => ({ ...prev, [record.id]: 'loaded' }))}
                        onError={() => setImageLoadingStates(prev => ({ ...prev, [record.id]: 'error' }))}
                      />
                      {imageLoadingStates[record.id] === 'error' && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                          No Image
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      No Image
                    </div>
                  )}

                  {/* Hover overlay with action buttons */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => handleToggleLike(record.id, e)}
                      className="w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      title={record.is_liked ? "Unlike" : "Like"}
                    >
                      <Icon
                        name="heart"
                        size={18}
                        className={record.is_liked ? "text-red-500" : "text-gray-700"}
                      />
                    </button>
                    <button
                      onClick={(e) => handleMarkPlayed(record.id, e)}
                      className="w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      title="Mark as played"
                    >
                      <Icon name="check-circle" size={18} className="text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => handleShowDetails(record, e)}
                      className="w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      title="View details"
                    >
                      <Icon name="info" size={18} className="text-gray-700" />
                    </button>
                  </div>
                </div>

                <h3 className="font-medium text-sm mb-1 truncate">{record.title}</h3>
                <p className="text-gray-400 text-xs mb-1 truncate">{record.artist}</p>
                <div className="text-xs flex items-center gap-2 flex-wrap">
                  {record.year && <span className="text-gray-500">{record.year}</span>}
                  {typeof record.listened_count === 'number' && (
                    <span className="text-gray-500">
                      {record.listened_count === 0 ? '0 plays' : `${record.listened_count} ${record.listened_count === 1 ? 'play' : 'plays'}`}
                    </span>
                  )}
                  {record.genres?.[0] && (
                    <span className={`px-2 py-0.5 rounded-full ${getGenreColor(record.genres[0])}`}>
                      {record.genres[0]}
                    </span>
                  )}
                </div>
              </div>
              );
            })}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={observerTarget} className="h-10 flex items-center justify-center">
            {loadingMore && (
              <div className="text-sm text-gray-400">Loading more...</div>
            )}
          </div>

          {/* Total count display */}
          <div className="text-center text-sm text-gray-400 pt-2">
            Showing {records.length} of {totalCount} albums
          </div>
        </>
      )}

      {/* Album Detail Modal */}
      {selectedAlbum && (
        <AlbumDetailModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          onToggleLike={(id) => handleToggleLike(id)}
          onMarkPlayed={(id) => handleMarkPlayed(id)}
          onAddToStack={handleAddToStack}
        />
      )}
    </div>
  );
}
