import React, { useState } from 'react';
import { Lead } from '../types';
import LeadCard from './LeadCard';
import { ChevronDownIcon, ChevronRightIcon, PhoneIcon } from './icons';

interface ReturningCallerStackProps {
  callerGroup: Lead[];
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
  userEmail?: string;
  companyId?: string;
}

const ReturningCallerStack: React.FC<ReturningCallerStackProps> = ({
  callerGroup,
  elevenlabsApiKey,
  onUpdateLead,
  onDeleteLead,
  onOpenEditModal,
  onOpenAddNoteModal,
  onSendToWebhook,
  onGenerateInsights,
  onSendEmail,
  onOpenDetailedInsights,
  onOpenActivityModal,
  userEmail,
  companyId
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (callerGroup.length === 0) return null;
  
  const primaryLead = callerGroup[0]; // Most recent call
  const callCount = callerGroup.length;
  const phoneNumber = primaryLead.phone;
  
  // Calculate call statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const callsToday = callerGroup.filter(lead => {
    const callTime = new Date(lead.callDetails?.callStartTime || lead.createdAt);
    return callTime >= today;
  }).length;
  
  const callsThisWeek = callerGroup.filter(lead => {
    const callTime = new Date(lead.callDetails?.callStartTime || lead.createdAt);
    return callTime >= weekAgo;
  }).length;

  return (
    <div className="space-y-2">
      {/* Header Card - Shows primary lead with call statistics */}
      <div className="relative">
        <div className="absolute -top-1 -right-1 z-10">
          <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <PhoneIcon className="w-3 h-3" />
            <span className="font-semibold">{callCount}</span>
          </div>
        </div>
        
        {/* Call Statistics Badge */}
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-md shadow-sm">
            Today: {callsToday} | Week: {callsThisWeek}
          </div>
        </div>
        
        <LeadCard
          lead={primaryLead}
          elevenlabsApiKey={elevenlabsApiKey}
          onUpdateLead={onUpdateLead}
          onDeleteLead={onDeleteLead}
          onOpenEditModal={onOpenEditModal}
          onOpenAddNoteModal={onOpenAddNoteModal}
          onSendToWebhook={onSendToWebhook}
          onGenerateInsights={onGenerateInsights}
          onSendEmail={onSendEmail}
          onOpenDetailedInsights={onOpenDetailedInsights}
          onOpenActivityModal={onOpenActivityModal}
          userEmail={userEmail}
          companyId={companyId}
          isHighlighted={false}
        />
        
        {/* Expand/Collapse Button */}
        {callCount > 1 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute bottom-2 right-2 bg-slate-600 hover:bg-slate-700 text-white p-2 rounded-full shadow-lg transition-colors z-10"
            title={isExpanded ? 'Hide previous calls' : `Show ${callCount - 1} previous calls`}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      
      {/* Stacked Previous Calls */}
      {isExpanded && callCount > 1 && (
        <div className="ml-4 space-y-2 border-l-2 border-slate-300 dark:border-slate-600 pl-4">
          <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
            Previous Calls ({callCount - 1})
          </div>
          {callerGroup.slice(1).map((lead, index) => (
            <div key={lead.id} className="relative">
              <div className="absolute -top-1 -left-6 bg-slate-400 text-white text-xs px-1.5 py-0.5 rounded-full">
                {index + 2}
              </div>
              <LeadCard
                lead={lead}
                elevenlabsApiKey={elevenlabsApiKey}
                onUpdateLead={onUpdateLead}
                onDeleteLead={onDeleteLead}
                onOpenEditModal={onOpenEditModal}
                onOpenAddNoteModal={onOpenAddNoteModal}
                onSendToWebhook={onSendToWebhook}
                onGenerateInsights={onGenerateInsights}
                onSendEmail={onSendEmail}
                onOpenDetailedInsights={onOpenDetailedInsights}
                onOpenActivityModal={onOpenActivityModal}
                userEmail={userEmail}
                companyId={companyId}
                isHighlighted={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReturningCallerStack;