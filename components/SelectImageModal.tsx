import React, { useState } from 'react';
import { SavedImage } from '../types';
import { XMarkIcon } from './Icons';

interface SelectImageModalProps {
  isOpen: boolean;
  images: SavedImage[];
  onClose: () => void;
  onSelect: (image: SavedImage) => void;
}

const SelectImageModal: React.FC<SelectImageModalProps> = ({ isOpen, images, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredImages = images.filter(image => 
    image.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast">
      <div className="bg-[var(--bg-secondary)] rounded-[var(--border-radius)] shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-[var(--border-color)]">
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)] flex-shrink-0">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Select an Image</h2>
          <button onClick={onClose} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 flex-shrink-0">
          <input
            type="text"
            placeholder="Search images..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] transition-colors"
          />
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {filteredImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredImages.map(image => (
                <div key={image.id} onClick={() => onSelect(image)} className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[var(--border-radius)] overflow-hidden group cursor-pointer hover:border-[var(--color-primary-500)] hover:ring-2 hover:ring-[var(--color-primary-500)] transition-all">
                  <div className="aspect-square bg-[var(--bg-quaternary)]">
                    <img src={`data:${image.mimeType};base64,${image.data}`} alt={image.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <p className="p-2 text-xs text-[var(--text-secondary)] truncate">{image.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
              <p>No images found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectImageModal;