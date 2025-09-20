import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus, LeadSource, Note, CallLog } from '../types';
import { 
  XMarkIcon, 
  BuildingOfficeIcon, 
  UserIcon, 
  PhoneIcon, 
  PhoneOutgoingIcon,
  EnvelopeIcon, 
  ClipboardIcon, 
  CheckIcon, 
  ArrowDownTrayIcon, 
  PaperAirplaneIcon, 
  ArrowPathIcon, 
  LightBulbIcon,
  PencilIcon,
  ChatBubbleLeftIcon,
  ClockIcon
} from './icons';
import StatusBadge from './StatusBadge';
import CollapsibleSection from './CollapsibleSection';
import ElevenLabsAudioPlayer from './ElevenLabsAudioPlayer';

interface ActivityCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  elevenlabsApiKey?: string;
  onUpdateLead: (updatedLead: Lead) => void;
  onOpenEditModal: (lead: Lead) => void;
  onOpenAddNoteModal: (lead: Lead) => void;
  onSendToWebhook: (lead: Lead) => Promise<void>;
  onGenerateInsights: (lead: Lead) => Promise<void>;
  onSendEmail?: (lead: Lead) => Promise<void>;
  onOpenDetailedInsights?: (lead: Lead) => void;
  userEmail?: string;
  companyId?: string;
}

