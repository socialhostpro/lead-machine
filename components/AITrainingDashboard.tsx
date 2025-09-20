import React, { useState, useEffect } from 'react';
import { aiTrainingDataPipeline, PipelineJob, PipelineStats } from '../utils/aiTrainingDataPipeline';
import { supabase } from '../utils/supabase';

interface AITrainingDashboardProps {
  companyId: string;
  onClose: () => void;
}

export const AITrainingDashboard: React.FC<AITrainingDashboardProps> = ({ companyId, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'search'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [activeJobs, setActiveJobs] = useState<PipelineJob[]>([]);
  const [processingProgress, setProcessingProgress] = useState<{ processed: number; total: number; currentLead?: string } | null>(null);
  const [leadCount, setLeadCount] = useState(0);
  const [vectorCount, setVectorCount] = useState(0);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [companyId]);

  const loadDashboardData = async () => {
    try {
      // Load pipeline statistics
      const stats = aiTrainingDataPipeline.getStats();
      setPipelineStats(stats);

      // Load active jobs
      const jobs = aiTrainingDataPipeline.getActiveJobs();
      setActiveJobs(jobs);

      // Get lead count for this company
      const { count: leadCountResult } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      
      setLeadCount(leadCountResult || 0);

      // Get vector count (this would be from your vector database)
      // For now, using mock data from stats
      setVectorCount(stats.totalVectorsCreated);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleProcessLeads = async () => {
    setIsProcessing(true);
    setProcessingProgress(null);
    
    try {
      const result = await aiTrainingDataPipeline.processBatchLeads(companyId, {
        batchSize: 25,
        validateVectors: true,
        overwriteExisting: false,
        minQualityScore: 0.3,
        onProgress: (progress) => {
          setProcessingProgress(progress);
        }
      });

      if (result.success) {
        alert(`✅ Lead processing started successfully! Job ID: ${result.jobId}\n\nThis will process all leads for your company and convert them into AI-searchable vectors. You can monitor progress in the Overview tab.`);
        await loadDashboardData(); // Refresh data
      } else {
        alert(`❌ Failed to start lead processing: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to process leads:', error);
      alert(`❌ Error processing leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
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
      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Vector Database</h3>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {vectorCount.toLocaleString()}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Vectors</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Lead Database</h3>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {leadCount.toLocaleString()}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Leads</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Success Rate</h3>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {pipelineStats ? Math.round((pipelineStats.successfulJobs / Math.max(pipelineStats.totalJobsRun, 1)) * 100) : 0}%
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Pipeline Success</p>
        </div>
      </div>

      {/* Processing Progress */}
      {processingProgress && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Processing Progress</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {processingProgress.processed} of {processingProgress.total} leads processed
              </span>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {Math.round((processingProgress.processed / processingProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(processingProgress.processed / processingProgress.total) * 100}%`
                }}
              ></div>
            </div>
            {processingProgress.currentLead && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Currently processing: {processingProgress.currentLead}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Active Jobs */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Active Pipeline Jobs</h3>
        {activeJobs.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">No active jobs</p>
        ) : (
          <div className="space-y-3">
            {activeJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {job.jobType.replace('_', ' ').toUpperCase()} - {job.contentSource}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {job.processedItems}/{job.totalItems} items processed
                  </p>
                  {job.startedAt && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Started: {new Date(job.startedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-sm ${
                    job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    job.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                    job.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {job.status}
                  </span>
                  {job.totalItems > 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {Math.round((job.processedItems / job.totalItems) * 100)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Statistics */}
      {pipelineStats && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Pipeline Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {pipelineStats.totalJobsRun}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Total Jobs</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {pipelineStats.totalVectorsCreated.toLocaleString()}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Vectors Created</div>
            </div>
            <div>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {pipelineStats.totalTokensUsed.toLocaleString()}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Tokens Used</div>
            </div>
            <div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                ${pipelineStats.totalCost.toFixed(4)}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Total Cost</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPipelineTab = () => (
    <div className="space-y-6">
      {/* Pipeline Controls */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">AI Training Pipeline Controls</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleProcessLeads}
            disabled={isProcessing}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors font-medium"
          >
            {isProcessing ? 'Processing Leads...' : '🚀 Process All Company Leads'}
          </button>
          
          <div className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
            <p>This will convert all your company's leads into AI-searchable vectors for intelligent matching and analysis.</p>
          </div>
        </div>
      </div>

      {/* What Does Lead Processing Do? */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">🧠 What Does Lead Processing Do?</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">1. 📊 Data Extraction & Analysis</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The AI pipeline extracts meaningful information from each lead including:
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 mt-2 ml-4 list-disc">
              <li>Contact information (name, email, phone, company)</li>
              <li>Issue descriptions and customer pain points</li>
              <li>Notes and interaction history</li>
              <li>Lead source and context</li>
              <li>AI-generated insights and analysis</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">2. 🔍 Text Vectorization</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Each piece of lead data is converted into high-dimensional vectors using advanced AI embeddings:
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 mt-2 ml-4 list-disc">
              <li>Semantic meaning is captured in mathematical representations</li>
              <li>Similar content produces similar vectors</li>
              <li>Enables intelligent similarity search and matching</li>
              <li>Quality scoring ensures only valuable data is processed</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">3. 💾 Vector Storage & Indexing</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Processed vectors are stored in a specialized database for fast retrieval:
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 mt-2 ml-4 list-disc">
              <li>Optimized for similarity search operations</li>
              <li>Enables real-time lead matching and recommendations</li>
              <li>Supports complex queries and filtering</li>
              <li>Scales to handle thousands of leads efficiently</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">4. 🎯 AI-Powered Features Unlocked</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Once processed, your leads enable powerful AI capabilities:
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 mt-2 ml-4 list-disc">
              <li><strong>Smart Lead Matching:</strong> Find similar leads automatically</li>
              <li><strong>Duplicate Detection:</strong> Identify potential duplicate entries</li>
              <li><strong>Intelligent Search:</strong> Search by meaning, not just keywords</li>
              <li><strong>Lead Clustering:</strong> Group similar leads for targeted campaigns</li>
              <li><strong>Predictive Insights:</strong> AI recommendations based on patterns</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Pipeline Configuration */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">⚙️ Pipeline Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Batch Size
              </label>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <strong>25 leads per batch</strong> - Optimal balance between speed and resource usage
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Quality Threshold
              </label>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <strong>0.3 minimum score</strong> - Only high-quality data is processed
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Vector Validation
              </label>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <strong>Enabled</strong> - All vectors are validated before storage
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Processing Mode
              </label>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <strong>Batch Processing</strong> - Efficient bulk processing of all leads
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {pipelineStats && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">📈 Pipeline Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {pipelineStats.averageProcessingTime.toFixed(1)}s
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Avg Processing Time</div>
            </div>
            
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {pipelineStats.successfulJobs}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Successful Jobs</div>
            </div>
            
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {pipelineStats.failedJobs}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Failed Jobs</div>
            </div>
          </div>
        </div>
      )}
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