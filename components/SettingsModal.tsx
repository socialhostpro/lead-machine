import React, { useState, useEffect } from 'react';
import { Company, User, UserRole } from '../types';
import { XMarkIcon, UserIcon, ArrowCounterClockwiseIcon, LightBulbIcon, CheckIcon } from './icons';
import ConfirmationModal from './ConfirmationModal';
import { showTestNotification } from '../utils/notifications';
import { sendAdminTestEmail } from '../utils/emailNotifications';
import { getConfig } from '../utils/config';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  users: User[];
  currentUser: User;
  onUpdateCompany: (company: Company) => Promise<{ success: boolean, error?: string }>;
  onInviteUser: (email: string) => void;
  onResetAndResync: () => void;
}

type ActiveTab = 'users' | 'config';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, company, users, currentUser, onUpdateCompany, onInviteUser, onResetAndResync }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('config');
  const [webhookUrl, setWebhookUrl] = useState(company.webhookUrl || '');
  const [webhookHeader, setWebhookHeader] = useState(company.webhookHeader || '');
  const [defaultAgentId, setDefaultAgentId] = useState(company.defaultAgentId || '');
  const config = getConfig();
  const [emailFromAddress, setEmailFromAddress] = useState(company.email_from_address || config.FROM_EMAIL);
  const [emailReplyToAddress, setEmailReplyToAddress] = useState(company.email_reply_to_address || config.FROM_EMAIL);
  const [emailFromName, setEmailFromName] = useState(company.emailFromName || 'Lead Machine Notifications');
  const [sendgridDnsVerified, setSendgridDnsVerified] = useState(company.sendgridDnsVerified || false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isResetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
        setWebhookUrl(company.webhookUrl || '');
        setWebhookHeader(company.webhookHeader || '');
        setDefaultAgentId(company.defaultAgentId || '');
        setEmailFromAddress(company.emailFromAddress || 'noreply@imaginecapital.ai');
        setEmailReplyToAddress(company.emailReplyToAddress || 'noreply@imaginecapital.ai');
        setEmailFromName(company.emailFromName || 'Lead Machine Notifications');
        setSendgridDnsVerified(company.sendgridDnsVerified || false);
        setSaveState('idle');
        setErrorMessage(null);
    }
  }, [isOpen, company]);

  const isOwner = currentUser.role === UserRole.OWNER;

  const handleConfigSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveState('saving');
    setErrorMessage(null);
    const result = await onUpdateCompany({ 
      ...company, 
      webhookUrl, 
      webhookHeader, 
      defaultAgentId,
      emailFromAddress,
      emailReplyToAddress,
      emailFromName,
      sendgridDnsVerified
    });
    
    if (result.success) {
      setSaveState('saved');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setSaveState('idle');
      setErrorMessage(result.error || 'An unexpected error occurred.');
    }
  };
  
  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail.trim()) {
        onInviteUser(inviteEmail.trim());
        setInviteEmail('');
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    setEmailTestResult('idle');
    
    try {
      // Get admin users for the current company
      const adminUsers = users.filter(user => 
        user.role === UserRole.OWNER || user.role === UserRole.SAAS_ADMIN
      );
      
      if (adminUsers.length === 0) {
        throw new Error('No admin users found to send test email to');
      }
      
      const adminEmails = adminUsers.map(user => user.email);
      
      // Send test email notification using dedicated test function
      const success = await sendAdminTestEmail(adminEmails, company.id);
      
      if (success) {
        setEmailTestResult('success');
        setTimeout(() => setEmailTestResult('idle'), 3000);
      } else {
        setEmailTestResult('error');
        setTimeout(() => setEmailTestResult('idle'), 5000);
      }
    } catch (error) {
      console.error('Email test failed:', error);
      setEmailTestResult('error');
      setTimeout(() => setEmailTestResult('idle'), 5000);
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start p-4 overflow-y-auto z-50 transition-opacity">
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl relative animate-fade-in-up text-slate-800 dark:text-white flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="flex-shrink-0 p-6 md:p-8 border-b border-slate-200 dark:border-slate-700">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
              <XMarkIcon className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold mb-2">Settings</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage settings for {company.name}</p>
            
            <div className="mt-6">
                <nav className="-mb-[calc(1.5rem+1px)] md:-mb-[calc(2rem+1px)] flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`${activeTab === 'config' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        Configuration
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`${activeTab === 'users' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        User Management
                    </button>
                </nav>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-grow p-6 md:p-8 overflow-y-auto">
              {activeTab === 'users' && (
                  <div className="space-y-6">
                      <div>
                          <h3 className="text-lg font-medium">Users in {company.name}</h3>
                          <div className="mt-4 space-y-3 pr-2">
                              {users.map(user => (
                                  <div key={user.id} className="flex items-center justify-between p-3 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg">
                                      <div className="flex items-center gap-3">
                                          <UserIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                          <div>
                                              <p className="font-medium">{user.name}</p>
                                              <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                                          </div>
                                      </div>
                                      <span className="text-xs font-semibold px-2 py-1 bg-slate-300 dark:bg-slate-600 rounded-full">{user.role}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                      {isOwner ? (
                          <form onSubmit={handleInvite}>
                              <h3 className="text-lg font-medium mb-2">Invite New User</h3>
                              <div className="flex gap-4">
                                  <input
                                      type="email"
                                      value={inviteEmail}
                                      onChange={(e) => setInviteEmail(e.target.value)}
                                      placeholder="Enter user's email"
                                      className="flex-grow bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                                      required
                                  />
                                  <button type="submit" className="py-2 px-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-colors">Invite</button>
                              </div>
                          </form>
                      ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">Only company owners can invite new users.</p>
                      )}
                  </div>
              )}
              {activeTab === 'config' && (
                  isOwner ? (
                      <form id="settings-config-form" onSubmit={handleConfigSave} className="space-y-6">
                          <div>
                              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Live Sync Settings</h3>
                               <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Your ElevenLabs API Key is now configured securely via an environment variable.</p>
                              
                              <label htmlFor="agentId" className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">Default Agent ID</label>
                              <input
                                  type="text"
                                  id="agentId"
                                  value={defaultAgentId}
                                  onChange={e => setDefaultAgentId(e.target.value)}
                                  className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                                  placeholder="e.g., F8y2pogcIfbxE7O2u4H8"
                                  required
                              />
                              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">The agent ID used to fetch conversations from ElevenLabs.</p>
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Email Notification Settings</h3>
                            
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label htmlFor="emailFromAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300">From Email Address</label>
                                    <input
                                        type="email"
                                        id="emailFromAddress"
                                        value={emailFromAddress}
                                        onChange={e => setEmailFromAddress(e.target.value)}
                                        className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="noreply@imaginecapital.ai"
                                        required
                                    />
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                        {sendgridDnsVerified ? 
                                            "Custom domain verified - using your domain" : 
                                            "Using default domain (noreply@imaginecapital.ai)"
                                        }
                                    </p>
                                </div>
                                
                                <div>
                                    <label htmlFor="emailReplyToAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reply-To Email Address</label>
                                    <input
                                        type="email"
                                        id="emailReplyToAddress"
                                        value={emailReplyToAddress}
                                        onChange={e => setEmailReplyToAddress(e.target.value)}
                                        className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="noreply@imaginecapital.ai"
                                        required
                                    />
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Email address for replies to notifications.</p>
                                </div>
                                
                                <div>
                                    <label htmlFor="emailFromName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">From Name</label>
                                    <input
                                        type="text"
                                        id="emailFromName"
                                        value={emailFromName}
                                        onChange={e => setEmailFromName(e.target.value)}
                                        className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Lead Machine Notifications"
                                        required
                                    />
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Display name for email notifications.</p>
                                </div>
                                
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="sendgridDnsVerified"
                                        checked={sendgridDnsVerified}
                                        onChange={e => setSendgridDnsVerified(e.target.checked)}
                                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                                    />
                                    <label htmlFor="sendgridDnsVerified" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                                        SendGrid DNS Verified (Custom Domain)
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Check this box if you have set up custom domain authentication with SendGrid.
                                </p>
                            </div>
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Webhook Settings</h3>
                            <label htmlFor="webhookUrl" className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">Webhook URL</label>
                              <input
                                  type="url"
                                  id="webhookUrl"
                                  value={webhookUrl}
                                  onChange={e => setWebhookUrl(e.target.value)}
                                  className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                                  placeholder="https://api.example.com/new-lead"
                              />
                              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Send a POST request with lead data when a new lead is created.</p>
                          </div>
                          <div>
                              <label htmlFor="webhookHeader" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Authorization Header (Optional)</label>
                              <input
                                  type="text"
                                  id="webhookHeader"
                                  value={webhookHeader}
                                  onChange={e => setWebhookHeader(e.target.value)}
                                  className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                                  placeholder="Bearer YOUR_SECRET_KEY"
                              />
                          </div>
                           <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Utilities</h3>
                              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                  Use these buttons to test if notifications are configured correctly.
                              </p>
                              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                  <button
                                      type="button"
                                      onClick={showTestNotification}
                                      className="flex items-center gap-2 py-2 px-4 bg-slate-500 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                                  >
                                      <LightBulbIcon className="w-5 h-5"/>
                                      Test Web Notification
                                  </button>
                                  <button
                                      type="button"
                                      onClick={handleTestEmail}
                                      disabled={isTestingEmail}
                                      className={`flex items-center gap-2 py-2 px-4 font-semibold rounded-lg transition-colors ${
                                          emailTestResult === 'success' 
                                              ? 'bg-green-500 text-white' 
                                              : emailTestResult === 'error'
                                              ? 'bg-red-500 text-white'
                                              : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300'
                                      }`}
                                  >
                                      {isTestingEmail ? (
                                          <>
                                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                              Sending...
                                          </>
                                      ) : emailTestResult === 'success' ? (
                                          <>
                                              <CheckIcon className="w-5 h-5"/>
                                              Email Sent!
                                          </>
                                      ) : emailTestResult === 'error' ? (
                                          <>
                                              <XMarkIcon className="w-5 h-5"/>
                                              Failed
                                          </>
                                      ) : (
                                          <>
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                              </svg>
                                              Test Email
                                          </>
                                      )}
                                  </button>
                              </div>
                              {emailTestResult === 'success' && (
                                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                                      Test email sent successfully! Check your inbox (including spam folder).
                                  </p>
                              )}
                              {emailTestResult === 'error' && (
                                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                      Failed to send test email. Check your SendGrid configuration and try again.
                                  </p>
                              )}
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                              <h3 className="text-lg font-medium text-red-600 dark:text-red-400">Advanced Settings</h3>
                              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                  Warning: This will sign you out, clear all locally cached data, and reload the application. This is useful for resolving display issues or forcing a resync with the database.
                              </p>
                              <button
                                  type="button"
                                  onClick={() => setResetConfirmOpen(true)}
                                  className="mt-4 flex items-center gap-2 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                              >
                                  <ArrowCounterClockwiseIcon className="w-5 h-5"/>
                                  Reset & Resync Data
                              </button>
                          </div>
                      </form>
                  ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Only company owners can change configuration settings.</p>
                  )
              )}
          </div>
          
          {/* Footer */}
          <div className="flex-shrink-0 p-6 md:p-8 border-t border-slate-200 dark:border-slate-700">
             {activeTab === 'config' && isOwner ? (
                <div className="flex justify-end items-center gap-4">
                    {errorMessage && <p className="text-sm text-red-500 dark:text-red-400 mr-auto animate-shake">{errorMessage}</p>}
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold rounded-lg transition-colors">Cancel</button>
                    <button
                        type="submit"
                        form="settings-config-form"
                        className={`py-2 px-4 font-semibold rounded-lg transition-colors w-36 flex justify-center items-center ${
                            saveState === 'saved' 
                                ? 'bg-green-500 text-white' 
                                : 'bg-teal-500 hover:bg-teal-600 text-white'
                        } disabled:opacity-70 disabled:cursor-wait`}
                        disabled={saveState === 'saving' || saveState === 'saved'}
                      >
                        {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? <><CheckIcon className="w-5 h-5 mr-2" /> Saved!</> : 'Save Settings'}
                      </button>
                </div>
             ) : (
                <div className="flex justify-end">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold rounded-lg transition-colors">Close</button>
                </div>
             )}
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={onResetAndResync}
        title="Confirm Application Reset"
        message="Are you sure you want to reset the application? You will be signed out, all local settings will be cleared, and the application will reload. This cannot be undone."
        confirmText="Yes, Reset"
      />
    </>
  );
};

export default SettingsModal;
