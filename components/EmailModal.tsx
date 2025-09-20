import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { XMarkIcon, EnvelopeIcon, PaperAirplaneIcon } from './icons';
import { supabase } from '../utils/supabase';
import toast from '../utils/toast';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  userEmail: string;
  companyId: string;
}

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, lead, userEmail, companyId }) => {
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendToLead, setSendToLead] = useState(true);
  const [sendToUser, setSendToUser] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Pre-populate with lead information
      setEmailSubject(`Follow-up: ${lead.firstName} ${lead.lastName} - Lead #${lead.id.slice(-6)}`);
      setEmailMessage(`Hi ${lead.firstName},

Thank you for your interest! I wanted to follow up regarding your inquiry.

${lead.issueDescription ? `You mentioned: "${lead.issueDescription}"` : ''}

I'd love to discuss how we can help you. Please let me know a good time to connect.

Best regards,
Lead Machine Team`);
    }
  }, [isOpen, lead]);

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }

    setIsSending(true);
    
    try {
      // Determine recipients
      const recipients = [];
      if (sendToLead && lead.email && lead.email !== 'N/A') {
        recipients.push(lead.email);
      }
      if (sendToUser && userEmail) {
        recipients.push(userEmail);
      }

      if (recipients.length === 0) {
        toast.error('No valid email recipients selected');
        setIsSending(false);
        return;
      }

      // Call SendGrid Edge Function
      const { data, error } = await supabase.functions.invoke('sendgrid-notifications', {
        body: {
          type: 'lead_follow_up',
          messageData: {
            subject: emailSubject,
            message: emailMessage,
            leadName: `${lead.firstName} ${lead.lastName}`,
            leadEmail: lead.email,
            leadPhone: lead.phone,
            leadCompany: lead.company,
            leadSource: lead.source,
            leadStatus: lead.status,
            leadId: lead.id
          },
          recipientEmails: recipients,
          companyId: companyId
        }
      });

      if (error) {
        console.error('SendGrid API Error:', error);
        toast.error(`Failed to send email: ${error.message}`);
      } else {
        console.log('Email sent successfully:', data);
        toast.success(`Email sent successfully to ${recipients.length} recipient(s)!`);
        onClose();
      }
    } catch (error) {
      console.error('Email sending error:', error);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <EnvelopeIcon className="w-6 h-6 text-teal-600" />
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Send Email
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {lead.firstName} {lead.lastName} • {lead.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close Email Modal"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Send To:
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sendToLead}
                  onChange={(e) => setSendToLead(e.target.checked)}
                  className="w-4 h-4 text-teal-600 bg-slate-100 border-slate-300 rounded focus:ring-teal-500 dark:focus:ring-teal-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                />
                <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                  Lead: {lead.email} {(!lead.email || lead.email === 'N/A') && <span className="text-red-500">(No valid email)</span>}
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sendToUser}
                  onChange={(e) => setSendToUser(e.target.checked)}
                  className="w-4 h-4 text-teal-600 bg-slate-100 border-slate-300 rounded focus:ring-teal-500 dark:focus:ring-teal-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                />
                <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                  You: {userEmail}
                </span>
              </label>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="emailSubject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Subject
            </label>
            <input
              type="text"
              id="emailSubject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:text-white"
              placeholder="Enter email subject..."
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="emailMessage" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Message
            </label>
            <textarea
              id="emailMessage"
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:text-white"
              placeholder="Enter your message..."
            />
          </div>

          {/* Lead Info Preview */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Lead Information</h4>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <p><strong>Name:</strong> {lead.firstName} {lead.lastName}</p>
              <p><strong>Company:</strong> {lead.company || 'N/A'}</p>
              <p><strong>Phone:</strong> {lead.phone}</p>
              <p><strong>Status:</strong> {lead.status}</p>
              <p><strong>Source:</strong> {lead.source}</p>
              {lead.issueDescription && (
                <p><strong>Issue:</strong> {lead.issueDescription}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            disabled={isSending}
          >
            Cancel
          </button>
          <button
            onClick={handleSendEmail}
            disabled={isSending || (!sendToLead && !sendToUser)}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4" />
                <span>Send Email</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;