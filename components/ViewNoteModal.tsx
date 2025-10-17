import React from 'react';
import { Note, SavedImage } from '../types';
import { XMarkIcon, DocumentTextIcon } from './Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ViewNoteModalProps {
  note: Note | null;
  isOpen: boolean;
  savedImages: SavedImage[];
  onClose: () => void;
}

const ViewNoteModal: React.FC<ViewNoteModalProps> = ({ note, isOpen, savedImages, onClose }) => {
  if (!isOpen || !note) return null;

  const transformImageUri = (uri: string) => {
    if (uri.startsWith('image:')) {
      const imageId = uri.substring(6);
      const image = savedImages.find(img => img.id === imageId);
      if (image) {
        return `data:${image.mimeType};base64,${image.data}`;
      }
      return '';
    }
    return uri;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast">
      <div className="bg-[var(--bg-secondary)] rounded-[var(--border-radius)] shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col border border-[var(--border-color)]">
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <DocumentTextIcon className="w-5 h-5 text-[var(--color-primary-400)] flex-shrink-0" />
            <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">{note.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
           <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={transformImageUri}>
                {note.content}
              </ReactMarkdown>
            </div>
        </div>

        <div className="px-6 py-4 bg-[var(--bg-tertiary)]/50 border-t border-[var(--border-color)] flex justify-end items-center">
          <button type="button" onClick={onClose} className="bg-[var(--bg-quaternary)] text-[var(--text-primary)] px-5 py-2.5 rounded-[var(--border-radius)] text-sm font-semibold hover:bg-[var(--border-color)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewNoteModal;