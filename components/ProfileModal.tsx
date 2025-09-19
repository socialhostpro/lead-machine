import React, { useState, useEffect } from 'react';
import { Company, User } from '../types';
import { XMarkIcon, CheckIcon } from './icons';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  currentCompany: Company;
  onSaveUser: (user: User) => Promise<{ success: boolean; error?: string }>;
  onSaveCompany: (company: Company) => Promise<{ success: boolean; error?: string }>;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentCompany,
  onSaveUser,
  onSaveCompany,
}) => {
  const [userName, setUserName] = useState(currentUser.name);
  const [companyData, setCompanyData] = useState(currentCompany);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(currentUser.emailNotificationsEnabled ?? true);
  const [notificationFrequency, setNotificationFrequency] = useState(currentUser.notificationFrequency ?? 'immediate');
  const [notificationTypes, setNotificationTypes] = useState(currentUser.notificationTypes ?? {
    newMessage: true,
    leadUpdates: true,
    systemAlerts: true
  });
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUserName(currentUser.name);
      setCompanyData(currentCompany);
      setEmailNotificationsEnabled(currentUser.emailNotificationsEnabled ?? true);
      setNotificationFrequency(currentUser.notificationFrequency ?? 'immediate');
      setNotificationTypes(currentUser.notificationTypes ?? {
        newMessage: true,
        leadUpdates: true,
        systemAlerts: true
      });
      setSaveState('idle');
      setErrorMessage(null);
    }
  }, [isOpen, currentUser, currentCompany]);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveState('saving');
    setErrorMessage(null);
    
    const userToUpdate = { 
      ...currentUser, 
      name: userName,
      emailNotificationsEnabled,
      notificationFrequency,
      notificationTypes
    };
    
    const [userResult, companyResult] = await Promise.all([
      onSaveUser(userToUpdate),
      onSaveCompany(companyData)
    ]);

    if (userResult.success && companyResult.success) {
        setSaveState('saved');
        setTimeout(() => {
            onClose();
        }, 1500);
    } else {
        setSaveState('idle');
        const errors = [userResult.error, companyResult.error].filter(Boolean);
        setErrorMessage(errors.join(' ') || 'An unknown error occurred saving your profile.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8 w-full max-w-2xl m-4 relative animate-fade-in-up text-slate-800 dark:text-white">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold mb-6">My Profile</h2>
        
        <form onSubmit={handleSave} className="space-y-8">
            {/* User Profile Section */}
            <div className="space-y-4">
                 <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">Your Profile</h3>
                <div>
                    <label htmlFor="userName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                    <input
                        type="text"
                        id="userName"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                        required
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{currentUser.email}</p>
                 </div>
            </div>

            {/* Notification Preferences Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">Notification Preferences</h3>
                
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="emailNotificationsEnabled"
                            checked={emailNotificationsEnabled}
                            onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                        />
                        <label htmlFor="emailNotificationsEnabled" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                            Enable Email Notifications
                        </label>
                    </div>

                    {emailNotificationsEnabled && (
                        <>
                            <div>
                                <label htmlFor="notificationFrequency" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notification Frequency</label>
                                <select
                                    id="notificationFrequency"
                                    value={notificationFrequency}
                                    onChange={(e) => setNotificationFrequency(e.target.value as any)}
                                    className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="immediate">Immediate</option>
                                    <option value="hourly">Hourly Digest</option>
                                    <option value="daily">Daily Digest</option>
                                    <option value="disabled">Disabled</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notification Types</label>
                                <div className="space-y-2">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="newMessage"
                                            checked={notificationTypes.newMessage}
                                            onChange={(e) => setNotificationTypes(prev => ({ ...prev, newMessage: e.target.checked }))}
                                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                                        />
                                        <label htmlFor="newMessage" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                                            New Messages from Leads
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="leadUpdates"
                                            checked={notificationTypes.leadUpdates}
                                            onChange={(e) => setNotificationTypes(prev => ({ ...prev, leadUpdates: e.target.checked }))}
                                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                                        />
                                        <label htmlFor="leadUpdates" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                                            Lead Status Updates
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="systemAlerts"
                                            checked={notificationTypes.systemAlerts}
                                            onChange={(e) => setNotificationTypes(prev => ({ ...prev, systemAlerts: e.target.checked }))}
                                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                                        />
                                        <label htmlFor="systemAlerts" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                                            System Alerts
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Company Information Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">Company Information</h3>
                 <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={companyData.name}
                        onChange={handleCompanyChange}
                        className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                        required
                    />
                </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700 mt-6">
                {errorMessage && <p className="text-sm text-red-500 dark:text-red-400 mr-auto animate-shake">{errorMessage}</p>}
                <button type="button" onClick={onClose} className="py-2 px-4 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold rounded-lg transition-colors">Cancel</button>
                <button
                type="submit"
                className={`py-2 px-4 font-semibold rounded-lg transition-colors w-36 flex justify-center items-center ${
                    saveState === 'saved'
                        ? 'bg-green-500 text-white'
                        : 'bg-teal-500 hover:bg-teal-600 text-white'
                } disabled:opacity-70 disabled:cursor-wait`}
                disabled={saveState === 'saving' || saveState === 'saved'}
                >
                {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? <><CheckIcon className="w-5 h-5 mr-2"/> Saved!</> : 'Save Changes'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;