import React, { useState } from 'react';
import { XMarkIcon, ClipboardIcon, CheckIcon } from './icons';

interface EmbedCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
}

const EmbedCodeModal: React.FC<EmbedCodeModalProps> = ({ isOpen, onClose, formId }) => {
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;

  const embedUrl = `${window.location.origin}/form/${formId}`;
  const embedCode = `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="600px"\n  frameborder="0"\n  style="border: 1px solid #ccc; border-radius: 8px;"\n></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[70]">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-2xl m-4 relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Get Embed Code</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Copy and paste this code into your website's HTML where you want the form to appear.
        </p>
        <div className="relative">
          <textarea
            readOnly
            value={embedCode}
            rows={6}
            className="w-full bg-white dark:bg-slate-900/70 border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-800 dark:text-slate-200 focus:ring-teal-500 focus:border-teal-500 font-mono text-sm p-4 pr-12"
          />
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            title="Copy to Clipboard"
          >
            {copied ? (
              <CheckIcon className="w-5 h-5 text-green-500" />
            ) : (
              <ClipboardIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            )}
          </button>
        </div>
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmbedCodeModal;