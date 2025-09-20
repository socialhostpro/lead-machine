import React, { useState } from 'react';
import { Lead, LeadStatus, LeadSource, Note } from '../types';
import { BuildingOfficeIcon, UserIcon, PhoneIcon, PencilIcon, TrashIcon, ChatBubbleLeftIcon, EnvelopeIcon, ClipboardIcon, CheckIcon, ArrowDownTrayIcon, PaperAirplaneIcon, ArrowPathIcon, LightBulbIcon } from './icons';
import StatusBadge from './StatusBadge';
import CollapsibleSection from './CollapsibleSection';
import ConfirmationModal from './ConfirmationModal';
import ElevenLabsAudioPlayer from './ElevenLabsAudioPlayer';
import EmailModal from './EmailModal';

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
  isHighlighted?: boolean;
  userEmail?: string;
  companyId?: string;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, elevenlabsApiKey, onUpdateLead, onDeleteLead, onOpenEditModal, onOpenAddNoteModal, onSendToWebhook, onGenerateInsights, onSendEmail, isHighlighted, userEmail, companyId }) => {
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isContactModalOpen, setContactModalOpen] = useState(false);
  const [isEmailModalOpen, setEmailModalOpen] = useState(false);
  const [copiedItem, setCopiedItem] = useState<'email' | 'phone' | null>(null);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
      <div id={`lead-card-${lead.id}`} className={`bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-md dark:shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col gap-4 transition-all duration-500 overflow-hidden ${isHighlighted ? 'ring-2 ring-teal-500 ring-offset-4 ring-offset-slate-50 dark:dark:ring-offset-slate-900' : ''}`}>
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
          <div className="flex-shrink-0">
            <StatusBadge status={lead.status} />
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
            <a href={`tel:${lead.phone}`} onClick={() => setContactModalOpen(true)} title="Call" className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                <PhoneIcon className="w-4 h-4 text-teal-600 dark:text-teal-400"/>
            </a>
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
            <CollapsibleSection title="AI Insights" initiallyOpen={false}>
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
                <div>
                  <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1 text-sm">Justification</h5>
                  <p className="text-slate-600 dark:text-slate-300 text-xs italic">{lead.aiInsights.justification}</p>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1 text-sm">Key Pain Points</h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-xs">
                    {lead.aiInsights.keyPainPoints.map((point, i) => <li key={i}>{point}</li>)}
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-600 dark:text-slate-400 mb-1 text-sm">Suggested Next Steps</h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-xs">
                    {lead.aiInsights.suggestedNextSteps.map((step, i) => <li key={i}>{step}</li>)}
                  </ul>
                </div>
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
                 <button onClick={handleDownload} title="Download Lead Data" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <ArrowDownTrayIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
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
