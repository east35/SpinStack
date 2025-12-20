import { useEffect, useState } from 'react';
import Icon from './Icon';

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

export default function AlbumDetailModal({ album, onClose, onToggleLike, onMarkPlayed }) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200); // Match fadeOut animation duration
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Reset closing state when album changes
  useEffect(() => {
    if (album) {
      setIsClosing(false);
    }
  }, [album]);

  if (!album) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 !m-0 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row gap-6 p-6">
          {/* Album Art */}
          <div className="md:w-1/3 flex-shrink-0">
            <div className="aspect-square bg-secondary rounded-lg overflow-hidden">
              {album.album_art_url ? (
                <img
                  src={album.album_art_url}
                  alt={album.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  No Image
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex-co gap-3 mt-4">
              <button
                onClick={() => onToggleLike(album.id)}
                className="flex-1 btn-primary flex items-center justify-center gap-2 min-h-[44px] w-full mb-4"
              >
                <Icon
                  name="heart"
                  size={20}
                  className={album.is_liked ? "text-red-500" : "text-gray-400"}
                />
                {album.is_liked ? 'Liked' : 'Like'}
              </button>
              <button
                onClick={() => onMarkPlayed(album.id)}
                className="flex-1 btn-primary flex items-center justify-center gap-2 min-h-[44px] w-full"
              >
                <Icon name="check-circle" size={20} className="text-gray-400" />
                {album.listened_count > 0 ? 'Played Again' : 'Mark Played'}
              </button>
            </div>
          </div>

          {/* Album Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{album.title}</h2>
                <p className="text-lg text-gray-400 mb-1">{album.artist}</p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors p-2 min-h-[44px] min-w-[44px]"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {album.year && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Year</div>
                  <div className="text-sm">{album.year}</div>
                </div>
              )}
              {album.label && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Label</div>
                  <div className="text-sm">{album.label}</div>
                </div>
              )}
              {album.catalog_number && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Catalog #</div>
                  <div className="text-sm">{album.catalog_number}</div>
                </div>
              )}
              {album.format && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Format</div>
                  <div className="text-sm">{album.format}</div>
                </div>
              )}
              {album.country && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Country</div>
                  <div className="text-sm">{album.country}</div>
                </div>
              )}
              {typeof album.listened_count === 'number' && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Play Count</div>
                  <div className="text-sm">
                    {album.listened_count === 0 ? (
                      <span className="text-yellow-500">Unplayed</span>
                    ) : (
                      `${album.listened_count} ${album.listened_count === 1 ? 'play' : 'plays'}`
                    )}
                  </div>
                </div>
              )}
              {album.last_played_at && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Last Played</div>
                  <div className="text-sm">
                    {new Date(album.last_played_at).toLocaleDateString()}
                  </div>
                </div>
              )}
              {album.date_added_to_collection && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Added to Collection</div>
                  <div className="text-sm">
                    {new Date(album.date_added_to_collection).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {/* Genres */}
            {album.genres && album.genres.length > 0 && (
              <div className="mb-6">
                <div className="text-xs text-gray-500 uppercase mb-2">Genres</div>
                <div className="flex flex-wrap gap-2">
                  {album.genres.map((genre, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 rounded-full text-sm ${getGenreColor(genre)}`}
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Styles */}
            {album.styles && album.styles.length > 0 && (
              <div className="mb-6">
                <div className="text-xs text-gray-500 uppercase mb-2">Styles</div>
                <div className="flex flex-wrap gap-2">
                  {album.styles.map((style, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 text-gray-400 bg-gray-800 rounded-full text-sm font-regular"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Discogs Link */}
            {album.discogs_release_id && (
              <div className="pt-4 border-t border-gray-800">
                <a
                  href={`https://www.discogs.com/release/${album.discogs_release_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-2"
                >
                  View on Discogs
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
