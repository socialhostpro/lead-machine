import React, { useState } from 'react';
import { Lead, LeadStatus, LeadSource, Note } from '../types';
import { 
  XMarkIcon, 
  BuildingOfficeIcon, 
  UserIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  ClipboardIcon, 
  CheckIcon, 
  ArrowDownTrayIcon, 
  PaperAirplaneIcon, 
  ArrowPathIcon, 
  LightBulbIcon,
  PencilIcon,
  ChatBubbleLeftIcon
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
  userEmail,
  companyId
}) => {
  const [copiedItem, setCopiedItem] = useState<'email' | 'phone' | null>(null);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  if (!isOpen || !lead) return null;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateLead({ ...lead, status: e.target.value as LeadStatus });
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
                    </div>
                  )}
                </div>
              </div>

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
              {lead.aiInsights && lead.aiInsights.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">AI Insights</h3>
                  <div className="space-y-2">
                    {lead.aiInsights.map((insight, index) => (
                      <div key={index} className="bg-white dark:bg-slate-600 p-3 rounded border border-slate-200 dark:border-slate-500">
                        <p className="text-slate-800 dark:text-white">{insight.content}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Generated on {new Date(insight.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
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