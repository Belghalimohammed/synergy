import React, { useState, useEffect } from 'react';
import { XMarkIcon, DocumentMagnifyingGlassIcon, ClipboardCheckIcon, CheckIcon } from './Icons';
import { summarizeContent } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SummaryModalProps {
  isOpen: boolean;
  content: string;
  onClose: () => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, content, onClose }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && content) {
      const generateSummary = async () => {
        setIsLoading(true);
        setError(null);
        setSummary(null);
        setCopied(false);
        try {
          const result = await summarizeContent(content);
          setSummary(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to generate summary.');
        } finally {
          setIsLoading(false);
        }
      };
      generateSummary();
    }
  }, [isOpen, content]);

  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast">
      <div className="bg-[var(--bg-secondary)] rounded-[var(--border-radius)] shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col border border-[var(--border-color)]">
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <DocumentMagnifyingGlassIcon className="w-6 h-6 text-[var(--color-primary-400)]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">AI Summary</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg className="animate-spin h-8 w-8 text-[var(--color-primary-500)] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-lg font-semibold text-[var(--text-primary)]">Generating summary...</p>
              <p className="text-sm text-[var(--text-secondary)]">The AI is analyzing the content.</p>
            </div>
          )}
          {error && <p className="text-red-500 text-center">{error}</p>}
          {summary && (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-[var(--bg-tertiary)]/50 border-t border-[var(--border-color)] flex justify-end items-center gap-3">
          {summary && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-[var(--bg-quaternary)] text-[var(--text-primary)] px-4 py-2 rounded-md text-sm font-semibold hover:bg-[var(--border-color)] transition-colors"
            >
              {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardCheckIcon className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          )}
          <button type="button" onClick={onClose} className="bg-[var(--color-primary-500)] text-white px-5 py-2.5 rounded-[var(--border-radius)] text-sm font-semibold hover:bg-[var(--color-primary-600)] transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
