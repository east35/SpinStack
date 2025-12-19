import { useEffect, useMemo, useState } from 'react';
import { collection } from '../lib/api';

function MixCard({ mix }) {
  return (
    <div className="bg-secondary rounded-xl p-4 w-64 flex-shrink-0 hover:translate-y-[-2px] transition-transform">
      <div className="grid grid-cols-2 grid-rows-2 gap-1 mb-3 aspect-square rounded-lg overflow-hidden bg-black">
        {mix.covers.map((cover, idx) => (
          <div key={idx} className="bg-black">
            {cover ? (
              <img src={cover} alt={mix.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-800" />
            )}
          </div>
        ))}
      </div>
      <div className="font-semibold truncate">{mix.title}</div>
      <div className="text-sm text-gray-400 truncate">{mix.subtitle}</div>
    </div>
  );
}

export default function MusicTab() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await collection.getAll({ limit: 40, sort: 'added_desc' });
        setRecords(response.data.records || []);
      } catch (error) {
        console.error('Failed to load records for mixes:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const coverPool = useMemo(
    () => records.map((r) => r.album_art_url).filter(Boolean),
    [records]
  );

  const mixes = useMemo(() => {
    const seedCovers = (start) => {
      const covers = [];
      for (let i = 0; i < 4; i++) {
        covers.push(coverPool[(start + i) % coverPool.length] || null);
      }
      return covers;
    };

    const base = [
      { title: 'Daily Discovery', subtitle: 'Fresh pulls from your shelves', start: 0 },
      { title: 'Late Night', subtitle: 'Deep cuts & mellow grooves', start: 4 },
      { title: 'Dust Collectors', subtitle: 'Records you haven’t spun lately', start: 8 },
      { title: 'New Arrivals', subtitle: 'Recently added picks', start: 12 },
      { title: 'Genre Dive', subtitle: 'A focused listen from your top genres', start: 16 },
      { title: 'Hi-Fi Showcase', subtitle: 'Pressings that deserve volume', start: 20 },
    ];

    return base.map((mix) => ({
      ...mix,
      covers: coverPool.length ? seedCovers(mix.start) : [null, null, null, null],
    }));
  }, [coverPool]);

  if (loading) {
    return <div className="py-8 text-gray-400">Loading your mixes...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2">Music</h2>
        <p className="text-gray-400">Auto-generated mixes inspired by your collection.</p>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">For you</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {mixes.slice(0, 3).map((mix) => (
              <MixCard key={mix.title} mix={mix} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Inspired by your shelves</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {mixes.slice(3).map((mix) => (
              <MixCard key={mix.title} mix={mix} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
