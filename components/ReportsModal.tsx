import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import { LeadAnalyticsEngine, LeadAnalytics } from '../utils/leadAnalytics';
import { XMarkIcon, ArrowDownTrayIcon, ChartBarIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon, PrinterIcon } from './icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  timePeriod: 'today' | 'week' | 'month' | 'year' | 'all';
}

const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose, leads, timePeriod }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'trends' | 'recommendations'>('overview');
  
  const analytics = useMemo(() => {
    return LeadAnalyticsEngine.generateComprehensiveReport(leads, timePeriod);
  }, [leads, timePeriod]);

  const handleExportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      timePeriod,
      analytics
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lead-report-${timePeriod}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    try {
      const modalElement = document.getElementById('reports-modal-content');
      if (!modalElement) {
        alert('Could not find report content to export');
        return;
      }

      // Create a temporary container for better PDF formatting
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px'; // A4 width in pixels at 96 DPI
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '40px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      
      // Clone the modal content
      const clonedContent = modalElement.cloneNode(true) as HTMLElement;
      
      // Remove the header with close button for PDF
      const header = clonedContent.querySelector('[data-pdf-exclude]');
      if (header) header.remove();
      
      // Clean up the content for PDF
      clonedContent.style.maxHeight = 'none';
      clonedContent.style.overflow = 'visible';
      clonedContent.style.padding = '0';
      clonedContent.style.backgroundColor = 'white';
      clonedContent.style.color = 'black';
      
      // Remove dark mode classes and make text black
      const allElements = clonedContent.querySelectorAll('*');
      allElements.forEach((el: any) => {
        el.className = el.className.replace(/dark:[^\s]*/g, '');
        if (el.style) {
          el.style.color = 'black';
          el.style.backgroundColor = 'white';
        }
      });
      
      // Add title
      const title = document.createElement('h1');
      title.textContent = `Lead Analytics Report - ${getTimePeriodLabel(timePeriod)}`;
      title.style.textAlign = 'center';
      title.style.marginBottom = '30px';
      title.style.fontSize = '24px';
      title.style.fontWeight = 'bold';
      
      const subtitle = document.createElement('p');
      subtitle.textContent = `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
      subtitle.style.textAlign = 'center';
      subtitle.style.marginBottom = '40px';
      subtitle.style.color = '#666';
      subtitle.style.fontSize = '14px';
      
      tempContainer.appendChild(title);
      tempContainer.appendChild(subtitle);
      tempContainer.appendChild(clonedContent);
      document.body.appendChild(tempContainer);

      // Generate the PDF
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: 'white',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 794,
        height: tempContainer.scrollHeight
      });

      document.body.removeChild(tempContainer);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`lead-analytics-report-${timePeriod}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const getTimePeriodLabel = (period: string) => {
    const labels = {
      'today': 'Today',
      'week': 'This Week',
      'month': 'This Month', 
      'year': 'This Year',
      'all': 'All Time'
    };
    return labels[period as keyof typeof labels] || period;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUpIcon className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDownIcon className="w-4 h-4 text-red-500" />;
      case 'stable': return <MinusIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatPercentageChange = (change: number) => {
    const abs = Math.abs(change);
    const sign = change >= 0 ? '+' : '-';
    const color = change >= 0 ? 'text-green-600' : 'text-red-600';
    return <span className={color}>{sign}{abs.toFixed(1)}%</span>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700" data-pdf-exclude>
          <div className="flex items-center gap-3">
            <ChartBarIcon className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                Lead Analytics Report
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Comprehensive analysis for {getTimePeriodLabel(timePeriod)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <PrinterIcon className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export JSON
            </button>
            <button
              onClick={onClose}
              title="Close Reports"
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'sources', label: 'Source Analysis' },
              { id: 'trends', label: 'Trends' },
              { id: 'recommendations', label: 'AI Recommendations' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div id="reports-modal-content" className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-slate-800 dark:text-white">
                    {analytics.overview.totalLeads}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Total Leads</div>
                  <div className="text-xs mt-1">
                    {formatPercentageChange(analytics.overview.periodComparison.percentageChange)} vs previous period
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-slate-800 dark:text-white">
                    {analytics.overview.conversionRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Conversion Rate</div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-slate-800 dark:text-white">
                    {analytics.overview.averageTimeToConversion.toFixed(0)}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Avg Days to Convert</div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                  <div className="text-lg font-bold text-slate-800 dark:text-white truncate">
                    {analytics.overview.topPerformingSource}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Top Source</div>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Lead Status Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {analytics.statusDistribution.map((status) => (
                    <div key={status.status} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded">
                      <div>
                        <div className="font-medium text-slate-800 dark:text-white">{status.status}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">{status.percentage.toFixed(1)}%</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-800 dark:text-white">{status.count}</span>
                        {getTrendIcon(status.trend)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insights */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">AI Insights</h3>
                <div className="space-y-3">
                  {analytics.insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-slate-700 dark:text-slate-300">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Lead Source Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 dark:border-slate-700 rounded-lg">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Source</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Leads</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Percentage</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Conversion Rate</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Avg Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {analytics.sourceAnalysis.map((source, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-4 py-3 text-sm text-slate-800 dark:text-white font-medium">{source.source}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{source.count}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{source.percentage.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{source.conversionRate.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">${source.averageValue.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Temporal Trends</h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 dark:border-slate-700 rounded-lg">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Period</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">New Leads</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Conversions</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {analytics.temporalTrends.map((trend, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-4 py-3 text-sm text-slate-800 dark:text-white font-medium">{trend.period}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{trend.leads}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{trend.conversions}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{trend.conversionRate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">AI-Powered Recommendations</h3>
              <div className="space-y-4">
                {analytics.recommendations.map((recommendation, index) => (
                  <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-sm font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-slate-800 dark:text-white font-medium">Recommendation {index + 1}</p>
                        <p className="text-slate-600 dark:text-slate-300 mt-1">{recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {analytics.recommendations.length === 0 && (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <ChartBarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No specific recommendations available at this time.</p>
                  <p className="text-sm">Continue monitoring lead performance for insights.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;