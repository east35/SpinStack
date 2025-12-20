import { useState, useEffect, useRef, useCallback } from 'react';
import { stats as statsApi, collection } from '../lib/api';
import Icon from './Icon';
import AlbumDetailModal from './AlbumDetailModal';

export default function StatsView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filteredRecords, setFilteredRecords] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const observerTarget = useRef(null);
  const perPage = 50;

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

  const loadFilteredRecords = useCallback(async (reset = false) => {
    if (!activeFilter) return;

    try {
      if (reset) {
        setLoadingFilter(true);
      } else {
        setLoadingMore(true);
      }

      const params = {
        limit: perPage,
        offset: reset ? 0 : page * perPage,
      };

      if (activeFilter.type === 'genre') {
        params.genre = activeFilter.value;
      }

      const response = await collection.getAll(params);
      const newRecords = response.data.records;
      const total = response.data.totalCount ?? newRecords.length;

      if (reset) {
        setFilteredRecords(newRecords);
      } else {
        setFilteredRecords((prev) => [...prev, ...newRecords]);
      }

      setTotalCount(total);
      setHasMore(newRecords.length === perPage && (reset ? perPage : (page + 1) * perPage) < total);
    } catch (error) {
      console.error('Failed to load filtered records:', error);
    } finally {
      setLoadingFilter(false);
      setLoadingMore(false);
    }
  }, [activeFilter, page, perPage]);

  const handleFilterClick = async (filterType, filterValue) => {
    setActiveFilter({ type: filterType, value: filterValue });
    setPage(0);
    setHasMore(true);
    setFilteredRecords(null);
  };

  const clearFilter = () => {
    setFilteredRecords(null);
    setActiveFilter(null);
    setPage(0);
    setHasMore(true);
  };

  // Load filtered records when filter or page changes
  useEffect(() => {
    if (activeFilter) {
      loadFilteredRecords(page === 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, page]);

  // Infinite scroll observer
  useEffect(() => {
    if (!filteredRecords) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingFilter && !loadingMore) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [filteredRecords, hasMore, loadingFilter, loadingMore]);

  const handleToggleLike = async (recordId) => {
    try {
      await collection.toggleLike(recordId);
      // Update the record in filtered records
      setFilteredRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, is_liked: !r.is_liked } : r))
      );
      // Update selected album if open
      if (selectedAlbum && selectedAlbum.id === recordId) {
        setSelectedAlbum((prev) => ({ ...prev, is_liked: !prev.is_liked }));
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleMarkPlayed = async (recordId) => {
    try {
      await collection.markPlayed(recordId);
      const newCount = (selectedAlbum?.id === recordId ? selectedAlbum.listened_count : 0) + 1;
      // Update the record in filtered records
      setFilteredRecords((prev) =>
        prev.map((r) =>
          r.id === recordId ? { ...r, listened_count: (r.listened_count || 0) + 1 } : r
        )
      );
      // Update selected album if open
      if (selectedAlbum && selectedAlbum.id === recordId) {
        setSelectedAlbum((prev) => ({ ...prev, listened_count: newCount }));
      }
    } catch (error) {
      console.error('Failed to mark played:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading stats...</div>;
  }

  if (!stats) {
    return <div className="text-center py-12">No stats available</div>;
  }

  if (filteredRecords !== null || loadingFilter) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {activeFilter?.value}
            {totalCount > 0 && `: ${totalCount} albums`}
          </h2>
          <button
            onClick={clearFilter}
            className="btn-secondary px-4 py-2 min-h-[44px]"
          >
            ← Back to Stats
          </button>
        </div>

        {loadingFilter && !filteredRecords ? (
          <div className="text-center py-12">Cueing...</div>
        ) : filteredRecords && filteredRecords.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredRecords.map((record) => (
                <div key={record.id} className="album-card group">
                  <div
                    className="aspect-square bg-secondary mb-3 rounded overflow-hidden relative cursor-pointer"
                    onClick={() => setSelectedAlbum(record)}
                  >
                    {record.album_art_url ? (
                      <>
                        {imageLoadingStates[record.id] !== 'loaded' && imageLoadingStates[record.id] !== 'error' && (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800 animate-pulse">
                            <div className="w-12 h-12 rounded-full border-2 border-gray-600 border-t-gray-400 animate-spin"></div>
                          </div>
                        )}
                        <img
                          src={record.album_art_url}
                          alt={record.title}
                          loading="lazy"
                          onLoad={() => setImageLoadingStates(prev => ({ ...prev, [record.id]: 'loaded' }))}
                          onError={() => setImageLoadingStates(prev => ({ ...prev, [record.id]: 'error' }))}
                          className={`w-full h-full object-cover transition-opacity duration-200 md:group-hover:opacity-70 ${
                            imageLoadingStates[record.id] === 'loaded' ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{ display: imageLoadingStates[record.id] === 'error' ? 'none' : 'block' }}
                        />
                        {imageLoadingStates[record.id] === 'error' && (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 bg-gray-800">
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
                    <div className="absolute inset-0 bg-black/60 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLike(record.id);
                        }}
                        className="w-12 h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                        title={record.is_liked ? "Unlike" : "Like"}
                      >
                        <Icon
                          name="heart"
                          size={20}
                          className={record.is_liked ? "text-red-500" : "text-gray-700"}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkPlayed(record.id);
                        }}
                        className="w-12 h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                        title="Mark as played"
                      >
                        <Icon name="check-circle" size={20} className="text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlbum(record);
                        }}
                        className="w-12 h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                        title="View details"
                      >
                        <Icon name="info" size={20} className="text-gray-700" />
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
                  </div>
                </div>
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="h-10 flex items-center justify-center">
              {loadingMore && (
                <div className="text-sm text-gray-400">Loading more...</div>
              )}
            </div>

            {/* Total count display */}
            <div className="text-center text-sm text-gray-400 pt-2">
              Showing {filteredRecords.length} of {totalCount} albums
            </div>

            {/* Album Detail Modal */}
            {selectedAlbum && (
              <AlbumDetailModal
                album={selectedAlbum}
                onClose={() => setSelectedAlbum(null)}
                onToggleLike={(id) => handleToggleLike(id)}
                onMarkPlayed={(id) => handleMarkPlayed(id)}
              />
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">No albums found</div>
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
              <div key={record.id} className="bg-gray-900 rounded-lg overflow-hidden group">
                <div className="relative aspect-square cursor-pointer" onClick={() => setSelectedAlbum(record)}>
                  {imageLoadingStates[record.id] !== 'loaded' && imageLoadingStates[record.id] !== 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800 animate-pulse">
                      <div className="w-12 h-12 rounded-full border-2 border-gray-600 border-t-gray-400 animate-spin"></div>
                    </div>
                  )}
                  <img
                    src={record.album_art_url || '/placeholder-album.png'}
                    alt={record.title}
                    loading="lazy"
                    onLoad={() => setImageLoadingStates(prev => ({ ...prev, [record.id]: 'loaded' }))}
                    onError={() => setImageLoadingStates(prev => ({ ...prev, [record.id]: 'error' }))}
                    className={`w-full h-full object-cover transition-opacity duration-200 md:group-hover:opacity-70 ${
                      imageLoadingStates[record.id] === 'loaded' ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  {/* Hover overlay with action buttons */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLike(record.id);
                      }}
                      className="w-12 h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      title={record.is_liked ? "Unlike" : "Like"}
                    >
                      <Icon
                        name="heart"
                        size={20}
                        className={record.is_liked ? "text-red-500" : "text-gray-700"}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkPlayed(record.id);
                      }}
                      className="w-12 h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      title="Mark as played"
                    >
                      <Icon name="check-circle" size={20} className="text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAlbum(record);
                      }}
                      className="w-12 h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      title="View details"
                    >
                      <Icon name="info" size={20} className="text-gray-700" />
                    </button>
                  </div>
                </div>
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
              <div key={record.id} className="bg-gray-900 rounded-lg overflow-hidden group">
                <div className="relative aspect-square cursor-pointer" onClick={() => setSelectedAlbum(record)}>
                  {imageLoadingStates[record.id] !== 'loaded' && imageLoadingStates[record.id] !== 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800 animate-pulse">
                      <div className="w-12 h-12 rounded-full border-2 border-gray-600 border-t-gray-400 animate-spin"></div>
                    </div>
                  )}
                  <img
                    src={record.album_art_url || '/placeholder-album.png'}
                    alt={record.title}
                    loading="lazy"
                    onLoad={() => setImageLoadingStates(prev => ({ ...prev, [record.id]: 'loaded' }))}
                    onError={() => setImageLoadingStates(prev => ({ ...prev, [record.id]: 'error' }))}
                    className={`w-full h-full object-cover transition-opacity duration-200 md:group-hover:opacity-70 ${
                      imageLoadingStates[record.id] === 'loaded' ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  {/* Hover overlay with action buttons */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLike(record.id);
                      }}
                      className="w-12 h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      title={record.is_liked ? "Unlike" : "Like"}
                    >
                      <Icon
                        name="heart"
                        size={20}
                        className={record.is_liked ? "text-red-500" : "text-gray-700"}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkPlayed(record.id);
                      }}
                      className="w-12 h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      title="Mark as played"
                    >
                      <Icon name="check-circle" size={20} className="text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAlbum(record);
                      }}
                      className="w-12 h-12 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      title="View details"
                    >
                      <Icon name="info" size={20} className="text-gray-700" />
                    </button>
                  </div>
                </div>
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

      {/* Album Detail Modal */}
      {selectedAlbum && (
        <AlbumDetailModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          onToggleLike={(id) => handleToggleLike(id)}
          onMarkPlayed={(id) => handleMarkPlayed(id)}
        />
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
