import { useState } from 'react';
import { playlists } from '../lib/api';

export default function PlaylistGenerator() {
  const [generating, setGenerating] = useState(false);
  const [playlist, setPlaylist] = useState(null);
  const [selectedType, setSelectedType] = useState('daily-discovery');
  const [count, setCount] = useState(10);

  const playlistTypes = [
    { value: 'daily-discovery', label: 'Daily Discovery', description: 'Random selection weighted toward least-played records' },
    { value: 'rare-gems', label: 'Rare Gems', description: 'Never played or least played records' },
    { value: 'dust-collectors', label: 'Dust Collectors', description: 'Records you haven\'t played in the longest time' },
    { value: 'recently-added', label: 'Recently Added', description: 'Your newest additions to the collection' },
    { value: 'favorites', label: 'Favorites', description: 'Your most played records' },
    { value: 'time-machine', label: 'Time Machine', description: 'Random selection from your collection' },
  ];

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const response = await playlists.generate({
        type: selectedType,
        count: parseInt(count),
      });
      setPlaylist(response.data.playlist);
    } catch (error) {
      console.error('Failed to generate playlist:', error);
      alert('Failed to generate playlist. Make sure you have synced your collection first.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-3xl font-bold mb-8">Generate Playlist</h2>

      {!playlist ? (
        <div className="space-y-6">
          {/* Playlist Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Playlist Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playlistTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedType === type.value
                      ? 'border-white bg-secondary'
                      : 'border-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium mb-1">{type.label}</div>
                  <div className="text-sm text-gray-400">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Count Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Number of Records ({count})
            </label>
            <input
              type="range"
              min="5"
              max="25"
              step="5"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5</span>
              <span>25</span>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary w-full disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Playlist'}
          </button>
        </div>
      ) : (
        <div>
          {/* Playlist Result */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-2">{playlist.name}</h3>
            <p className="text-gray-400">
              {playlist.records.length} records • Created {new Date(playlist.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Record List */}
          <div className="space-y-4 mb-6">
            {playlist.records.map((record, index) => (
              <div key={record.id} className="flex gap-4 items-center bg-secondary p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-600 w-8">
                  {index + 1}
                </div>
                <div className="w-16 h-16 bg-accent rounded overflow-hidden flex-shrink-0">
                  {record.album_art_url && (
                    <img
                      src={record.album_art_url}
                      alt={record.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{record.title}</h4>
                  <p className="text-sm text-gray-400 truncate">{record.artist}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setPlaylist(null)}
            className="btn-secondary"
          >
            Generate Another
          </button>
        </div>
      )}
    </div>
  );
}
