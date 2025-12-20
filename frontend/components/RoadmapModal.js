import Icon from './Icon';

export default function RoadmapModal({ onClose }) {
  const roadmapItems = [
    {
      category: 'Curation & Discovery',
      features: [
        { name: 'Custom Stack Builder', description: 'Create personalized listening sessions with custom rules and filters', status: 'planned' },
        { name: 'Smart Recommendations', description: 'AI-powered suggestions based on your listening habits and collection', status: 'planned' },
        { name: 'Collaborative Stacks', description: 'Share and discover stacks from other collectors', status: 'future' },
      ]
    },
    {
      category: 'Data & Insights',
      features: [
        { name: 'Collection Export', description: 'Export your collection data in various formats (CSV, JSON, PDF)', status: 'planned' },
        { name: 'Advanced Analytics', description: 'Deep dive into your listening patterns and collection trends', status: 'planned' },
        { name: 'Year in Review', description: 'Annual summary of your vinyl journey', status: 'future' },
      ]
    },
    {
      category: 'Shopping & Value',
      features: [
        { name: 'Wishlist Tracker', description: 'Track albums you want to add to your collection', status: 'planned' },
        { name: 'Price Watch', description: 'Monitor marketplace prices for items on your wishlist', status: 'planned' },
        { name: 'Collection Value Tracking', description: 'Track the estimated value of your collection over time', status: 'future' },
      ]
    },
    {
      category: 'Social & Community',
      features: [
        { name: 'Public Profiles', description: 'Share your collection and stats with the community', status: 'planned' },
        { name: 'Collection Comparisons', description: 'Compare your collection with friends and find shared albums', status: 'future' },
        { name: 'Listening Parties', description: 'Virtual listening sessions with other collectors', status: 'future' },
      ]
    },
    {
      category: 'Organization',
      features: [
        { name: 'Custom Tags & Labels', description: 'Organize your collection with custom metadata', status: 'planned' },
        { name: 'Physical Location Tracking', description: 'Remember where each record is stored', status: 'planned' },
        { name: 'Condition Tracking', description: 'Track the condition of your records and sleeves', status: 'future' },
      ]
    },
  ];

  const getStatusBadge = (status) => {
    const styles = {
      planned: 'bg-blue-500/20 text-blue-400',
      'in_progress': 'bg-yellow-500/20 text-yellow-400',
      future: 'bg-purple-500/20 text-purple-400',
    };

    const labels = {
      planned: 'Planned',
      'in_progress': 'In Progress',
      future: 'Future',
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Product Roadmap</h2>
            <p className="text-gray-400 text-sm mt-1">Upcoming features and improvements for SpinStack</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition"
          >
            <Icon name="x" size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {roadmapItems.map((category) => (
            <div key={category.category}>
              <h3 className="text-lg font-semibold mb-4 text-yellow-400">{category.category}</h3>
              <div className="space-y-3">
                {category.features.map((feature) => (
                  <div
                    key={feature.name}
                    className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium">{feature.name}</h4>
                        <p className="text-sm text-gray-400 mt-1">{feature.description}</p>
                      </div>
                      {getStatusBadge(feature.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-gray-800/30">
          <p className="text-sm text-gray-400 text-center">
            Have a feature request? Connect with us on GitHub or send feedback through the app.
          </p>
        </div>
      </div>
    </div>
  );
}
