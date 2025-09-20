// AI Training Dashboard Component
// Manages vector database training data, monitors performance, and configures pipeline settings

import React, { useState, useEffect } from 'react';
import { aiTrainingDataPipeline, PipelineJob, PipelineStats } from '../utils/aiTrainingDataPipeline';
import { aiSimilaritySearchService } from '../utils/aiSimilaritySearchService';

interface AITrainingDashboardProps {
  companyId: string;
  onClose: () => void;
}

export const AITrainingDashboard: React.FC<AITrainingDashboardProps> = ({ companyId, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'search' | 'settings'>('overview');
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [activeJobs, setActiveJobs] = useState<PipelineJob[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoProcessingEnabled, setAutoProcessingEnabled] = useState(false);

  // Pipeline configuration
  const [pipelineConfig, setPipelineConfig] = useState({
    batchSize: 25,
    qualityThreshold: 0.3,
    autoProcessingInterval: 60, // minutes
    realTimeProcessing: true,
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [companyId]);

  const loadDashboardData = async () => {
    try {
      // Load pipeline statistics
      const stats = aiTrainingDataPipeline.getStats();
      setPipelineStats(stats);

      // Load system health
      const health = aiTrainingDataPipeline.getSystemHealth();
      setSystemHealth(health);

      // Load active jobs (in a real implementation, this would query the database)
      // For now, we'll show mock data
      setActiveJobs([]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const startBatchProcessing = async () => {
    setIsProcessing(true);
    try {
      const result = await aiTrainingDataPipeline.processBatchLeads(companyId, {
        batchSize: pipelineConfig.batchSize,
        minQualityScore: pipelineConfig.qualityThreshold,
        onProgress: (progress) => {
          console.log(`Processing progress: ${progress.processed}/${progress.total}`);
        },
      });

      if (result.success) {
        console.log(`Batch processing started with job ID: ${result.jobId}`);
        loadDashboardData(); // Refresh data
      } else {
        console.error('Failed to start batch processing:', result.error);
      }
    } catch (error) {
      console.error('Error starting batch processing:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const enableAutoProcessing = async () => {
    try {
      const success = aiTrainingDataPipeline.enableAutoProcessing(companyId, {
        realTimeEnabled: pipelineConfig.realTimeProcessing,
        batchInterval: pipelineConfig.autoProcessingInterval,
        qualityThreshold: pipelineConfig.qualityThreshold,
      });

      if (success) {
        setAutoProcessingEnabled(true);
        console.log('Auto-processing enabled successfully');
      }
    } catch (error) {
      console.error('Error enabling auto-processing:', error);
    }
  };

  const performSimilaritySearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const results = await aiSimilaritySearchService.searchSimilarContent(
        searchQuery,
        companyId,
        { maxResults: 10, minSimilarity: 0.7 }
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Error performing similarity search:', error);
      setSearchResults([]);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* System Health */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-blue-600">📊</span>
          System Health
        </h3>
        {systemHealth && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                systemHealth.status === 'healthy' ? 'bg-green-100 text-green-800' : 
                systemHealth.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              }`}>
                {systemHealth.status.toUpperCase()}
              </span>
              <span className="text-sm text-gray-600">
                {systemHealth.metrics.activeJobs} active jobs, 
                {Math.round(systemHealth.metrics.errorRate * 100)}% error rate
              </span>
            </div>
            
            {systemHealth.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Recommendations:</h4>
                {systemHealth.recommendations.map((rec: string, index: number) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-amber-600">
                    <span>⚠️</span>
                    {rec}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pipeline Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-green-600">📈</span>
          Pipeline Statistics
        </h3>
        {pipelineStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {pipelineStats.totalVectorsCreated.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Vectors Created</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {pipelineStats.successfulJobs}
              </div>
              <div className="text-sm text-gray-600">Successful Jobs</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {pipelineStats.totalTokensUsed.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Tokens Used</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                ${pipelineStats.totalCost.toFixed(3)}
              </div>
              <div className="text-sm text-gray-600">Total Cost</div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={startBatchProcessing}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>▶️</span>
            {isProcessing ? 'Processing...' : 'Start Batch Processing'}
          </button>
          
          <button 
            onClick={enableAutoProcessing}
            disabled={autoProcessingEnabled}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>⚙️</span>
            {autoProcessingEnabled ? 'Auto-Processing Active' : 'Enable Auto-Processing'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">AI Training Dashboard</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {renderOverview()}
        </div>
      </div>
    </div>
  );
};

interface AITrainingDashboardProps {
  companyId: string;
  onClose: () => void;
}

export const AITrainingDashboard: React.FC<AITrainingDashboardProps> = ({ companyId, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'search' | 'settings'>('overview');
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [activeJobs, setActiveJobs] = useState<PipelineJob[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoProcessingEnabled, setAutoProcessingEnabled] = useState(false);

  // Pipeline configuration
  const [pipelineConfig, setPipelineConfig] = useState({
    batchSize: 25,
    qualityThreshold: 0.3,
    autoProcessingInterval: 60, // minutes
    realTimeProcessing: true,
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [companyId]);

  const loadDashboardData = async () => {
    try {
      // Load pipeline statistics
      const stats = aiTrainingDataPipeline.getStats();
      setPipelineStats(stats);

      // Load system health
      const health = aiTrainingDataPipeline.getSystemHealth();
      setSystemHealth(health);

      // Load active jobs (in a real implementation, this would query the database)
      // For now, we'll show mock data
      setActiveJobs([]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const startBatchProcessing = async () => {
    setIsProcessing(true);
    try {
      const result = await aiTrainingDataPipeline.processBatchLeads(companyId, {
        batchSize: pipelineConfig.batchSize,
        minQualityScore: pipelineConfig.qualityThreshold,
        onProgress: (progress) => {
          console.log(`Processing progress: ${progress.processed}/${progress.total}`);
        },
      });

      if (result.success) {
        console.log(`Batch processing started with job ID: ${result.jobId}`);
        loadDashboardData(); // Refresh data
      } else {
        console.error('Failed to start batch processing:', result.error);
      }
    } catch (error) {
      console.error('Error starting batch processing:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const enableAutoProcessing = async () => {
    try {
      const success = aiTrainingDataPipeline.enableAutoProcessing(companyId, {
        realTimeEnabled: pipelineConfig.realTimeProcessing,
        batchInterval: pipelineConfig.autoProcessingInterval,
        qualityThreshold: pipelineConfig.qualityThreshold,
      });

      if (success) {
        setAutoProcessingEnabled(true);
        console.log('Auto-processing enabled successfully');
      }
    } catch (error) {
      console.error('Error enabling auto-processing:', error);
    }
  };

  const performSimilaritySearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const results = await aiSimilaritySearchService.searchSimilarContent(
        searchQuery,
        companyId,
        { limit: 10, threshold: 0.7 }
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Error performing similarity search:', error);
      setSearchResults([]);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          {systemHealth && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={systemHealth.status === 'healthy' ? 'success' : 
                          systemHealth.status === 'warning' ? 'warning' : 'destructive'}
                >
                  {systemHealth.status.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-600">
                  {systemHealth.metrics.activeJobs} active jobs, 
                  {Math.round(systemHealth.metrics.errorRate * 100)}% error rate
                </span>
              </div>
              
              {systemHealth.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Recommendations:</h4>
                  {systemHealth.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-amber-600">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {rec}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Pipeline Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pipelineStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {pipelineStats.totalVectorsCreated.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Vectors Created</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {pipelineStats.successfulJobs}
                </div>
                <div className="text-sm text-gray-600">Successful Jobs</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {pipelineStats.totalTokensUsed.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Tokens Used</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  ${pipelineStats.totalCost.toFixed(3)}
                </div>
                <div className="text-sm text-gray-600">Total Cost</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={startBatchProcessing}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isProcessing ? 'Processing...' : 'Start Batch Processing'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={enableAutoProcessing}
              disabled={autoProcessingEnabled}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              {autoProcessingEnabled ? 'Auto-Processing Active' : 'Enable Auto-Processing'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPipeline = () => (
    <div className="space-y-6">
      {/* Active Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Active Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {activeJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active jobs currently running
            </div>
          ) : (
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{job.jobType.replace('_', ' ').toUpperCase()}</div>
                    <Badge variant={job.status === 'running' ? 'default' : 'secondary'}>
                      {job.status}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    Source: {job.contentSource} | Batch Size: {job.config.batchSize}
                  </div>
                  
                  <Progress 
                    value={(job.processedItems / job.totalItems) * 100}
                    className="h-2"
                  />
                  
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{job.processedItems}/{job.totalItems} processed</span>
                    <span>{job.failedItems} failed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Batch Size</label>
              <input
                type="number"
                min="1"
                max="100"
                value={pipelineConfig.batchSize}
                onChange={(e) => setPipelineConfig(prev => ({
                  ...prev,
                  batchSize: parseInt(e.target.value) || 25
                }))}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Quality Threshold</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={pipelineConfig.qualityThreshold}
                onChange={(e) => setPipelineConfig(prev => ({
                  ...prev,
                  qualityThreshold: parseFloat(e.target.value) || 0.3
                }))}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Auto-Processing Interval (minutes)</label>
              <input
                type="number"
                min="5"
                max="1440"
                value={pipelineConfig.autoProcessingInterval}
                onChange={(e) => setPipelineConfig(prev => ({
                  ...prev,
                  autoProcessingInterval: parseInt(e.target.value) || 60
                }))}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="realTimeProcessing"
                checked={pipelineConfig.realTimeProcessing}
                onChange={(e) => setPipelineConfig(prev => ({
                  ...prev,
                  realTimeProcessing: e.target.checked
                }))}
                className="rounded"
              />
              <label htmlFor="realTimeProcessing" className="text-sm font-medium">
                Enable Real-Time Processing
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSearch = () => (
    <div className="space-y-6">
      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Similarity Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter search query to find similar training content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && performSimilaritySearch()}
                className="flex-1 p-2 border rounded"
              />
              <Button onClick={performSimilaritySearch}>
                Search
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              Search through vectorized training data to find similar content, patterns, and insights.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{result.contentType}</div>
                    <Badge variant="outline">
                      {Math.round(result.similarity * 100)}% match
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    Lead: {result.leadName} | Company: {result.leadCompany}
                  </div>
                  
                  <div className="text-sm bg-gray-50 p-3 rounded">
                    {result.content.length > 200 
                      ? `${result.content.substring(0, 200)}...`
                      : result.content
                    }
                  </div>
                  
                  {result.metadata && (
                    <div className="mt-2 text-xs text-gray-500">
                      Quality Score: {result.metadata.qualityScore} | 
                      Created: {new Date(result.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Vector Database Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Database Status</h4>
              <div className="text-sm text-blue-700">
                Vector database is configured with pgvector extension.
                Currently storing {pipelineStats?.totalVectorsCreated || 0} vectors.
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">OpenAI Integration</h4>
              <div className="text-sm text-green-700">
                Using text-embedding-ada-002 model for generating 1536-dimensional embeddings.
                Total tokens used: {pipelineStats?.totalTokensUsed.toLocaleString() || 0}
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Cost Tracking</h4>
              <div className="text-sm text-yellow-700">
                Total cost: ${pipelineStats?.totalCost.toFixed(3) || '0.000'}
                Average cost per vector: ${((pipelineStats?.totalCost || 0) / (pipelineStats?.totalVectorsCreated || 1)).toFixed(5)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              Export Training Data
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Rebuild Vector Index
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Clear Low-Quality Vectors
            </Button>
            <Button variant="destructive" className="w-full justify-start">
              Reset All Training Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">AI Training Dashboard</h2>
          <Button variant="ghost" onClick={onClose}>
            ×
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex border-b">
          {[
            { key: 'overview', label: 'Overview', icon: TrendingUp },
            { key: 'pipeline', label: 'Pipeline', icon: Settings },
            { key: 'search', label: 'Search', icon: Brain },
            { key: 'settings', label: 'Settings', icon: Database },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'pipeline' && renderPipeline()}
          {activeTab === 'search' && renderSearch()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </div>
    </div>
  );
};