import React, { useState, useEffect, useCallback } from 'react';
import { WebForm } from '../types';
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon, ArrowLeftIcon, CodeBracketIcon } from './icons';
import ConfirmationModal from './ConfirmationModal';

interface FormsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  forms: WebForm[];
  onSave: (form: Omit<WebForm, 'id' | 'createdAt' | 'companyId'> | WebForm) => Promise<boolean>;
  onDelete: (formId: string) => void;
  onGetEmbedCode: (form: WebForm) => void;
}

const defaultForm = {
    name: '',
    title: 'Contact Us',
    description: 'Please fill out the form below and we will get back to you.',
    fields: {
        firstName: { enabled: true, required: true, label: 'First Name' },
        lastName: { enabled: true, required: true, label: 'Last Name' },
        email: { enabled: true, required: true, label: 'Email Address' },
        phone: { enabled: true, required: false, label: 'Phone Number' },
        company: { enabled: true, required: false, label: 'Company Name' },
        issueDescription: { enabled: true, required: false, label: 'How can we help?' },
    },
    config: {
        submitButtonText: 'Submit',
        theme: 'light',
        primaryColor: '#14b8a6', // teal-500
        successMessage: "Thank you for your submission! We'll be in touch soon.",
    },
};


const FormsManagementModal: React.FC<FormsManagementModalProps> = ({
  isOpen, onClose, forms, onSave, onDelete, onGetEmbedCode,
}) => {
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [currentForm, setCurrentForm] = useState<Omit<WebForm, 'id' | 'createdAt' | 'companyId'> | WebForm | null>(null);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<WebForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setView('list');
      setCurrentForm(null);
    }
  }, [isOpen]);

  const handleCreateNew = () => {
    setCurrentForm(defaultForm as any);
    setView('builder');
  };

  const handleEdit = (form: WebForm) => {
    setCurrentForm(form);
    setView('builder');
  };

  const handleBackToList = () => {
    setView('list');
    setCurrentForm(null);
  };
  
  const handleDeleteRequest = (form: WebForm) => {
    setFormToDelete(form);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (formToDelete) {
      onDelete(formToDelete.id);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentForm) return;
      setIsSaving(true);
      const success = await onSave(currentForm);
      setIsSaving(false);
      if (success) {
          handleBackToList();
      }
  };

  const updateFormValue = (path: string, value: any) => {
      if (!currentForm) return;
      setCurrentForm(prev => {
          const newForm = JSON.parse(JSON.stringify(prev));
          let current = newForm;
          const keys = path.split('.');
          for (let i = 0; i < keys.length - 1; i++) {
              current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
          return newForm;
      });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col animate-fade-in-up">
          <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-4">
                {view === 'builder' && (
                    <button onClick={handleBackToList} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                        <ArrowLeftIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                    </button>
                )}
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {view === 'list' ? 'Form Manager' : (currentForm && 'id' in currentForm) ? 'Edit Form' : 'Create Form'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {view === 'list' ? 'Manage your embeddable lead capture forms.' : 'Configure your form and get the embed code.'}
                    </p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </header>

          <main className="p-6 flex-grow overflow-y-auto">
            {view === 'list' && (
              <div>
                <button onClick={handleCreateNew} className="mb-6 w-full flex items-center justify-center gap-2 py-2 px-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-colors">
                  <PlusIcon className="w-5 h-5"/>
                  Create New Form
                </button>
                <div className="space-y-3">
                  {forms.length > 0 ? forms.map(form => (
                    <div key={form.id} className="bg-white dark:bg-slate-700/50 p-4 rounded-lg flex justify-between items-center shadow">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{form.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{form.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onGetEmbedCode(form)} title="Get Embed Code" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                            <CodeBracketIcon className="w-5 h-5 text-slate-600 dark:text-slate-300"/>
                        </button>
                        <button onClick={() => handleEdit(form)} title="Edit Form" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                            <PencilIcon className="w-5 h-5 text-slate-600 dark:text-slate-300"/>
                        </button>
                        <button onClick={() => handleDeleteRequest(form)} title="Delete Form" className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-500/20">
                            <TrashIcon className="w-5 h-5 text-red-500 dark:text-red-400"/>
                        </button>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">No forms created yet. Click the button above to start.</p>
                  )}
                </div>
              </div>
            )}
            {view === 'builder' && currentForm && (
                <form onSubmit={handleSaveForm} className="space-y-8">
                    <div>
                        <h3 className="text-lg font-medium text-slate-800 dark:text-white">General Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Form Name (Internal)</label>
                                <input id="name" type="text" value={currentForm.name} onChange={e => updateFormValue('name', e.target.value)} required className="mt-1 w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-white" />
                            </div>
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Public Title</label>
                                <input id="title" type="text" value={currentForm.title} onChange={e => updateFormValue('title', e.target.value)} required className="mt-1 w-full px-3 py-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-white" />
                            </div>
                        </div>
                         <div className="mt-4">
                            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Public Description</label>
                            <textarea id="description" value={currentForm.description} onChange={e => updateFormValue('description', e.target.value)} rows={2} className="mt-1 w-full px-3 py-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-white" />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium text-slate-800 dark:text-white">Form Fields</h3>
                        <div className="space-y-4 mt-4">
                            {Object.entries(currentForm.fields).map(([key, field]) => (
                                <div key={key} className="flex items-center justify-between p-3 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg">
                                    <label htmlFor={`field-label-${key}`} className="font-medium text-slate-700 dark:text-slate-300">{field.label}</label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <input id={`field-enabled-${key}`} type="checkbox" checked={field.enabled} onChange={e => updateFormValue(`fields.${key}.enabled`, e.target.checked)} className="h-4 w-4 rounded text-teal-600" />
                                            <label htmlFor={`field-enabled-${key}`} className="text-sm">Enabled</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input id={`field-required-${key}`} type="checkbox" checked={field.required} onChange={e => updateFormValue(`fields.${key}.required`, e.target.checked)} disabled={!field.enabled} className="h-4 w-4 rounded text-teal-600"/>
                                            <label htmlFor={`field-required-${key}`} className="text-sm">Required</label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h3 className="text-lg font-medium text-slate-800 dark:text-white">Configuration</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                             <div>
                                <label htmlFor="submitButtonText" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Submit Button Text</label>
                                <input id="submitButtonText" type="text" value={currentForm.config.submitButtonText} onChange={e => updateFormValue('config.submitButtonText', e.target.value)} required className="mt-1 w-full px-3 py-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-white" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="successMessage" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Success Message</label>
                            <textarea id="successMessage" value={currentForm.config.successMessage} onChange={e => updateFormValue('config.successMessage', e.target.value)} rows={3} required className="mt-1 w-full px-3 py-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-white" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={handleBackToList} className="py-2 px-4 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg disabled:opacity-50">
                            {isSaving ? 'Saving...' : 'Save Form'}
                        </button>
                    </div>
                </form>
            )}
          </main>
        </div>
      </div>
      {formToDelete && (
        <ConfirmationModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Form"
          message={`Are you sure you want to permanently delete the "${formToDelete.name}" form? This cannot be undone.`}
          confirmText="Delete"
        />
      )}
    </>
  );
};

export default FormsManagementModal;
