import React from 'react';
import { AIInsights } from '../types';
import { XMarkIcon, LightBulbIcon, ScaleIcon, ClockIcon, MapPinIcon, CurrencyDollarIcon, ExclamationTriangleIcon, PrinterIcon, ArrowDownTrayIcon } from './icons';

interface DetailedInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  insights: AIInsights | null;
  leadName: string;
}

const DetailedInsightsModal: React.FC<DetailedInsightsModalProps> = ({
  isOpen,
  onClose,
  insights,
  leadName
}) => {
  if (!isOpen || !insights) return null;

  const handleDownloadPDF = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Build HTML content for PDF export
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Insights Report - ${leadName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; line-height: 1.6; }
          .header { border-bottom: 3px solid #14b8a6; padding-bottom: 15px; margin-bottom: 30px; }
          .header h1 { color: #14b8a6; margin: 0; font-size: 28px; }
          .header .lead-name { color: #666; font-size: 18px; margin-top: 5px; }
          .section { margin-bottom: 25px; }
          .section h2 { color: #14b8a6; margin-bottom: 15px; font-size: 20px; border-bottom: 1px solid #e5e5e5; padding-bottom: 5px; }
          .section h3 { color: #333; margin-bottom: 10px; font-size: 16px; }
          .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .overview-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #14b8a6; }
          .score { font-size: 24px; font-weight: bold; color: #14b8a6; }
          .justification { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .pain-points { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .next-steps { background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .legal-case { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .legal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .legal-item { margin-bottom: 10px; }
          .legal-item strong { display: inline-block; width: 120px; color: #92400e; }
          ul, ol { padding-left: 20px; }
          li { margin-bottom: 8px; }
          .urgency-critical { color: #dc2626; font-weight: bold; }
          .urgency-high { color: #ea580c; font-weight: bold; }
          .urgency-medium { color: #ca8a04; font-weight: bold; }
          .urgency-low { color: #16a34a; font-weight: bold; }
          @media print { 
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AI Insights Report</h1>
          <div class="lead-name">${leadName}</div>
          <p style="color: #666; margin-top: 10px;">Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="overview-grid">
          <div class="overview-item">
            <h3>Qualification Score</h3>
            <div class="score">${insights.qualificationScore}/100</div>
          </div>
          <div class="overview-item">
            <h3>Service Type</h3>
            <div style="font-weight: bold; text-transform: capitalize;">${insights.serviceType || 'General'}</div>
          </div>
        </div>
        
        <div class="section">
          <h2>Analysis Overview</h2>
          <div class="justification">
            <h3>Qualification Justification</h3>
            <p>${insights.justification}</p>
          </div>
        </div>
    `;
    
    // Add detailed analysis if available
    if (insights.detailedAnalysis) {
      htmlContent += `
        <div class="section">
          <h2>Detailed Analysis</h2>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <p>${insights.detailedAnalysis}</p>
          </div>
        </div>
      `;
    }
    
    // Add pain points
    if (insights.keyPainPoints && insights.keyPainPoints.length > 0) {
      htmlContent += `
        <div class="section">
          <h2>Key Pain Points</h2>
          <div class="pain-points">
            <ul>
              ${insights.keyPainPoints.map(point => `<li>${point}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    }
    
    // Add next steps
    if (insights.suggestedNextSteps && insights.suggestedNextSteps.length > 0) {
      htmlContent += `
        <div class="section">
          <h2>Suggested Next Steps</h2>
          <div class="next-steps">
            <ol>
              ${insights.suggestedNextSteps.map(step => `<li>${step}</li>`).join('')}
            </ol>
          </div>
        </div>
      `;
    }
    
    // Add legal case details if available
    if (insights.serviceType === 'legal' && insights.legalSpecific) {
      const legal = insights.legalSpecific;
      const urgencyClass = legal.urgencyLevel ? `urgency-${legal.urgencyLevel}` : '';
      
      htmlContent += `
        <div class="section">
          <h2>Legal Case Analysis</h2>
          <div class="legal-case">
            <div class="legal-grid">
              <div class="legal-item"><strong>Case Type:</strong> ${legal.caseType || 'N/A'}</div>
              <div class="legal-item"><strong>Case Number:</strong> ${legal.caseNumber || 'N/A'}</div>
              <div class="legal-item"><strong>Urgency:</strong> <span class="${urgencyClass}">${legal.urgencyLevel || 'N/A'}</span></div>
              <div class="legal-item"><strong>Potential Value:</strong> ${legal.potentialValue || 'N/A'}</div>
              <div class="legal-item"><strong>Jurisdiction:</strong> ${legal.jurisdiction || 'N/A'}</div>
              <div class="legal-item"><strong>Timeline:</strong> ${legal.timelineEstimate || 'N/A'}</div>
            </div>
          </div>
        </div>
      `;
    }
    
    htmlContent += `
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handlePrintReport = () => {
    handleDownloadPDF();
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 dark:text-red-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[70]" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] m-4 relative animate-fade-in-up overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
              <LightBulbIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Insights Report</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">{leadName}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            title="Close modal"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Overview Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Qualification Score */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                  <ScaleIcon className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Qualification Score
                </h3>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(insights.qualificationScore)}`}>
                    {insights.qualificationScore}/100
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{insights.justification}</p>
                </div>
              </div>

              {/* Service Type */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Service Type</h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    insights.serviceType === 'legal' 
                      ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
                      : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                  }`}>
                    {insights.serviceType?.charAt(0).toUpperCase() + insights.serviceType?.slice(1) || 'General'}
                  </span>
                </div>
              </div>
            </div>

            {/* Legal-Specific Information */}
            {insights.legalSpecific && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <ScaleIcon className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                  Legal Case Analysis
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {insights.legalSpecific.caseType && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm">Case Type</h4>
                      <p className="text-slate-700 dark:text-slate-300">{insights.legalSpecific.caseType}</p>
                    </div>
                  )}
                  
                  {insights.legalSpecific.caseNumber && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm">Case Number</h4>
                      <p className="text-slate-700 dark:text-slate-300 font-mono">{insights.legalSpecific.caseNumber}</p>
                    </div>
                  )}
                  
                  {insights.legalSpecific.urgencyLevel && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm flex items-center">
                        <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                        Urgency Level
                      </h4>
                      <p className={`font-medium ${getUrgencyColor(insights.legalSpecific.urgencyLevel)}`}>
                        {insights.legalSpecific.urgencyLevel?.charAt(0).toUpperCase() + insights.legalSpecific.urgencyLevel?.slice(1)}
                      </p>
                    </div>
                  )}
                  
                  {insights.legalSpecific.potentialValue && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm flex items-center">
                        <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                        Potential Value
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300">{insights.legalSpecific.potentialValue}</p>
                    </div>
                  )}
                  
                  {insights.legalSpecific.jurisdiction && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm flex items-center">
                        <MapPinIcon className="w-4 h-4 mr-1" />
                        Jurisdiction
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300">{insights.legalSpecific.jurisdiction}</p>
                    </div>
                  )}
                  
                  {insights.legalSpecific.timelineEstimate && (
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        Timeline Estimate
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300">{insights.legalSpecific.timelineEstimate}</p>
                    </div>
                  )}
                </div>
                
                {insights.legalSpecific.legalIssue && (
                  <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
                    <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-2">Primary Legal Issue</h4>
                    <p className="text-slate-700 dark:text-slate-300">{insights.legalSpecific.legalIssue}</p>
                  </div>
                )}
              </div>
            )}

            {/* Detailed Analysis */}
            {insights.detailedAnalysis && (
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Detailed Analysis</h3>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {insights.detailedAnalysis}
                  </p>
                </div>
              </div>
            )}

            {/* Key Pain Points */}
            {insights.keyPainPoints && insights.keyPainPoints.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Key Pain Points</h3>
                <ul className="space-y-2">
                  {insights.keyPainPoints.map((point, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-slate-700 dark:text-slate-300">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Next Steps */}
            {insights.suggestedNextSteps && insights.suggestedNextSteps.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Suggested Next Steps</h3>
                <ol className="space-y-2">
                  {insights.suggestedNextSteps.map((step, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-6">
          <div className="flex justify-between items-center">
            {/* Export buttons on the left */}
            <div className="flex space-x-3">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={handlePrintReport}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                <PrinterIcon className="w-4 h-4 mr-2" />
                Print
              </button>
            </div>
            
            {/* Close button on the right */}
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedInsightsModal;