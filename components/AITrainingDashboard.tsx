import React, { useState } from 'react';

interface AITrainingDashboardProps {
  companyId: string;
  onClose: () => void;
}

export const AITrainingDashboard: React.FC<AITrainingDashboardProps> = ({ companyId, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'search'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleProcessLeads = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert('Lead processing started. This feature will be fully implemented in the next phase.');
    }, 2000);
  };

  const handleTestSearch = () => {
    if (!searchQuery.trim()) return;
    
    setSearchResults([
      {
        lead: { firstName: 'John', lastName: 'Doe' },
        content: 'Software engineer interested in AI solutions',
        similarity: 0.89
      },
      {
        lead: { firstName: 'Sarah', lastName: 'Smith' },
        content: 'Machine learning specialist seeking tools',
        similarity: 0.76
      }
    ]);
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Vector Database</h3>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">1,250</div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Vectors</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Processing Queue</h3>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">3</div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Pending Jobs</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Success Rate</h3>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">97%</div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Last 24h</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Pipeline Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Lead Vector Processing</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Converting leads to searchable vectors</p>
            </div>
            <span className="px-2 py-1 rounded text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPipelineTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Pipeline Controls</h3>
        <div className="flex gap-4">
          <button
            onClick={handleProcessLeads}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Process New Leads'}
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Pipeline Information</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">Data Processing Pipeline</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This AI training pipeline converts lead data into vector embeddings for similarity search and AI-powered lead matching.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Test AI Similarity Search</h3>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter search query..."
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          />
          <button
            onClick={handleTestSearch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Search
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-slate-900 dark:text-white">Search Results:</h4>
            {searchResults.map((result, index) => (
              <div key={index} className="p-3 bg-slate-50 dark:bg-slate-700 rounded border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{result.lead?.firstName} {result.lead?.lastName}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{result.content}</p>
                  </div>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {(result.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[80]">
      <div className="bg-white dark:bg-slate-800 w-full max-w-6xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI Training Dashboard</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'pipeline', label: 'Pipeline' },
            { id: 'search', label: 'Search Test' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'pipeline' && renderPipelineTab()}
          {activeTab === 'search' && renderSearchTab()}
        </div>
      </div>
    </div>
  );
};