const ActivityCallModal: React.FC<ActivityCallModalProps> = ({
  isOpen,
  onClose,
  lead,
  elevenlabsApiKey,
  onUpdateLead,
  onOpenEditModal,
  onOpenAddNoteModal,
  onSendToWebhook,
  onGenerateInsights,
  onSendEmail,
  onOpenDetailedInsights,
  userEmail,
  companyId
}) => {
  const [copiedItem, setCopiedItem] = useState<'email' | 'phone' | null>(null);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Call tracking state
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null);
  const [autoStopTimer, setAutoStopTimer] = useState<NodeJS.Timeout | null>(null);

  if (!isOpen || !lead) return null;

  // Cleanup call timer when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (callTimer) {
        clearInterval(callTimer);
      }
      if (autoStopTimer) {
        clearTimeout(autoStopTimer);
      }
    };
  }, [callTimer, autoStopTimer]);

  // Reset call state when modal closes
  useEffect(() => {
    if (!isOpen && isCallActive) {
      handleEndCall();
    }
  }, [isOpen]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateLead({ ...lead, status: e.target.value as LeadStatus });
  };

  const handleContactAction = () => {
    onUpdateLead({ ...lead, status: LeadStatus.CONTACTED });
  };
  
  const handleDialNumber = () => {
    if (!lead.phone) return;
    
    if (isCallActive) {
      // End the call
      handleEndCall();
    } else {
      // Start the call
      handleStartCall();
    }
  };
  
  const handleStartCall = () => {
    setIsCallActive(true);
    const startTime = new Date();
    setCallStartTime(startTime);
    setCallDuration(0);
    
    // Start timer to track call duration
    const timer = setInterval(() => {
      const now = new Date();
      const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setCallDuration(duration);
    }, 1000);
    
    setCallTimer(timer);
    
    // Auto-stop timer after 10 minutes (600 seconds)
    const autoStop = setTimeout(() => {
      console.log('Auto-stopping call after 10 minutes of inactivity');
      handleEndCall();
    }, 10 * 60 * 1000); // 10 minutes in milliseconds
    
    setAutoStopTimer(autoStop);
    
    // Initiate the actual phone call (this would typically use a telephony service)
    // For now, we'll just open the tel: link
    if (lead.phone) {
      window.open(`tel:${lead.phone}`, '_self');
    }
  };
  
  const handleEndCall = async () => {
    if (callTimer) {
      clearInterval(callTimer);
      setCallTimer(null);
    }
    
    if (autoStopTimer) {
      clearTimeout(autoStopTimer);
      setAutoStopTimer(null);
    }
    
    const endTime = new Date();
    const duration = callStartTime ? Math.floor((endTime.getTime() - callStartTime.getTime()) / 1000) : 0;
    
    setIsCallActive(false);
    
    // Create new call log entry
    const newCallLog: CallLog = {
      startTime: callStartTime?.toISOString() || endTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: duration,
      type: 'outgoing',
      status: duration > 0 ? 'completed' : 'cancelled'
    };
    
    // Get existing call history
    const existingHistory = lead.callDetails?.callHistory || [];
    
    // Update lead with call information
    const updatedLead = {
      ...lead,
      status: LeadStatus.CONTACTED,
      lastContactedAt: endTime.toISOString(),
      callDetails: {
        ...lead.callDetails,
        conversationId: lead.callDetails?.conversationId || '',
        summaryTitle: lead.callDetails?.summaryTitle || 'Phone Call',
        transcriptSummary: lead.callDetails?.transcriptSummary || '',
        lastOutgoingCall: newCallLog,
        callHistory: [newCallLog, ...existingHistory].slice(0, 10) // Keep last 10 calls
      }
    };
    
    onUpdateLead(updatedLead);
    
    // Reset call state
    setCallStartTime(null);
    setCallDuration(0);
  };
  
  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleCopy = (text: string, item: 'email' | 'phone') => {
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedItem(item);
        setTimeout(() => setCopiedItem(null), 2000);
      });
    }
  };
  
  const handleDownload = () => {
    const leadData = JSON.stringify(lead, null, 2);
    const blob = new Blob([leadData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (lead.firstName + '_' + lead.lastName).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `lead_${safeName}_${lead.id.substring(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    }
  };

  // Helper function to check if email is valid
  const isValidEmail = (email: string) => {
    if (!email) return false;
    if (email.startsWith('conv_')) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Helper function to get display email
  const getDisplayEmail = (email: string) => {
    return isValidEmail(email) ? email : 'None';
  };

  const isCall = lead.source === LeadSource.INCOMING_CALL;
  const isUnknownIncomingCall = isCall && lead.firstName === 'Unknown' && lead.callDetails?.summaryTitle;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60]" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] m-4 relative animate-fade-in-up overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-200 dark:bg-slate-700 p-2 rounded-full">
              {isCall ? (
                <PhoneIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              ) : (
                <UserIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isUnknownIncomingCall ? lead.callDetails!.summaryTitle : `${lead.firstName} ${lead.lastName}`}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isCall ? 'Incoming Call' : 'Lead'} • {new Date(lead.createdAt).toLocaleString()}
              </p>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Contact Info */}
            <div className="space-y-4">
              {/* Contact Information */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Contact Information</h3>
                <div className="space-y-3">
                  {/* Name */}
                  {!isUnknownIncomingCall && (
                    <div className="flex items-center space-x-3">
                      <UserIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-slate-800 dark:text-white">{lead.firstName} {lead.lastName}</span>
                    </div>
                  )}
                  
                  {/* Company */}
                  {lead.company && (
                    <div className="flex items-center space-x-3">
                      <BuildingOfficeIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-slate-800 dark:text-white">{lead.company}</span>
                    </div>
                  )}
                  
                  {/* Email */}
                  <div className="flex items-center space-x-3">
                    <EnvelopeIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-slate-800 dark:text-white">{getDisplayEmail(lead.email)}</span>
                    {isValidEmail(lead.email) && (
                      <button
                        onClick={() => handleCopy(lead.email, 'email')}
                        className="p-1 text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 transition-colors"
                        title="Copy email"
                      >
                        {copiedItem === 'email' ? (
                          <CheckIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <ClipboardIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Phone */}
                  {lead.phone && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <PhoneIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-slate-800 dark:text-white">{lead.phone}</span>
                        <button
                          onClick={() => handleCopy(lead.phone, 'phone')}
                          className="p-1 text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 transition-colors"
                          title="Copy phone"
                        >
                          {copiedItem === 'phone' ? (
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <ClipboardIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={handleDialNumber}
                          className={`p-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                            isCallActive 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                          title={isCallActive ? 'End Call' : 'Dial Number'}
                        >
                          <PhoneOutgoingIcon className="w-4 h-4" />
                          <span className="text-sm">
                            {isCallActive ? 'End Call' : 'Dial'}
                          </span>
                        </button>
                      </div>
                      {/* Call Timer */}
                      {isCallActive && (
                        <div className="flex items-center space-x-2 ml-7 text-sm">
                          <ClockIcon className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-mono">
                            Call in progress: {formatCallDuration(callDuration)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Call History */}
              {lead.phone && (lead.callDetails?.callHistory || lead.callDetails?.lastOutgoingCall) && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                    <ClockIcon className="w-5 h-5 mr-2 text-slate-600 dark:text-slate-400" />
                    Call History
                  </h3>
                  <div className="space-y-2">
                    {/* Most recent outgoing call */}
                    {lead.callDetails?.lastOutgoingCall && (
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-600 rounded-lg border border-slate-200 dark:border-slate-500">
                        <div className="flex items-center space-x-3">
                          <PhoneOutgoingIcon className="w-4 h-4 text-green-600" />
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              Outgoing Call
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(lead.callDetails.lastOutgoingCall.startTime).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatCallDuration(lead.callDetails.lastOutgoingCall.duration)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                            {lead.callDetails.lastOutgoingCall.status || 'completed'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Additional call history if available */}
                    {lead.callDetails?.callHistory && lead.callDetails.callHistory.length > 0 && (
                      <>
                        {lead.callDetails.callHistory.slice(0, 3).map((call, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-600 rounded-lg border border-slate-200 dark:border-slate-500">
                            <div className="flex items-center space-x-3">
                              {call.type === 'incoming' ? (
                                <PhoneIcon className="w-4 h-4 text-blue-600" />
                              ) : (
                                <PhoneOutgoingIcon className="w-4 h-4 text-green-600" />
                              )}
                              <div>
                                <div className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                                  {call.type} Call
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {new Date(call.startTime).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {formatCallDuration(call.duration)}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                {call.status || 'completed'}
                              </div>
                            </div>
                          </div>
                        ))}
                        {lead.callDetails.callHistory.length > 3 && (
                          <div className="text-center">
                            <button className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300">
                              View all {lead.callDetails.callHistory.length} calls
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Status</h3>
                <div className="flex items-center space-x-3">
                  <StatusBadge status={lead.status} />
                  <select
                    value={lead.status}
                    onChange={handleStatusChange}
                    className="bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md px-3 py-1 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    title="Change lead status"
                    aria-label="Change lead status"
                  >
                    {Object.values(LeadStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Audio Player for calls */}
              {isCall && lead.callDetails?.recordingUrl && elevenlabsApiKey && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Call Recording</h3>
                  <ElevenLabsAudioPlayer
                    recordingUrl={lead.callDetails.recordingUrl}
                    apiKey={elevenlabsApiKey}
                  />
                </div>
              )}
            </div>

            {/* Right Column - Details and Actions */}
            <div className="space-y-4">
              {/* Issue Description */}
              {lead.issueDescription && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Issue Description</h3>
                  <p className="text-slate-800 dark:text-white whitespace-pre-wrap">{lead.issueDescription}</p>
                </div>
              )}

              {/* Call Details */}
              {isCall && lead.callDetails && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Call Details</h3>
                  <div className="space-y-2 text-slate-800 dark:text-white">
                    {lead.callDetails.summaryTitle && (
                      <p><strong className="text-slate-900 dark:text-white">Summary:</strong> {lead.callDetails.summaryTitle}</p>
                    )}
                    {lead.callDetails.summaryText && (
                      <div>
                        <strong className="text-slate-900 dark:text-white">Description:</strong>
                        <p className="text-slate-800 dark:text-white whitespace-pre-wrap mt-1">{lead.callDetails.summaryText}</p>
                      </div>
                    )}
                    {lead.callDetails.duration && (
                      <p><strong className="text-slate-900 dark:text-white">Duration:</strong> {Math.round(lead.callDetails.duration / 60)} minutes</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {lead.notes && lead.notes.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Notes</h3>
                  <div className="space-y-2">
                    {lead.notes.map((note, index) => (
                      <div key={index} className="bg-white dark:bg-slate-600 p-3 rounded border border-slate-200 dark:border-slate-500">
                        <p className="text-slate-800 dark:text-white">{note.content}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insights */}
              {lead.aiInsights && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      AI Insights{lead.aiInsights.serviceType === 'legal' ? ' - Legal Case' : ''}
                    </h3>
                    {(lead.aiInsights.isLengthy || lead.aiInsights.legalSpecific || lead.aiInsights.detailedAnalysis) && onOpenDetailedInsights && (
                      <button
                        onClick={() => onOpenDetailedInsights(lead)}
                        className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 font-medium rounded-md transition-colors text-sm flex items-center gap-1"
                      >
                        <LightBulbIcon className="w-4 h-4" />
                        View Full Report
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Qualification Score */}
                    <div className="bg-white dark:bg-slate-600 p-3 rounded border border-slate-200 dark:border-slate-500">
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-1">Qualification Score</h4>
                      <p className={`text-2xl font-bold ${
                        lead.aiInsights.qualificationScore >= 80 ? 'text-green-600 dark:text-green-400' :
                        lead.aiInsights.qualificationScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        lead.aiInsights.qualificationScore >= 40 ? 'text-orange-600 dark:text-orange-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {lead.aiInsights.qualificationScore}/100
                      </p>
                    </div>
                    
                    {/* Service Type */}
                    {lead.aiInsights.serviceType && (
                      <div className="bg-white dark:bg-slate-600 p-3 rounded border border-slate-200 dark:border-slate-500">
                        <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-1">Service Type</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          lead.aiInsights.serviceType === 'legal' 
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
                            : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                        }`}>
                          {lead.aiInsights.serviceType.charAt(0).toUpperCase() + lead.aiInsights.serviceType.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Legal-specific quick info */}
                  {lead.aiInsights.legalSpecific && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md border border-purple-200 dark:border-purple-800 mb-4">
                      <h4 className="font-medium text-purple-800 dark:text-purple-200 text-sm mb-2">Legal Case Summary</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {lead.aiInsights.legalSpecific.caseType && (
                          <div><strong>Type:</strong> {lead.aiInsights.legalSpecific.caseType}</div>
                        )}
                        {lead.aiInsights.legalSpecific.urgencyLevel && (
                          <div><strong>Urgency:</strong> 
                            <span className={`ml-1 font-medium ${
                              lead.aiInsights.legalSpecific.urgencyLevel === 'critical' ? 'text-red-600 dark:text-red-400' :
                              lead.aiInsights.legalSpecific.urgencyLevel === 'high' ? 'text-orange-600 dark:text-orange-400' :
                              lead.aiInsights.legalSpecific.urgencyLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-green-600 dark:text-green-400'
                            }`}>
                              {lead.aiInsights.legalSpecific.urgencyLevel.charAt(0).toUpperCase() + lead.aiInsights.legalSpecific.urgencyLevel.slice(1)}
                            </span>
                          </div>
                        )}
                        {lead.aiInsights.legalSpecific.caseNumber && (
                          <div><strong>Case #:</strong> <span className="font-mono">{lead.aiInsights.legalSpecific.caseNumber}</span></div>
                        )}
                        {lead.aiInsights.legalSpecific.potentialValue && (
                          <div><strong>Est. Value:</strong> {lead.aiInsights.legalSpecific.potentialValue}</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {/* Justification */}
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-1">Analysis</h4>
                      <p className="text-slate-700 dark:text-slate-300 text-sm">{lead.aiInsights.justification}</p>
                    </div>
                    
                    {/* Key Pain Points */}
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-1">Key Pain Points</h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-sm">
                        {lead.aiInsights.keyPainPoints.slice(0, 3).map((point, i) => <li key={i}>{point}</li>)}
                        {lead.aiInsights.keyPainPoints.length > 3 && (
                          <li className="text-slate-500 dark:text-slate-400 italic">+{lead.aiInsights.keyPainPoints.length - 3} more in detailed report...</li>
                        )}
                      </ul>
                    </div>
                    
                    {/* Suggested Next Steps */}
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-1">Suggested Next Steps</h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-sm">
                        {lead.aiInsights.suggestedNextSteps.slice(0, 3).map((step, i) => <li key={i}>{step}</li>)}
                        {lead.aiInsights.suggestedNextSteps.length > 3 && (
                          <li className="text-slate-500 dark:text-slate-400 italic">+{lead.aiInsights.suggestedNextSteps.length - 3} more in detailed report...</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-wrap gap-3 justify-between">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onOpenEditModal(lead)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                <span>Edit</span>
              </button>
              
              <button
                onClick={() => onOpenAddNoteModal(lead)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <ChatBubbleLeftIcon className="w-4 h-4" />
                <span>Add Note</span>
              </button>

              {isValidEmail(lead.email) && onSendEmail && (
                <button
                  onClick={handleEmailClick}
                  disabled={isSendingEmail}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-lg transition-colors"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  <span>{isSendingEmail ? 'Sending...' : 'Send Email'}</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleContactAction}
                className="flex items-center space-x-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
              >
                <PhoneIcon className="w-4 h-4" />
                <span>Mark Contacted</span>
              </button>

              <button
                onClick={handleWebhookClick}
                disabled={isSendingWebhook}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg transition-colors"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                <span>{isSendingWebhook ? 'Sending...' : 'Send Webhook'}</span>
              </button>

              <button
                onClick={handleGenerateInsightsClick}
                disabled={isGeneratingInsights}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white rounded-lg transition-colors"
              >
                <LightBulbIcon className="w-4 h-4" />
                <span>{isGeneratingInsights ? 'Generating...' : 'AI Insights'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCallModal;