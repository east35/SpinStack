import { useState, useEffect } from 'react';
import { stacks as stacksApi, collection } from '../lib/api';
import { extractColorsFromImage } from '../lib/colorExtractor';
import AlbumDetailModal from './AlbumDetailModal';
import Icon from './Icon';

export default function StackPlayer({ stack: initialStack, onClose, onMinimize, onMaximize }) {
  const [view, setView] = useState('pull'); // 'pull', 'spinning', or 'minimized'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [albums, setAlbums] = useState(
    initialStack.albums.map((album) => ({
      ...album,
      played: false,
      skipped: false,
    }))
  );
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptPending, setPromptPending] = useState(false);
  const [backgroundGradient, setBackgroundGradient] = useState('linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)');
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [showEndSessionPrompt, setShowEndSessionPrompt] = useState(false);

  // Reset state when stack changes
  useEffect(() => {
    setView('pull');
    setCurrentIndex(0);
    setAlbums(
      initialStack.albums.map((album) => ({
        ...album,
        played: false,
        skipped: false,
      }))
    );
    setShowPrompt(false);
    setPromptPending(false);
    setBackgroundGradient('linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)');
    setSelectedAlbum(null);
  }, [initialStack]);

  // Extract colors from current album art
  useEffect(() => {
    if (view === 'spinning' && albums[currentIndex]?.album_art_url) {
      extractColorsFromImage(albums[currentIndex].album_art_url)
        .then(({ gradient }) => {
          setBackgroundGradient(gradient);
        })
        .catch((error) => {
          console.error('Failed to extract colors:', error);
        });
    }
  }, [currentIndex, view]);

  const handleStartSpinning = () => {
    setView('spinning');
    setCurrentIndex(0);
  };

  const handleNext = () => {
    setShowPrompt(true);
  };

  const handleResolveNext = async (action) => {
    if (promptPending) return;
    const currentAlbum = albums[currentIndex];
    const played = action === 'played';
    const skipped = action === 'skipped';

    try {
      setPromptPending(true);
      await stacksApi.markPlayed({
        albumId: currentAlbum.id,
        played,
        skipped,
      });

      const updated = [...albums];
      updated[currentIndex] = { ...currentAlbum, played, skipped };
      setAlbums(updated);

      setShowPrompt(false);
      setPromptPending(false);

      if (currentIndex < albums.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        alert('Stack complete!');
        onClose();
      }
    } catch (error) {
      console.error('Failed to mark album:', error);
      alert('Failed to mark album. Please try again.');
      setPromptPending(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleMinimize = () => {
    setView('minimized');
    if (onMinimize) onMinimize();
  };

  const handleMaximize = () => {
    setView('spinning');
    if (onMaximize) onMaximize();
  };

  const handleEndSessionClick = () => {
    setShowEndSessionPrompt(true);
  };

  const handleConfirmEndSession = () => {
    setShowEndSessionPrompt(false);
    onClose();
  };

  const handleCancelEndSession = () => {
    setShowEndSessionPrompt(false);
  };

  const handleCancel = () => {
    onClose();
  };

  const handleToggleLike = async (albumId, e) => {
    if (e) e.stopPropagation();
    try {
      await collection.toggleLike(albumId);
      setAlbums((prev) =>
        prev.map((a) =>
          a.id === albumId ? { ...a, is_liked: !a.is_liked } : a
        )
      );
      // Update selected album if it's the one being liked
      if (selectedAlbum && selectedAlbum.id === albumId) {
        setSelectedAlbum((prev) => ({ ...prev, is_liked: !prev.is_liked }));
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleShowDetails = (album, e) => {
    if (e) e.stopPropagation();
    setSelectedAlbum(album);
  };

  // Minimized view
  if (view === 'minimized') {
    return (
      <div
        className="fixed bottom-4 right-4 bg-gray-900 rounded-lg p-4 shadow-2xl z-50 cursor-pointer border border-gray-700"
        onClick={handleMaximize}
      >
        <div className="flex items-center gap-3">
          <img
            src={albums[currentIndex].album_art_url || '/placeholder-album.png'}
            alt="Now playing"
            className="w-12 h-12 rounded object-cover"
          />
          <div>
            <p className="font-semibold text-sm">Now Spinning: {initialStack.name}</p>
            <p className="text-xs text-gray-400">
              {currentIndex + 1} / {albums.length}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pull Records view
  if (view === 'pull') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Get Ready: {initialStack.name}</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {albums.map((album, index) => (
              <div key={`${album.id}-${index}`} className="text-center space-y-2">
                  <div className="relative mb-1">
                    <div className="text-4xl font-bold text-white mb-1">
                      {index + 1}
                    </div>
                    <img
                      src={album.album_art_url || '/placeholder-album.png'}
                      alt={album.title}
                      className="w-full aspect-square rounded-sm object-cover"
                    />
                  </div>
                  <h4 className="font-semibold text-sm">{album.title}</h4>
                  <p className="text-xs text-gray-400">{album.artist}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 p-6 flex gap-4 justify-center">
          <button
            onClick={handleCancel}
            className="px-8 py-3 bg-gray-800 rounded-full hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleStartSpinning}
            className="px-8 py-3 bg-yellow-400 text-black rounded-full font-semibold hover:bg-yellow-300"
          >
            Start Spinning →
          </button>
        </div>
      </div>
    );
  }

  // Now Spinning view
  const currentAlbum = albums[currentIndex];
  const nextAlbums = albums.slice(currentIndex + 1, currentIndex + 3);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden transition-all duration-700"
      style={{ background: backgroundGradient }}
    >
      <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Now Spinning: {initialStack.name}</h2>
        <div className="flex items-center gap-8">
          <button
            onClick={handleEndSessionClick}
            className="text-gray-400 hover:text-red-400 transition-colors"
          >
            End Session
          </button>
          <button
            onClick={handleMinimize}
            className="text-gray-400 hover:text-white"
          >
            Minimize
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center p-6 space-y-6">
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <div className="w-96 h-96 max-w-[90vw] max-h-[90vw]">
              <img
                src={currentAlbum.album_art_url || '/placeholder-album.png'}
                alt={currentAlbum.title}
                className="w-full h-full rounded-lg object-cover shadow-2xl"
              />
            </div>
            {nextAlbums.length > 0 && (
              <div className="absolute -right-16 top-8 -z-10 hidden md:block">
                {nextAlbums.map((album, idx) => (
                  <img
                    key={`${album.id}-${currentIndex + idx + 1}`}
                    src={album.album_art_url || '/placeholder-album.png'}
                    alt=""
                    className="w-72 h-72 rounded-lg object-cover opacity-50 absolute"
                    style={{
                      transform: `translateY(${idx * 20}px) rotate(${idx * 2}deg)`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <h2 className="text-4xl font-bold mb-2">{currentAlbum.title}</h2>
          <p className="text-xl text-gray-400 mb-6">{currentAlbum.artist}</p>

          <div className="flex items-center justify-center gap-8">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="w-16 h-16 rounded-full bg-gray-800 disabled:opacity-30 hover:bg-gray-700 flex items-center justify-center text-2xl"
            >
              ←
            </button>
            <button
              onClick={handleNext}
              className="w-16 h-16 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-2xl"
            >
              →
            </button>
          </div>
        </div>

        <div className="w-full max-w-4xl">
          <h3 className="text-sm font-semibold mb-3 uppercase text-gray-400">Stack</h3>
          <div className="space-y-2">
            {albums.map((album, index) => (
              <div
                key={`${album.id}-${index}`}
                onClick={() => setCurrentIndex(index)}
                className={`group relative flex items-center gap-3 p-3 rounded cursor-pointer ${
                  index === currentIndex
                    ? 'bg-yellow-400 text-black'
                    : album.played || album.skipped
                    ? 'bg-gray-800 text-gray-400'
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
              >
                <img
                  src={album.album_art_url || '/placeholder-album.png'}
                  alt=""
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{album.title}</p>
                  <p className="text-xs opacity-75 truncate">{album.artist}</p>
                </div>
                {(album.played || album.skipped) && (
                  <span className="text-xs">
                    {album.skipped ? 'Skipped' : 'Played'}
                  </span>
                )}

                {/* Hover action buttons */}
                <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleToggleLike(album.id, e)}
                    className={`w-8 h-8 rounded-full ${
                      index === currentIndex
                        ? 'bg-white/20 hover:bg-white/30'
                        : 'bg-white/10 hover:bg-white/20'
                    } flex items-center justify-center transition-all`}
                    title={album.is_liked ? "Unlike" : "Like"}
                  >
                    <Icon
                      name="heart"
                      size={16}
                      className={album.is_liked ? "text-red-500" : index === currentIndex ? "text-black" : "text-white"}
                    />
                  </button>
                  <button
                    onClick={(e) => handleShowDetails(album, e)}
                    className={`w-8 h-8 rounded-full ${
                      index === currentIndex
                        ? 'bg-white/20 hover:bg-white/30'
                        : 'bg-white/10 hover:bg-white/20'
                    } flex items-center justify-center transition-all`}
                    title="View details"
                  >
                    <Icon
                      name="info"
                      size={16}
                      className={index === currentIndex ? "text-black" : "text-white"}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

      {showPrompt && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-800">
            <h3 className="text-lg font-semibold">Mark album as…</h3>
            <p className="text-gray-300">{albums[currentIndex]?.title}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleResolveNext('played')}
                disabled={promptPending}
                className="flex-1 px-4 py-3 bg-yellow-400 text-black rounded-lg font-semibold disabled:opacity-50"
              >
                Played
              </button>
              <button
                onClick={() => handleResolveNext('skipped')}
                disabled={promptPending}
                className="flex-1 px-4 py-3 bg-gray-800 rounded-lg font-semibold disabled:opacity-50"
              >
                Skipped
              </button>
            </div>
            <button
              onClick={() => setShowPrompt(false)}
              disabled={promptPending}
              className="w-full text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* End Session Confirmation */}
      {showEndSessionPrompt && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-800">
            <h3 className="text-lg font-semibold">End this session?</h3>
            <p className="text-gray-300">
              Are you sure you want to end your spinning session? Your progress will be saved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmEndSession}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
              >
                End Session
              </button>
              <button
                onClick={handleCancelEndSession}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                Keep Spinning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Album Detail Modal */}
      {selectedAlbum && (
        <AlbumDetailModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          onToggleLike={(id) => handleToggleLike(id)}
          onMarkPlayed={(id) => {
            // Mark played functionality can be added if needed
            console.log('Mark played:', id);
          }}
        />
      )}
    </div>
  );
}
