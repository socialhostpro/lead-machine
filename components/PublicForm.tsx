import React, { useState, useEffect } from 'react';
import { WebForm } from '../types';
import { supabase } from '../utils/supabase';
import { ArrowPathIcon } from './icons';

interface PublicFormProps {
  formId: string;
}

type FormState = 'loading' | 'ready' | 'submitting' | 'submitted' | 'error';
type FormData = { [key: string]: string };

const PublicForm: React.FC<PublicFormProps> = ({ formId }) => {
  const [formConfig, setFormConfig] = useState<WebForm | null>(null);
  const [formState, setFormState] = useState<FormState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({});

  useEffect(() => {
    const fetchFormConfig = async () => {
      if (!formId) {
        setFormState('error');
        setErrorMessage('Form ID is missing.');
        return;
      }

      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (error || !data) {
        console.error('Error fetching form config:', error);
        setFormState('error');
        setErrorMessage('This form could not be loaded. Please check the form ID.');
      } else {
        setFormConfig(data as any);
        setFormState('ready');
      }
    };

    fetchFormConfig();
  }, [formId]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConfig) return;
    
    setFormState('submitting');
    setErrorMessage(null);

    const leadData: { [key: string]: string } = {};
    for (const key in formConfig.fields) {
        if ((formConfig.fields as any)[key].enabled) {
            leadData[key] = formData[key] || '';
        }
    }
    
    const { error } = await supabase.rpc('create_lead_from_form', {
        form_id_in: formId,
        lead_data: leadData,
    });
    
    if (error) {
        console.error('Submission error:', error);
        setErrorMessage(error.message || 'An unexpected error occurred. Please try again.');
        setFormState('error');
    } else {
        setFormState('submitted');
    }
  };


  const renderField = (key: string, field: any) => {
      const commonProps = {
          id: key,
          name: key,
          required: field.required,
          value: formData[key] || '',
          onChange: handleInputChange,
          className: "mt-1 block w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
      };

      if (key === 'issueDescription') {
          return <textarea {...commonProps} rows={4} />;
      }
      return <input type={key === 'email' ? 'email' : 'text'} {...commonProps} />;
  };

  if (formState === 'loading') {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-900">
        <ArrowPathIcon className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-xl mx-auto">
        {formConfig && (
          <div className="bg-white dark:bg-slate-800/50 p-8 rounded-lg shadow-md border border-slate-200 dark:border-slate-800">
            {formState === 'submitted' ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Thank You!</h2>
                <p className="text-slate-600 dark:text-slate-300">{formConfig.config.successMessage}</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{formConfig.title}</h1>
                    {formConfig.description && <p className="text-slate-500 dark:text-slate-400 mt-2">{formConfig.description}</p>}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {Object.entries(formConfig.fields).map(([key, field]) => 
                      field.enabled && (
                        <div key={key}>
                          <label htmlFor={key} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {renderField(key, field)}
                        </div>
                      )
                    )}

                    {formState === 'error' && errorMessage && (
                      <p className="text-sm text-red-500 text-center">{errorMessage}</p>
                    )}
                    
                    <div>
                      <button
                        type="submit"
                        disabled={formState === 'submitting'}
                        className="flex w-full justify-center rounded-md border border-transparent bg-teal-500 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-wait transition-colors"
                      >
                        {formState === 'submitting' ? (
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        ) : (
                            formConfig.config.submitButtonText
                        )}
                      </button>
                    </div>
                </form>
              </>
            )}
          </div>
        )}
         {formState === 'error' && !formConfig && (
            <div className="bg-white dark:bg-slate-800/50 p-8 rounded-lg shadow-md border border-red-300 dark:border-red-700 text-center">
                 <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-4">Error</h2>
                 <p className="text-slate-600 dark:text-slate-300">{errorMessage}</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default PublicForm;
