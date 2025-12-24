export default function BottomNav({ currentView, onNavigate, onOpenStackBuilder }) {
  return (
    <div className="md:hidden m-4 fixed rounded-full bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50 drop-shadow-xl">
      <div className="flex items-center justify-around h-16 px-3">
        {/* Stacks */}
        <button
          onClick={() => onNavigate('stacks')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            currentView === 'stacks' ? 'text-black' : 'text-gray-400'
          }`}
        >
          <div className={`h-12 flex items-center justify-center rounded-full size-full transition-all ${
            currentView === 'stacks' ? 'bg-yellow-400' : ''
          }`}>
            <img
              src="/icons/home-04.svg"
              alt="Stacks"
              className={`w-6 h-6 ${currentView === 'stacks' ? 'brightness-0' : ''}`}
            />
          </div>
        </button>

        {/* Collection */}
        <button
          onClick={() => onNavigate('collection')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            currentView === 'collection' ? 'text-black' : 'text-gray-400'
          }`}
        >
          <div className={`h-12 flex items-center justify-center rounded-full size-full transition-all ${
            currentView === 'collection' ? 'bg-yellow-400' : ''
          }`}>
            <img
              src="/icons/layout-grid-01.svg"
              alt="Collection"
              className={`w-6 h-6 ${currentView === 'collection' ? 'brightness-0' : ''}`}
            />
          </div>
        </button>

        {/* Stats */}
        <button
          onClick={() => onNavigate('stats')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            currentView === 'stats' ? 'text-black' : 'text-gray-400'
          }`}
        >
          <div className={`h-12 flex items-center justify-center rounded-full size-full transition-all ${
            currentView === 'stats' ? 'bg-yellow-400' : ''
          }`}>
            <img
              src="/icons/recording-02.svg"
              alt="Stats"
              className={`w-6 h-6 ${currentView === 'stats' ? 'brightness-0' : ''}`}
            />
          </div>
        </button>

        {/* New Stack (Plus Button) */}
        <button
          onClick={onOpenStackBuilder}
          className="flex flex-col items-center justify-center flex-1 h-full"
        >
          <div className="h-12 flex items-center justify-center rounded-full size-full text-gray-700 hover:border-gray-400 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}
