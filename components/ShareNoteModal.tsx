import React, { useState, useEffect } from 'react';
import { Note, User } from '../types';
import { XMarkIcon, UserGroupIcon } from './Icons';

interface ShareNoteModalProps {
  isOpen: boolean;
  note: Note | null;
  friends: User[];
  onClose: () => void;
  onUpdateShare: (updatedNote: Note) => void;
}

const ShareNoteModal: React.FC<ShareNoteModalProps> = ({ isOpen, note, friends, onClose, onUpdateShare }) => {
  const [sharedWith, setSharedWith] = useState<string[]>([]);

  useEffect(() => {
    if (note) {
      setSharedWith(note.sharedWith || []);
    }
  }, [note]);

  if (!isOpen || !note) return null;

  const handleToggleShare = (friendId: string) => {
    setSharedWith(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const handleSave = () => {
    onUpdateShare({ ...note, sharedWith });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast">
      <div className="bg-[var(--bg-secondary)] rounded-[var(--border-radius)] shadow-2xl w-full max-w-md border border-[var(--border-color)]">
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-6 h-6 text-[var(--color-primary-400)]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Share Note</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-[var(--text-secondary)] mb-1">Share "{note.title}" with:</p>
          <div className="max-h-64 overflow-y-auto bg-[var(--bg-tertiary)] rounded-md p-2 border border-[var(--border-color)]">
            {friends.length > 0 ? (
                <ul className="space-y-1">
                    {friends.map(friend => (
                    <li key={friend.id} onClick={() => handleToggleShare(friend.id)} className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-[var(--bg-quaternary)]">
                        <input
                        type="checkbox"
                        checked={sharedWith.includes(friend.id)}
                        readOnly
                        className="w-4 h-4 rounded text-[var(--color-primary-500)] bg-[var(--input-bg)] border-[var(--border-color)] focus:ring-[var(--color-primary-500)]"
                        />
                        <span className="font-medium text-[var(--text-primary)]">{friend.username}</span>
                    </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-sm text-[var(--text-muted)] p-4">You have no friends to share with yet.</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-[var(--bg-tertiary)]/50 border-t border-[var(--border-color)] flex justify-end gap-3">
          <button onClick={onClose} className="bg-[var(--bg-quaternary)] text-[var(--text-primary)] px-5 py-2.5 rounded-[var(--border-radius)] text-sm font-semibold hover:bg-[var(--border-color)] transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="bg-[var(--color-primary-500)] text-white px-5 py-2.5 rounded-[var(--border-radius)] text-sm font-semibold hover:bg-[var(--color-primary-600)] transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareNoteModal;