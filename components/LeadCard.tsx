import React, { useState, useEffect, useRef } from 'react';
import { Lead, LeadStatus, LeadSource, Note } from '../types';
import { BuildingOfficeIcon, UserIcon, PhoneIcon, PencilIcon, TrashIcon, ChatBubbleLeftIcon, EnvelopeIcon, ClipboardIcon, CheckIcon, ArrowDownTrayIcon, PaperAirplaneIcon, ArrowPathIcon, LightBulbIcon, PrinterIcon, ChevronDownIcon } from './icons';
import StatusBadge from './StatusBadge';
import CollapsibleSection from './CollapsibleSection';
import ConfirmationModal from './ConfirmationModal';
import ElevenLabsAudioPlayer from './ElevenLabsAudioPlayer';
import EmailModal from './EmailModal';
import { getTimeBasedStatus, getTimeBasedColorClass, formatTimeDifference } from '../utils/callerTracking';

interface LeadCardProps {
  lead: Lead;
  elevenlabsApiKey?: string;
  onUpdateLead: (updatedLead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onOpenEditModal: (lead: Lead) => void;
  onOpenAddNoteModal: (lead: Lead) => void;
  onSendToWebhook: (lead: Lead) => Promise<void>;
  onGenerateInsights: (lead: Lead) => Promise<void>;
  onSendEmail?: (lead: Lead) => Promise<void>;
  onOpenDetailedInsights?: (lead: Lead) => void;
  onOpenActivityModal?: (leadId: string) => void;
  isHighlighted?: boolean;
  userEmail?: string;
  companyId?: string;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, elevenlabsApiKey, onUpdateLead, onDeleteLead, onOpenEditModal, onOpenAddNoteModal, onSendToWebhook, onGenerateInsights, onSendEmail, onOpenDetailedInsights, onOpenActivityModal, isHighlighted, userEmail, companyId }) => {
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isContactModalOpen, setContactModalOpen] = useState(false);
  const [isEmailModalOpen, setEmailModalOpen] = useState(false);
  const [isExportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [copiedItem, setCopiedItem] = useState<'email' | 'phone' | null>(null);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExportDropdownOpen) {
        const target = event.target as Element;
        const dropdown = target.closest('.export-dropdown');
        if (!dropdown) {
          setExportDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportDropdownOpen]);

  // Handle dropdown positioning to prevent overflow
  const handleDropdownOpen = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const dropdownHeight = 100; // Approximate height of dropdown
      
      // If not enough space below, position above
      if (spaceBelow < dropdownHeight) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
    setExportDropdownOpen(!isExportDropdownOpen);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateLead({ ...lead, status: e.target.value as LeadStatus });
  };

  const handleConfirmDelete = () => {
    onDeleteLead(lead.id);
  };
  
  const handleContactAction = () => {
      onUpdateLead({ ...lead, status: LeadStatus.CONTACTED });
  };
  
  const handleCopy = (text: string, item: 'email' | 'phone') => {
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedItem(item);
        setTimeout(() => setCopiedItem(null), 2000);
      });
    }
  };
  
  const handleDownloadCSV = () => {
    // Prepare CSV data
    const headers = [
      'First Name', 'Last Name', 'Company', 'Email', 'Phone', 'Status', 
      'Source', 'Created Date', 'Issue Description', 'Notes Count'
    ];
    
    // Add AI Insights headers if available
    if (lead.aiInsights) {
      headers.push('Qualification Score', 'Key Pain Points', 'Suggested Next Steps');
      if (lead.aiInsights.serviceType === 'legal' && lead.aiInsights.legalSpecific) {
        headers.push('Case Type', 'Case Number', 'Urgency Level', 'Potential Value');
      }
    }
    
    // Add Call Details headers if available
    if (lead.callDetails) {
      headers.push('Call Summary', 'Call Date', 'Call Duration (min)');
    }
    
    const csvData = [headers];
    
    // Prepare row data
    const row = [
      lead.firstName || '',
      lead.lastName || '',
      lead.company || '',
      lead.email || '',
      lead.phone || '',
      lead.status || '',
      lead.source || '',
      new Date(lead.createdAt).toLocaleDateString(),
      lead.issueDescription || '',
      lead.notes?.length.toString() || '0'
    ];
    
    // Add AI Insights data
    if (lead.aiInsights) {
      row.push(
        lead.aiInsights.qualificationScore?.toString() || '',
        lead.aiInsights.keyPainPoints?.join('; ') || '',
        lead.aiInsights.suggestedNextSteps?.join('; ') || ''
      );
      if (lead.aiInsights.serviceType === 'legal' && lead.aiInsights.legalSpecific) {
        row.push(
          lead.aiInsights.legalSpecific.caseType || '',
          lead.aiInsights.legalSpecific.caseNumber || '',
          lead.aiInsights.legalSpecific.urgencyLevel || '',
          lead.aiInsights.legalSpecific.potentialValue || ''
        );
      }
    }
    
    // Add Call Details data
    if (lead.callDetails) {
      row.push(
        lead.callDetails.summaryTitle || '',
        lead.callDetails.callStartTime ? new Date(lead.callDetails.callStartTime).toLocaleDateString() : '',
        lead.callDetails.callDuration ? Math.round(lead.callDetails.callDuration / 60).toString() : ''
      );
    }
    
    csvData.push(row);
    
    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (lead.firstName + '_' + lead.lastName).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `lead_${safeName}_${lead.id.substring(0, 8)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportDropdownOpen(false);
  };

  const handlePrintPDF = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const safeName = `${lead.firstName} ${lead.lastName}`.trim() || 'Lead';
    
    // Build HTML content for printing
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lead Details - ${safeName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { border-bottom: 2px solid #14b8a6; padding-bottom: 10px; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section h3 { color: #14b8a6; margin-bottom: 10px; }
          .field { margin-bottom: 8px; }
          .field strong { display: inline-block; width: 150px; }
          .notes { background: #f8f9fa; padding: 10px; border-radius: 5px; }
          .ai-insights { background: #f0f9ff; padding: 15px; border-radius: 5px; border-left: 4px solid #14b8a6; }
          .legal-case { background: #fef3c7; padding: 10px; border-radius: 5px; margin-top: 10px; }
          .call-details { background: #f3f4f6; padding: 15px; border-radius: 5px; }
          @media print { 
            body { margin: 0; } 
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Lead Details: ${safeName}</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="section">
          <h3>Contact Information</h3>
          <div class="field"><strong>Name:</strong> ${lead.firstName} ${lead.lastName}</div>
          <div class="field"><strong>Company:</strong> ${lead.company || 'N/A'}</div>
          <div class="field"><strong>Email:</strong> ${lead.email}</div>
          <div class="field"><strong>Phone:</strong> ${lead.phone || 'N/A'}</div>
          <div class="field"><strong>Status:</strong> ${lead.status}</div>
          <div class="field"><strong>Source:</strong> ${lead.source}</div>
          <div class="field"><strong>Created:</strong> ${new Date(lead.createdAt).toLocaleString()}</div>
        </div>
    `;
    
    if (lead.issueDescription) {
      htmlContent += `
        <div class="section">
          <h3>Issue Description</h3>
          <p>${lead.issueDescription}</p>
        </div>
      `;
    }
    
    if (lead.aiInsights) {
      htmlContent += `
        <div class="section">
          <h3>AI Insights</h3>
          <div class="ai-insights">
            <div class="field"><strong>Qualification Score:</strong> ${lead.aiInsights.qualificationScore}/100</div>
            <div class="field"><strong>Justification:</strong> ${lead.aiInsights.justification}</div>
            <div class="field"><strong>Key Pain Points:</strong> ${lead.aiInsights.keyPainPoints?.join(', ') || 'None identified'}</div>
            <div class="field"><strong>Suggested Next Steps:</strong> ${lead.aiInsights.suggestedNextSteps?.join(', ') || 'None provided'}</div>
      `;
      
      if (lead.aiInsights.serviceType === 'legal' && lead.aiInsights.legalSpecific) {
        htmlContent += `
            <div class="legal-case">
              <h4>Legal Case Details</h4>
              <div class="field"><strong>Case Type:</strong> ${lead.aiInsights.legalSpecific.caseType || 'N/A'}</div>
              <div class="field"><strong>Case Number:</strong> ${lead.aiInsights.legalSpecific.caseNumber || 'N/A'}</div>
              <div class="field"><strong>Urgency Level:</strong> ${lead.aiInsights.legalSpecific.urgencyLevel || 'N/A'}</div>
              <div class="field"><strong>Potential Value:</strong> ${lead.aiInsights.legalSpecific.potentialValue || 'N/A'}</div>
              <div class="field"><strong>Jurisdiction:</strong> ${lead.aiInsights.legalSpecific.jurisdiction || 'N/A'}</div>
              <div class="field"><strong>Timeline Estimate:</strong> ${lead.aiInsights.legalSpecific.timelineEstimate || 'N/A'}</div>
            </div>
        `;
      }
      
      htmlContent += `</div></div>`;
    }
    
    if (lead.callDetails) {
      htmlContent += `
        <div class="section">
          <h3>Call Details</h3>
          <div class="call-details">
            <div class="field"><strong>Summary:</strong> ${lead.callDetails.summaryTitle}</div>
            <div class="field"><strong>Transcript:</strong> ${lead.callDetails.transcriptSummary}</div>
            <div class="field"><strong>Date:</strong> ${lead.callDetails.callStartTime ? new Date(lead.callDetails.callStartTime).toLocaleString() : 'N/A'}</div>
            <div class="field"><strong>Duration:</strong> ${lead.callDetails.callDuration ? Math.round(lead.callDetails.callDuration / 60) + ' minutes' : 'N/A'}</div>
          </div>
        </div>
      `;
    }
    
    if (lead.notes && lead.notes.length > 0) {
      htmlContent += `
        <div class="section">
          <h3>Notes (${lead.notes.length})</h3>
          <div class="notes">
      `;
      lead.notes.forEach((note, index) => {
        htmlContent += `
          <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #ddd;">
            <strong>Note ${index + 1}:</strong> ${note.text}<br>
            <small>Added on ${new Date(note.createdAt).toLocaleString()}</small>
          </div>
        `;
      });
      htmlContent += `</div></div>`;
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
    setExportDropdownOpen(false);
  };
  
  const handleWebhookClick = async () => {
    setIsSendingWebhook(true);
    try {
        await onSendToWebhook(lead);
    } finally {
        setIsSendingWebhook(false);
    }
  };

  const handleGenerateInsightsClick = async () => {
    setIsGeneratingInsights(true);
    try {
      await onGenerateInsights(lead);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleEmailClick = async () => {
    if (onSendEmail) {
      setIsSendingEmail(true);
      try {
        await onSendEmail(lead);
      } finally {
        setIsSendingEmail(false);
      }
    } else {
      // Fallback to old modal behavior if no direct email function provided
      setEmailModalOpen(true);
    }
  };

  const scoreColor = (score: number) => {
      if (score > 75) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/20';
      if (score > 40) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/20';
      return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20';
  };

  // Calculate time-based status and colors
  const lastContactTime = lead.lastContactTime || lead.callDetails?.callStartTime || lead.createdAt;
  const timeBasedStatus = getTimeBasedStatus(lastContactTime);
  const cardBackgroundClass = getTimeBasedColorClass(timeBasedStatus, lead.status);
  const timeDifferenceText = formatTimeDifference(lastContactTime);

  // Helper function to display email properly
  const getDisplayEmail = (email: string) => {
    if (!email || email === 'N/A' || email.startsWith('conv_') || email.includes('@imported-lead.com')) {
      return 'None';
    }
    return email;
  };

  // Helper function to check if email is valid for actions
  const isValidEmail = (email: string) => {
    return email && email !== 'N/A' && !email.startsWith('conv_') && !email.includes('@imported-lead.com');
  };

  const cardTitle = lead.source === LeadSource.INCOMING_CALL && lead.firstName === 'Unknown' && lead.callDetails?.summaryTitle
    ? lead.callDetails.summaryTitle
    : `${lead.firstName} ${lead.lastName}`;

  return (
    <>
      <div id={`lead-card-${lead.id}`} className={`${cardBackgroundClass} p-4 rounded-lg shadow-md dark:shadow-lg border flex flex-col gap-4 transition-all duration-500 overflow-hidden ${isHighlighted ? 'ring-2 ring-teal-500 ring-offset-4 ring-offset-slate-50 dark:ring-offset-slate-900' : ''}`}>
        {/* Header */}
        <div className="flex justify-between items-start min-w-0">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate max-w-full" title={cardTitle}>
              {cardTitle}
            </h3>
            {lead.company && (
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1 min-w-0">
                <BuildingOfficeIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{lead.company}</span>
              </p>
            )}
          </div>
          <div className="flex-shrink-0 flex flex-col gap-2 items-end">
            <StatusBadge status={lead.status} />
            <div className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {timeDifferenceText}
            </div>
          </div>
        </div>

        {/* Contact Info & Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            <span className="truncate text-slate-600 dark:text-slate-300" title={getDisplayEmail(lead.email)}>{getDisplayEmail(lead.email)}</span>
            {isValidEmail(lead.email) && (
              <>
                <button onClick={() => handleCopy(lead.email, 'email')} title="Copy Email" className="ml-auto p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                    {copiedItem === 'email' ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4 text-slate-500"/>}
                </button>
                <a href={`mailto:${lead.email}`} onClick={() => setContactModalOpen(true)} title="Send Email" className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                    <EnvelopeIcon className="w-4 h-4 text-teal-600 dark:text-teal-400"/>
                </a>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <PhoneIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            <span className="truncate text-slate-600 dark:text-slate-300">{lead.phone || 'N/A'}</span>
            <button onClick={() => handleCopy(lead.phone || '', 'phone')} title="Copy Phone" className="ml-auto p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700" disabled={!lead.phone}>
                {copiedItem === 'phone' ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4 text-slate-500"/>}
            </button>
            <button 
              onClick={() => onOpenActivityModal ? onOpenActivityModal(lead.id) : setContactModalOpen(true)} 
              title="Call" 
              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
              disabled={!lead.phone}
            >
                <PhoneIcon className="w-4 h-4 text-teal-600 dark:text-teal-400"/>
            </button>
          </div>
        </div>
        
        {/* Status Changer */}
        <div>
            <label htmlFor={`status-${lead.id}`} className="sr-only">Status</label>
            <select
                id={`status-${lead.id}`}
                value={lead.status}
                onChange={handleStatusChange}
                className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500 text-sm py-1.5"
            >
                {Object.values(LeadStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </select>
        </div>

        {/* AI Insights or Generate Button */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-1">
          {lead.aiInsights ? (
            <CollapsibleSection title={`AI Insights${lead.aiInsights.serviceType === 'legal' ? ' - Legal Case' : ''}`} initiallyOpen={false}>
              <div className="space-y-4 pt-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-semibold text-slate-600 dark:text-slate-400 text-sm">Qualification Score</h5>
                    <p className={`text-2xl font-bold ${scoreColor(lead.aiInsights.qualificationScore)} px-2 rounded-md inline-block`}>
                      {lead.aiInsights.qualificationScore}<span className="text-sm font-normal text-slate-500">/100</span>
                    </p>
                  </div>
                  <button onClick={handleGenerateInsightsClick} disabled={isGeneratingInsights} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors -mt-1" title="Regenerate Insights">
                    <ArrowPathIcon className={`w-5 h-5 text-slate-600 dark:text-slate-300 ${isGeneratingInsights ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                {/* Service Type Badge */}
                {lead.aiInsights.serviceType && (
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lead.aiInsights.serviceType === 'legal' 
                        ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
                        : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                    }`}>
                      {lead.aiInsights.serviceType.charAt(0).toUpperCase() + lead.aiInsights.serviceType.slice(1)} Service
                    </span>
                  </div>
                )}
                
                {/* Legal-specific quick info */}
                {lead.aiInsights.legalSpecific && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md border border-purple-200 dark:border-purple-800">
                    <h5 className="font-semibold text-purple-800 dark:text-purple-200 text-sm mb-1">Legal Case Info</h5>
                    <div className="text-xs space-y-1">
                      {lead.aiInsights.legalSpecific.caseType && (
                        <p><strong>Type:</strong> {lead.aiInsights.legalSpecific.caseType}</p>
                      )}
                      {lead.aiInsights.legalSpecific.urgencyLevel && (
                        <p><strong>Urgency:</strong> 
                          <span className={`ml-1 font-medium ${
                            lead.aiInsights.legalSpecific.urgencyLevel === 'critical' ? 'text-red-600 dark:text-red-400' :
                            lead.aiInsights.legalSpecific.urgencyLevel === 'high' ? 'text-orange-600 dark:text-orange-400' :
                            lead.aiInsights.legalSpecific.urgencyLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-green-600 dark:text-green-400'
                          }`}>
                            {lead.aiInsights.legalSpecific.urgencyLevel.charAt(0).toUpperCase() + lead.aiInsights.legalSpecific.urgencyLevel.slice(1)}
                          </span>
                        </p>
                      )}
                      {lead.aiInsights.legalSpecific.caseNumber && (
                        <p><strong>Case #:</strong> <span className="font-mono">{lead.aiInsights.legalSpecific.caseNumber}</span></p>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1 text-sm">Justification</h5>
                  <p className="text-slate-600 dark:text-slate-300 text-xs italic">{lead.aiInsights.justification}</p>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1 text-sm">Key Pain Points</h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-xs">
                    {lead.aiInsights.keyPainPoints.slice(0, 3).map((point, i) => <li key={i}>{point}</li>)}
                    {lead.aiInsights.keyPainPoints.length > 3 && (
                      <li className="text-slate-500 dark:text-slate-400 italic">+{lead.aiInsights.keyPainPoints.length - 3} more...</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1 text-sm">Suggested Next Steps</h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-xs">
                    {lead.aiInsights.suggestedNextSteps.slice(0, 3).map((step, i) => <li key={i}>{step}</li>)}
                    {lead.aiInsights.suggestedNextSteps.length > 3 && (
                      <li className="text-slate-500 dark:text-slate-400 italic">+{lead.aiInsights.suggestedNextSteps.length - 3} more...</li>
                    )}
                  </ul>
                </div>
                
                {/* More Details Button */}
                {(lead.aiInsights.isLengthy || lead.aiInsights.legalSpecific || lead.aiInsights.detailedAnalysis) && onOpenDetailedInsights && (
                  <button
                    onClick={() => onOpenDetailedInsights(lead)}
                    className="w-full mt-3 py-2 px-3 bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <LightBulbIcon className="w-4 h-4" />
                    View Detailed Report
                  </button>
                )}
              </div>
            </CollapsibleSection>
          ) : (
            <button onClick={handleGenerateInsightsClick} disabled={isGeneratingInsights} className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-teal-500/10 hover:bg-teal-500/20 dark:bg-teal-500/20 dark:hover:bg-teal-500/30 text-teal-700 dark:text-teal-300 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-wait">
              {isGeneratingInsights ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <LightBulbIcon className="w-5 h-5"/>
                  <span>Generate AI Insights</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Collapsible Details */}
        <div className="space-y-1">
            {lead.issueDescription && (
                <CollapsibleSection title="Issue Description" initiallyOpen={true}>
                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{lead.issueDescription}</p>
                </CollapsibleSection>
            )}
             {lead.callDetails && (
                <CollapsibleSection title="Call Details" initiallyOpen={true}>
                    <div className="space-y-3">
                        <h4 className="font-semibold text-teal-700 dark:text-teal-300">{lead.callDetails.summaryTitle}</h4>
                        {lead.hasAudio && elevenlabsApiKey ? (
                          <ElevenLabsAudioPlayer
                            conversationId={lead.callDetails.conversationId}
                            apiKey={elevenlabsApiKey}
                          />
                        ) : (
                          <p className="text-xs text-slate-400 italic">Audio not available for this call.</p>
                        )}
                        <div>
                            <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1">Transcript Summary</h5>
                            <pre className="bg-slate-100 dark:bg-slate-900/70 p-2 rounded-md text-slate-600 dark:text-slate-300 text-xs whitespace-pre-wrap font-mono overflow-x-auto">
                                {lead.callDetails.transcriptSummary}
                            </pre>
                        </div>
                    </div>
                </CollapsibleSection>
            )}
            {lead.notes?.length > 0 && (
                 <CollapsibleSection title={`Notes (${lead.notes.length})`}>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {lead.notes.map((note: Note) => (
                             <div key={note.id} className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md">
                                <p className="text-slate-800 dark:text-slate-200 text-xs">{note.text}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 text-right">{new Date(note.createdAt).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </CollapsibleSection>
            )}
        </div>

        {/* Footer Actions */}
        <div className="mt-2 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500 dark:text-slate-500">
          <span>
            {lead.callDetails?.callStartTime 
              ? `Call: ${new Date(lead.callDetails.callStartTime).toLocaleString()}`
              : `Created: ${new Date(lead.createdAt).toLocaleString()}`
            }
          </span>
           <div className="flex items-center gap-1">
                <button onClick={() => onOpenAddNoteModal(lead)} title="Add Note" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <ChatBubbleLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
                <button onClick={() => onOpenEditModal(lead)} title="Edit Lead" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <PencilIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
                <button 
                    onClick={handleEmailClick} 
                    title="Email Lead Info to User" 
                    disabled={isSendingEmail}
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSendingEmail ? (
                        <ArrowPathIcon className="w-5 h-5 text-slate-600 dark:text-slate-300 animate-spin" />
                    ) : (
                        <EnvelopeIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    )}
                </button>
                
                {/* Export Dropdown */}
                <div className="relative export-dropdown" ref={dropdownRef}>
                  <button 
                    onClick={handleDropdownOpen}
                    title="Export Lead Data" 
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    <ChevronDownIcon className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                  </button>
                  
                  {isExportDropdownOpen && (
                    <div className={`absolute right-0 ${
                      dropdownPosition === 'top' 
                        ? 'bottom-full mb-1' 
                        : 'top-full mt-1'
                    } bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 min-w-[120px]`}>
                      <button
                        onClick={handleDownloadCSV}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 rounded-t-lg"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        CSV Export
                      </button>
                      <button
                        onClick={handlePrintPDF}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 rounded-b-lg"
                      >
                        <PrinterIcon className="w-4 h-4" />
                        Print PDF
                      </button>
                    </div>
                  )}
                </div>
                
                <button
                    onClick={handleWebhookClick}
                    title="Send to Webhook"
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    disabled={isSendingWebhook}
                >
                    {isSendingWebhook ? (
                        <ArrowPathIcon className="w-5 h-5 text-slate-600 dark:text-slate-300 animate-spin" />
                    ) : (
                        <PaperAirplaneIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    )}
                </button>
                <button onClick={() => setDeleteModalOpen(true)} title="Delete Lead" className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                    <TrashIcon className="w-5 h-5 text-red-500 dark:text-red-400" />
                </button>
            </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Lead"
        message={`Are you sure you want to permanently delete the lead for ${cardTitle}? This action cannot be undone.`}
        confirmText="Delete"
      />
      <ConfirmationModal
        isOpen={isContactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onConfirm={handleContactAction}
        title="Log Contact"
        message={`After you call or email, would you like to mark this lead's status as 'Contacted'?`}
        confirmText="Yes, Mark as Contacted"
        cancelText="No, Not Now"
      />
      
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        lead={lead}
        userEmail={userEmail || ''}
        companyId={companyId || ''}
      />
    </>
  );
};

export default LeadCard;
