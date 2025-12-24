'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { collection, stacks as stacksApi } from '../lib/api';
import Icon from './Icon';

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

export default function StackBuilderView({ onCancel, onStackCreated }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [availableGenres, setAvailableGenres] = useState([]);
  const [sort, setSort] = useState('added_desc');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [stackId, setStackId] = useState(null);
  const [selectedAlbums, setSelectedAlbums] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [addingToStack, setAddingToStack] = useState(null);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [stackName, setStackName] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasInteractedWithFilters, setHasInteractedWithFilters] = useState(false);
  const observerTarget = useRef(null);
  const searchInputRef = useRef(null);
  const perPage = 50;

  // Initialize or resume draft
  useEffect(() => {
    const initDraft = async () => {
      try {
        const draftResponse = await stacksApi.getDraft();
        if (draftResponse.data.draft) {
          setStackId(draftResponse.data.draft.id);
          setSelectedAlbums(draftResponse.data.draft.albums || []);

          // Load recommendations
          const recsResponse = await stacksApi.getRecommendations(draftResponse.data.draft.id);
          setSuggestions(recsResponse.data.suggestions || []);
        } else {
          // Create new draft
          const createResponse = await stacksApi.createCustom();
          setStackId(createResponse.data.stackId);

          // Get initial recommendations
          const recsResponse = await stacksApi.getRecommendations(createResponse.data.stackId);
          setSuggestions(recsResponse.data.suggestions || []);
        }
      } catch (error) {
        console.error('Failed to initialize draft:', error);
      }
    };
    initDraft();
  }, []);

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
    } catch (error) {
      console.error('Failed to load collection:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, sort, searchQuery, selectedGenre]);

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
    }, 300);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Restore focus to search input after re-renders if it was focused
  useEffect(() => {
    if (searchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [records, loading, loadingMore]);

  const handleAddToStack = async (record, e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    // Check if already in stack
    const isAlreadyAdded = selectedAlbums.some(a => a.id === record.id);
    if (isAlreadyAdded) {
      return handleRemoveFromStack(record.id, e);
    }

    if (selectedAlbums.length >= 8) {
      alert('Stack is full! Remove an album first.');
      return;
    }

    if (!stackId) return;

    try {
      setAddingToStack(record.id);
      const response = await stacksApi.addAlbumToStack(stackId, record.id);
      setSelectedAlbums(response.data.albums);
      setSuggestions(response.data.suggestions || []);

      // Show naming modal when we reach 8
      if (response.data.albums.length === 8) {
        setShowNamingModal(true);
      }
    } catch (error) {
      console.error('Failed to add to stack:', error);
      alert(error.response?.data?.error || 'Failed to add album to stack');
    } finally {
      setAddingToStack(null);
    }
  };

  const handleRemoveFromStack = async (albumId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    if (!stackId) return;

    try {
      setAddingToStack(albumId);
      const response = await stacksApi.removeAlbumFromStack(stackId, albumId);
      setSelectedAlbums(response.data.albums);
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Failed to remove from stack:', error);
      alert(error.response?.data?.error || 'Failed to remove album from stack');
    } finally {
      setAddingToStack(null);
    }
  };

  const handleSaveStack = async () => {
    if (!stackName.trim() || selectedAlbums.length !== 8) return;

    try {
      setSaving(true);
      await stacksApi.saveCustomStack(stackId, stackName.trim(), '');

      // Notify parent
      if (onStackCreated) {
        onStackCreated({
          id: `custom-${stackId}`,
          stackId: stackId,
          name: stackName,
          type: 'custom',
          albums: selectedAlbums
        });
      }

      // Reset state for new stack
      setShowNamingModal(false);
      setStackName('');
      setSelectedAlbums([]);

      // Create new draft stack
      const createResponse = await stacksApi.createCustom();
      setStackId(createResponse.data.stackId);

      // Get initial recommendations
      const recsResponse = await stacksApi.getRecommendations(createResponse.data.stackId);
      setSuggestions(recsResponse.data.suggestions || []);
    } catch (error) {
      console.error('Failed to save stack:', error);
      alert(error.response?.data?.error || 'Failed to save stack');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSuggestion = async (suggestion, e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    // Use the same handler as regular albums
    handleAddToStack(suggestion, e);
  };

  const isAlbumSelected = (albumId) => {
    return selectedAlbums.some(a => a.id === albumId);
  };

  if (loading && records.length === 0) {
    return <div className="text-center py-12">Loading collection...</div>;
  }

  return (
    <div className="space-y-6" style={{ paddingBottom: selectedAlbums.length > 0 ? '200px' : '0' }}>
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Build Your Stack</h1>
          <p className="text-gray-400 text-sm">
            {selectedAlbums.length} / 8 albums selected
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white rounded-full transition font-medium"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Selected albums preview - Sticky at bottom */}
      {selectedAlbums.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 p-4 z-40">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Your Stack</h3>
              <div className="text-sm font-bold">{selectedAlbums.length} / 8</div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {selectedAlbums.map((album, index) => (
                <div key={album.id} className="relative group">
                  <div className="aspect-square rounded overflow-hidden bg-gray-800">
                    <img
                      src={album.album_art_url}
                      alt={album.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute top-1 left-1 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                    {index + 1}
                  </div>
                  <button
                    onClick={(e) => handleRemoveFromStack(album.id, e)}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {/* Empty slots */}
              {[...Array(8 - selectedAlbums.length)].map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square rounded border-2 border-dashed border-gray-700 bg-gray-800/50" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && selectedAlbums.length < 8 && !hasInteractedWithFilters && (
        <div className="bg-amber-500/5 border-2 border-dashed border-amber-500/50 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wide">
            {selectedAlbums.length === 0 ? 'Recommended For You' : 'Suggestions Based on Your Selections'}
          </h3>
          <p className="text-xs text-gray-400 mb-3">Click to add to your stack</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {suggestions.slice(0, 12).map((suggestion) => {
              const isSelected = isAlbumSelected(suggestion.id);
              const isDisabled = addingToStack === suggestion.id || (selectedAlbums.length >= 8 && !isSelected);
              return (
                <div
                  key={suggestion.id}
                  className="group text-left relative"
                >
                  <button
                    onClick={(e) => handleAddSuggestion(suggestion, e)}
                    disabled={isDisabled}
                    className={`w-full aspect-square rounded overflow-hidden bg-gray-800 relative ${
                      isSelected ? 'ring-4 ring-green-500' : ''
                    } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <img
                      src={suggestion.album_art_url}
                      alt={suggestion.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      {addingToStack === suggestion.id ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      ) : isSelected ? (
                        <div className="w-12 h-12 rounded-full bg-red-500/90 flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                  <h3 className="font-medium text-xs mt-2 truncate">{suggestion.title}</h3>
                  <p className="text-gray-400 text-xs truncate">{suggestion.artist}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and filters - Sticky */}
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-sm pt-4 pb-4 -mx-4 px-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value) {
                  setHasInteractedWithFilters(true);
                }
              }}
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
            onChange={(e) => {
              setSelectedGenre(e.target.value);
              if (e.target.value) {
                setHasInteractedWithFilters(true);
              }
            }}
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
              if (e.target.value !== 'added_desc') {
                setHasInteractedWithFilters(true);
              }
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
      </div>

      {/* Collection grid */}
      {records.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No records found in your collection.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {records.map((record) => {
              const isSelected = isAlbumSelected(record.id);
              return (
                <div key={record.id} className="album-card group">
                  <div
                    className={`aspect-square bg-secondary mb-3 rounded overflow-hidden relative cursor-pointer ${
                      isSelected ? 'ring-4 ring-green-500' : ''
                    }`}
                    onClick={(e) => handleAddToStack(record, e)}
                  >
                    {record.album_art_url ? (
                      <img
                        src={record.album_art_url}
                        alt={record.title}
                        className="w-full h-full object-cover transition-opacity duration-200 md:group-hover:opacity-70"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        No Image
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {addingToStack === record.id ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      ) : isSelected ? (
                        <button
                          onClick={(e) => handleRemoveFromStack(record.id, e)}
                          className="w-12 h-12 rounded-full bg-red-500/90 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-110"
                        >
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleAddToStack(record, e)}
                          disabled={selectedAlbums.length >= 8}
                          className="w-12 h-12 rounded-full bg-white/90 hover:bg-white disabled:bg-white/50 flex items-center justify-center transition-all hover:scale-110"
                        >
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-medium text-sm mb-1 truncate">{record.title}</h3>
                  <p className="text-gray-400 text-xs mb-1 truncate">{record.artist}</p>
                  <div className="text-xs flex items-center gap-2 flex-wrap">
                    {record.year && <span className="text-gray-500">{record.year}</span>}
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

      {/* Naming Modal */}
      {showNamingModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-800">
            <div className="flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mx-auto">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-center">Stack Complete!</h3>
            <p className="text-gray-400 text-center text-sm">
              Give your stack a name to save it
            </p>

            <div className="grid grid-cols-4 gap-1.5">
              {selectedAlbums.slice(0, 8).map((album) => (
                <img
                  key={album.id}
                  src={album.album_art_url}
                  alt={album.title}
                  className="w-full aspect-square rounded object-cover"
                />
              ))}
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Stack Name</label>
              <input
                type="text"
                value={stackName}
                onChange={(e) => setStackName(e.target.value)}
                placeholder="e.g., Sunday Morning Vibes"
                maxLength={100}
                autoFocus
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowNamingModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                Keep Building
              </button>
              <button
                onClick={handleSaveStack}
                disabled={!stackName.trim() || saving}
                className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                {saving ? 'Saving...' : 'Save Stack'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
