import { useState, useEffect } from 'react';
import { stacks as stacksApi, collection } from '../lib/api';
import AlbumDetailModal from './AlbumDetailModal';
import Icon from './Icon';
import VinylRecord from './VinylRecord';

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
  const [showPrompt, setShowPrompt] = useState({ show: false, targetIndex: null });
  const [promptPending, setPromptPending] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [showEndSessionPrompt, setShowEndSessionPrompt] = useState(false);
  const [tiltStyle, setTiltStyle] = useState({});
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapPhase, setSwapPhase] = useState('idle'); // 'idle', 'cover', 'hold', 'fade', 'hold-reveal', 'slide'
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
    setShowPrompt({ show: false, targetIndex: null });
    setPromptPending(false);
    setSelectedAlbum(null);
  }, [initialStack]);

  // Lock body scroll when component mounts, unlock when unmounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Detect scroll for top nav background
  useEffect(() => {
    const scrollContainer = document.querySelector('.stack-player-scroll-container');
    if (!scrollContainer) return;

    const handleScroll = () => {
      setIsScrolled(scrollContainer.scrollTop > 10);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [view]);

  const handleStartSpinning = () => {
    setView('spinning');
    setCurrentIndex(0);
    setSwapPhase('cover');
    // Auto-reveal the first record after a short cover + fade sequence.
    setTimeout(() => {
      setSwapPhase('hold');
      setTimeout(() => {
        setSwapPhase('fade');
        setTimeout(() => {
          setSwapPhase('hold-reveal');
          setTimeout(() => {
            setSwapPhase('slide');
            setTimeout(() => {
              setSwapPhase('idle');
            }, 500);
          }, 1000);
        }, 300);
      }, 600);
    }, 200);
  };

  const handleNext = (targetIndex = null) => {
    if (targetIndex !== null) {
      // Store the target index for later use
      setShowPrompt({ show: true, targetIndex });
    } else {
      setShowPrompt({ show: true, targetIndex: currentIndex + 1 });
    }
  };

  const runSwapToIndex = (nextIndex) => {
    if (isSwapping) return;
    setIsSwapping(true);
    setSwapPhase('cover');

    // Phase 1: Sleeve covers record (200ms)
    setTimeout(() => {
      setSwapPhase('hold');
      // Phase 2: Hold sleeve for a beat (600ms)
      setTimeout(() => {
        setSwapPhase('fade');
        // Phase 3: Sleeve fades out (300ms)
        setTimeout(() => {
          setCurrentIndex(nextIndex);
          setSwapPhase('hold-reveal');
          // Phase 4: Hold the new sleeve (1000ms), then slide left (500ms)
          setTimeout(() => {
            setSwapPhase('slide');
            setTimeout(() => {
              setSwapPhase('idle');
              setIsSwapping(false);
              setPromptPending(false);
            }, 500);
          }, 1000);
        }, 300);
      }, 600);
    }, 200);
  };

  const handleResolveNext = async (action) => {
    if (promptPending) return;
    const currentAlbum = albums[currentIndex];
    const played = action === 'played';
    const skipped = action === 'skipped';
    const targetIndex = showPrompt.targetIndex !== null ? showPrompt.targetIndex : currentIndex + 1;

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

      setShowPrompt({ show: false, targetIndex: null });

      console.log('🔍 Debug:', {
        currentIndex,
        targetIndex,
        albumsLength: albums.length,
        willAdvance: targetIndex <= albums.length - 1
      });

      if (targetIndex <= albums.length - 1) {
        runSwapToIndex(targetIndex);
      } else {
        setPromptPending(false);
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
      runSwapToIndex(currentIndex - 1);
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
    console.log('Album data being passed to modal:', album);
    setSelectedAlbum(album);
  };

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`,
      transition: 'none',
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'all 0.5s ease',
    });
  };

  // Minimized view
  if (view === 'minimized') {
    return (
      <div
        className="fixed bottom-24 md:bottom-4 right-4 bg-gray-900 rounded-lg p-4 shadow-2xl z-[60] cursor-pointer border border-gray-700"
        onClick={handleMaximize}
      >
        <div className="flex items-center gap-3">
          <img
            src={albums[currentIndex].album_art_url || '/placeholder-album.png'}
            alt="Now playing"
            className="w-12 h-12 rounded object-cover"
          />
          <div>
            <p className="font-semibold text-sm"><span className="opacity-50">Now Spinning:</span> {initialStack.name}</p>
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
      <div className="fixed inset-0 bg-black z-50 flex flex-col" style={{ background: 'linear-gradient(to bottom, #42423D 0%, #000000 100%)' }}>
        <div className={`px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-10 transition-colors duration-200 ${
          isScrolled ? 'bg-black/90 backdrop-blur-sm border-b border-gray-800' : 'bg-transparent'
        }`}>
          <h2 className="text-lg font-semibold truncate flex-1 min-w-0">
            <span className='opacity-50 pr-1 hidden md:inline'>Get Ready</span>
            <span className="truncate">{initialStack.name}</span>
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white flex-shrink-0"
          >
            Cancel
          </button>
        </div>

        <div className="flex-1 overflow-auto p-8 stack-player-scroll-container">
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {albums.map((album, index) => (
              <div key={`${album.id}-${index}`} className="text-center space-y-2">
                  <div className="relative mb-3">
                    <div className="text-4xl font-bold text-white mb-4">
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

        <div className="p-6 flex gap-4 justify-center border-t border-gray-800">
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
            <span className="md:hidden">Spin</span>
            <span className="hidden md:inline">Start Spinning</span>
          </button>
        </div>
      </div>
    );
  }

  // Now Spinning view
  const currentAlbum = albums[currentIndex];
  const nextAlbums = albums.slice(currentIndex + 1, currentIndex + 3);
  const recordClass = 'translate-x-0 rotate-0';
  const containerTransition =
    swapPhase === 'fade'
      ? 'opacity 0.3s ease'
      : `opacity 0.3s ease${
          tiltStyle.transition && tiltStyle.transition !== 'none'
            ? `, ${tiltStyle.transition.replace('all', 'transform')}`
            : ''
        }`;
  const containerStyle = {
    ...tiltStyle,
    opacity: swapPhase === 'fade' && isSwapping ? 0 : 1,
    transition: containerTransition,
  };
  const sleeveOpacity =
    swapPhase === 'slide' || swapPhase === 'idle' ? 0 : 1;
  const recordAnimationStyle = undefined;
  const recordVisibilityClass =
    swapPhase === 'hold' || swapPhase === 'fade' ? 'opacity-0' : 'opacity-100';
  const sleeveOffsetClass =
    swapPhase === 'slide' || swapPhase === 'idle'
      ? '-translate-x-[110%]'
      : 'translate-x-0';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #42423D 0%, #000000 100%)' }}
    >
      <div className={`px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-10 transition-colors duration-200 ${
        isScrolled ? 'bg-black/90 backdrop-blur-sm' : 'bg-transparent' 
      }`}>
        <h2 className="text-lg font-semibold truncate flex-1 min-w-0">
          <span className='opacity-50 pr-1 hidden md:inline'>Now Spinning</span>
          <span className="truncate">{initialStack.name}</span>
        </h2>
        <div className="flex items-center gap-4 md:gap-8 flex-shrink-0">
          {/* Mobile: Icon buttons */}
          <button
            onClick={handleEndSessionClick}
            className="md:hidden text-gray-400 hover:text-red-400 transition-colors"
            aria-label="End Session"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={handleMinimize}
            className="md:hidden text-gray-400 hover:text-white transition-colors"
            aria-label="Minimize"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Desktop: Text buttons */}
          <button
            onClick={handleEndSessionClick}
            className="hidden md:block text-gray-400 hover:text-red-400 transition-colors"
          >
            End Session
          </button>
          <button
            onClick={handleMinimize}
            className="hidden md:block text-gray-400 hover:text-white"
          >
            Minimize
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden stack-player-scroll-container">
        <div className="flex flex-col items-center p-6 space-y-6">
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <div
              className="relative w-64 h-64 md:w-96 md:h-96"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={containerStyle}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div
                  className={`w-full h-full transition-opacity duration-300 ${recordVisibilityClass} ${recordClass}`}
                  style={recordAnimationStyle}
                >
                  <VinylRecord
                    size={isMobile ? 256 : 384}
                    spinning={true}
                    className="drop-shadow-2xl"
                    coverUrl={currentAlbum.album_art_url || undefined}
                  />
                </div>
              </div>

              {/* Album Art */}
              <div
                className={`relative z-20 w-full h-full cursor-pointer transition-transform duration-500 ease-out ${sleeveOffsetClass}`}
                onClick={(e) => handleShowDetails(currentAlbum, e)}
                style={{ opacity: sleeveOpacity, transition: 'opacity 0.3s ease, transform 0.5s ease-out' }}
              >
                <img
                  src={currentAlbum.album_art_url || '/placeholder-album.png'}
                  alt={currentAlbum.title}
                  className="w-full h-full rounded-lg object-cover shadow-2xl"
                />
              </div>
            </div>
            {nextAlbums.length > 0 && (
              <div className="absolute -right-12 md:-right-16 top-6 md:top-8 -z-10 hidden md:block">
                {nextAlbums.map((album, idx) => (
                  <img
                    key={`${album.id}-${currentIndex + idx + 1}`}
                    src={album.album_art_url || '/placeholder-album.png'}
                    alt=""
                    className="w-48 h-48 md:w-72 md:h-72 rounded-lg object-cover opacity-50 absolute"
                    style={{
                      transform: `translateY(${idx * 20}px) rotate(${idx * 2}deg)`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <h2 className="text-2xl md:text-4xl font-bold mb-2 px-4">{currentAlbum.title}</h2>
          <p className="text-lg md:text-xl text-gray-400 mb-6 px-4">{currentAlbum.artist}</p>

          <div className="flex items-center justify-center gap-8">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="w-16 h-16 rounded-full bg-gray-800 disabled:opacity-30 hover:bg-gray-700 flex items-center justify-center"
            >
              <Icon name="chevron-left" size={32} />
            </button>
            <button
              onClick={() => handleNext()}
              className="w-16 h-16 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center"
            >
              <Icon name="chevron-right" size={32} />
            </button>
          </div>
        </div>

        <div className="w-full max-w-4xl">
          <div className="space-y-2">
            {albums.map((album, index) => (
              <div
                key={`${album.id}-${index}`}
                onClick={() => {
                  if (index !== currentIndex) {
                    handleNext(index);
                  }
                }}
                className={`group relative flex items-center gap-5 p-3 rounded ${
                  index === currentIndex
                    ? 'text-yellow-400'
                    : 'hover:bg-gray-800 cursor-pointer'
                } ${album.played || album.skipped ? 'text-gray-400' : ''}`}
              >
                <img
                  src={album.album_art_url || '/placeholder-album.png'}
                  alt=""
                  className="w-16 h-16 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-m truncate">{album.title}</p>
                  <p className="text-sm opacity-75 truncate">{album.artist}</p>
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

      {showPrompt && showPrompt.show && (
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
              onClick={() => setShowPrompt({ show: false, targetIndex: null })}
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
            <h3 className="text-lg font-semibold">Stop this session?</h3>
            <p className="text-gray-300">
              Are you sure you want to stop your session? Your progress will be saved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmEndSession}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
              >
                Stop
              </button>
              <button
                onClick={handleCancelEndSession}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
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
