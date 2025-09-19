import React, { useState, useEffect } from 'react';
import { Company, User } from '../types';
import { XMarkIcon, CheckIcon } from './icons';
import { AVAILABLE_SOUNDS, testNotificationSound, requestNotificationPermission } from '../utils/notificationSounds';

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
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(currentUser.email_notifications_enabled ?? true);
  const [notificationFrequency, setNotificationFrequency] = useState(currentUser.notification_frequency ?? 'immediate');
  const [notificationTypes, setNotificationTypes] = useState(currentUser.notification_types ?? {
    newMessage: true,
    leadUpdates: true,
    systemAlerts: true
  });
  const [soundNotificationsEnabled, setSoundNotificationsEnabled] = useState(currentUser.sound_notifications_enabled ?? true);
  const [notificationVolume, setNotificationVolume] = useState(currentUser.notification_volume ?? 0.7);
  const [newLeadSound, setNewLeadSound] = useState(currentUser.new_lead_sound ?? 'notification');
  const [emailSound, setEmailSound] = useState(currentUser.email_sound ?? 'email');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUserName(currentUser.name);
      setCompanyData(currentCompany);
      setEmailNotificationsEnabled(currentUser.email_notifications_enabled ?? true);
      setNotificationFrequency(currentUser.notification_frequency ?? 'immediate');
      setNotificationTypes(currentUser.notification_types ?? {
        newMessage: true,
        leadUpdates: true,
        systemAlerts: true
      });
      setSoundNotificationsEnabled(currentUser.sound_notifications_enabled ?? true);
      setNotificationVolume(currentUser.notification_volume ?? 0.7);
      setNewLeadSound(currentUser.new_lead_sound ?? 'notification');
      setEmailSound(currentUser.email_sound ?? 'email');
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
      email_notifications_enabled: emailNotificationsEnabled,
      notification_frequency: notificationFrequency,
      notification_types: notificationTypes,
      sound_notifications_enabled: soundNotificationsEnabled,
      notification_volume: notificationVolume,
      new_lead_sound: newLeadSound,
      email_sound: emailSound
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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 transition-opacity p-4 py-8 overflow-y-auto">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl min-h-0 max-h-none relative animate-fade-in-up text-slate-800 dark:text-white">
        <div className="sticky top-0 bg-slate-100 dark:bg-slate-800 p-6 md:p-8 pb-4 border-b border-slate-200 dark:border-slate-700 z-10">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white" title="Close Profile Settings">
            <XMarkIcon className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold">My Profile</h2>
        </div>
        
        <div className="p-6 md:p-8 pt-4 pb-8">
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

            {/* Sound Notification Settings */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">Sound Notifications</h3>
                
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="soundNotificationsEnabled"
                            checked={soundNotificationsEnabled}
                            onChange={(e) => setSoundNotificationsEnabled(e.target.checked)}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                        />
                        <label htmlFor="soundNotificationsEnabled" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                            Enable Sound Notifications
                        </label>
                    </div>

                    {soundNotificationsEnabled && (
                        <>
                            <div>
                                <label htmlFor="notificationVolume" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Volume: {Math.round(notificationVolume * 100)}%
                                </label>
                                <input
                                    type="range"
                                    id="notificationVolume"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={notificationVolume}
                                    onChange={(e) => setNotificationVolume(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                                />
                            </div>

                            <div>
                                <label htmlFor="newLeadSound" className="block text-sm font-medium text-slate-700 dark:text-slate-300">New Lead Sound</label>
                                <div className="flex gap-2 mt-1">
                                    <select
                                        id="newLeadSound"
                                        value={newLeadSound}
                                        onChange={(e) => setNewLeadSound(e.target.value)}
                                        className="flex-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                                    >
                                        {Object.entries(AVAILABLE_SOUNDS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => testNotificationSound(newLeadSound as any, notificationVolume)}
                                        className="px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm rounded-md transition-colors"
                                        title="Test sound"
                                    >
                                        Test
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="emailSound" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Notification Sound</label>
                                <div className="flex gap-2 mt-1">
                                    <select
                                        id="emailSound"
                                        value={emailSound}
                                        onChange={(e) => setEmailSound(e.target.value)}
                                        className="flex-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                                    >
                                        {Object.entries(AVAILABLE_SOUNDS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => testNotificationSound(emailSound as any, notificationVolume)}
                                        className="px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm rounded-md transition-colors"
                                        title="Test sound"
                                    >
                                        Test
                                    </button>
                                </div>
                            </div>

                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                <p>📢 Sound notifications require browser permission. Click test to enable.</p>
                                <button
                                    type="button"
                                    onClick={requestNotificationPermission}
                                    className="text-teal-600 dark:text-teal-400 hover:underline"
                                >
                                    Request notification permission
                                </button>
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
    </div>
  );
};

export default ProfileModal;