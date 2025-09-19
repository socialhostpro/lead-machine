import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { XMarkIcon } from './icons';

interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  lead: Lead;
}

const EditLeadModal: React.FC<EditLeadModalProps> = ({ isOpen, onClose, onSave, lead }) => {
  const [formData, setFormData] = useState(lead);

  useEffect(() => {
    setFormData(lead);
  }, [lead]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Please fill in First Name, Last Name, and Email.');
      return;
    }
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md m-4 relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Edit Lead</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
              <input type="text" id="firstName" value={formData.firstName} onChange={handleChange} className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500" required />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
              <input type="text" id="lastName" value={formData.lastName} onChange={handleChange} className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500" required />
            </div>
          </div>
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company</label>
            <input type="text" id="company" value={formData.company} onChange={handleChange} className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input type="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500" required />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
            <input type="tel" id="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500" />
          </div>
          <div>
            <label htmlFor="issueDescription" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Issue Description</label>
            <textarea
              id="issueDescription"
              value={formData.issueDescription || ''}
              onChange={handleChange}
              rows={4}
              className="mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
              placeholder="Enter any relevant details..."
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="py-2 px-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-colors">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLeadModal;
