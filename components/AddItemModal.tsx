import React, { useState } from 'react';
import { ItemType, Task, SavedImage, User } from '../types';
import { XMarkIcon, PhotoIcon, XCircleIcon } from './Icons';
import SelectImageModal from './SelectImageModal';

interface AddItemModalProps {
  isOpen: boolean;
  statuses: string[];
  savedImages: SavedImage[];
  currentUser: User;
  friends: User[];
  onClose: () => void;
  onAddItem: (item: Omit<Task, 'id' | 'workspaceId'>) => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, statuses, savedImages, currentUser, friends, onClose, onAddItem }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState(statuses[0] || '');
  const [type, setType] = useState<ItemType.Task | ItemType.Event>(ItemType.Task);
  const [imageId, setImageId] = useState<string | undefined>(undefined);
  const [isSelectingImage, setIsSelectingImage] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setStatus(statuses[0] || '');
    setType(ItemType.Task);
    setImageId(undefined);
    setAssignedTo([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddItem({
      type,
      title,
      description,
      status,
      dueDate: dueDate ? new Date(dueDate) : null,
      imageId,
      createdBy: currentUser.id,
      assignedTo,
    });
    
    resetForm();
    onClose();
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  }

  const handleImageSelect = (image: SavedImage) => {
    setImageId(image.id);
    setIsSelectingImage(false);
  }
  
  const handleAssigneeToggle = (userId: string) => {
    setAssignedTo(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectedImage = savedImages.find(img => img.id === imageId);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast">
        <div className="bg-[var(--bg-secondary)] rounded-[var(--border-radius)] shadow-2xl w-full max-w-lg border border-[var(--border-color)]">
          <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Create New Item</h2>
            <button onClick={handleClose} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Type</label>
                <div className="flex gap-2">
                  {(['Task', 'Event'] as const).map(itemType => (
                    <button
                      type="button"
                      key={itemType}
                      onClick={() => setType(itemType.toLowerCase() as ItemType.Task | ItemType.Event)}
                      className={`flex-1 p-2.5 rounded-[var(--border-radius)] text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)] ${
                          type === itemType.toLowerCase() ? 'bg-[var(--color-primary-500)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-quaternary)]'
                      }`}
                    >
                      {itemType}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="add-title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Title</label>
                <input type="text" id="add-title" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] transition-colors" required />
              </div>
              <div>
                <label htmlFor="add-description" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
                <textarea id="add-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] transition-colors" />
              </div>
               <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Assigned To</label>
                <div className="bg-[var(--bg-tertiary)] p-2 rounded-md max-h-28 overflow-y-auto">
                    {friends.length > 0 ? (
                        <ul className="space-y-1">
                            {friends.map(friend => (
                                <li key={friend.id} onClick={() => handleAssigneeToggle(friend.id)} className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-[var(--bg-quaternary)]">
                                    <input type="checkbox" readOnly checked={assignedTo.includes(friend.id)} className="w-4 h-4 rounded text-[var(--color-primary-500)] bg-[var(--input-bg)] border-[var(--border-color)] focus:ring-[var(--color-primary-500)]" />
                                    <span>{friend.username}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-xs text-center text-[var(--text-muted)] p-2">Add friends to assign tasks.</p>}
                </div>
               </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Attached Image</label>
                {selectedImage ? (
                  <div className="flex items-center gap-2 p-2 bg-[var(--bg-tertiary)] rounded-[var(--border-radius)]">
                    <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} alt={selectedImage.name} className="w-12 h-12 rounded-md object-cover" />
                    <p className="text-sm text-[var(--text-primary)] flex-1 truncate">{selectedImage.name}</p>
                    <button type="button" onClick={() => setImageId(undefined)} className="p-1 text-[var(--text-secondary)] hover:text-red-400"><XCircleIcon className="w-5 h-5"/></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setIsSelectingImage(true)} className="w-full flex items-center justify-center gap-2 p-2.5 bg-transparent border-2 border-dashed border-[var(--border-color)] rounded-[var(--border-radius)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-slate-600 hover:text-[var(--text-primary)] transition-colors">
                    <PhotoIcon className="w-5 h-5"/>
                    Attach an Image
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-due-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Due Date</label>
                  <input type="datetime-local" id="add-due-date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] transition-colors" />
                </div>
                <div>
                  <label htmlFor="add-status" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
                  <select id="add-status" value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] transition-colors">
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-[var(--bg-tertiary)]/50 border-t border-[var(--border-color)] flex justify-end">
              <button type="submit" className="bg-[var(--color-primary-500)] text-white px-5 py-2.5 rounded-[var(--border-radius)] text-sm font-semibold hover:bg-[var(--color-primary-600)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)]">
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
      <SelectImageModal
        isOpen={isSelectingImage}
        images={savedImages}
        onClose={() => setIsSelectingImage(false)}
        onSelect={handleImageSelect}
      />
    </>
  );
};

export default AddItemModal;