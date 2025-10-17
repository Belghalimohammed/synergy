import React from 'react';
import { Task, Item, ItemType, SavedImage, User } from '../types';
import { XMarkIcon, TrashIcon, PencilSquareIcon, CalendarDaysIcon, ClipboardDocumentListIcon, Bars2Icon, PhotoIcon, UserGroupIcon, UserCircleIcon } from './Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ViewItemModalProps {
  item: Item | null;
  isOpen: boolean;
  savedImages: SavedImage[];
  allUsers: User[];
  onClose: () => void;
  onEdit: (item: Item) => void;
  onDelete: (itemId: string) => void;
}

const ViewItemModal: React.FC<ViewItemModalProps> = ({ item, isOpen, savedImages, allUsers, onClose, onEdit, onDelete }) => {
  if (!isOpen || !item || item.type === ItemType.Note) return null;

  const task = item as Task;
  const attachedImage = savedImages.find(img => img.id === task.imageId);
  const createdBy = allUsers.find(u => u.id === task.createdBy)?.username || 'Unknown';
  const assignees = allUsers.filter(u => task.assignedTo.includes(u.id));
  
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      onDelete(task.id);
    }
  };
  
  const handleEdit = () => {
    onEdit(task);
  };
  
  const itemTypeDisplay = item.type.charAt(0).toUpperCase() + item.type.slice(1);

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
      <div className="bg-[var(--bg-secondary)] rounded-[var(--border-radius)] shadow-2xl w-full max-w-lg border border-[var(--border-color)]">
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{itemTypeDisplay} Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{task.title}</h3>
          </div>

          {attachedImage && (
             <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  <PhotoIcon className="w-4 h-4" />
                  Attached Image
                </label>
                <img src={`data:${attachedImage.mimeType};base64,${attachedImage.data}`} alt={attachedImage.name} className="rounded-[var(--border-radius)] max-w-full h-auto" />
            </div>
          )}

          {task.description && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                <ClipboardDocumentListIcon className="w-4 h-4" />
                Description
              </label>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={transformImageUri}>
                  {task.description}
                </ReactMarkdown>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                <CalendarDaysIcon className="w-4 h-4" />
                Due Date
              </label>
              <p className="text-[var(--text-primary)] font-semibold">{task.dueDate ? new Date(task.dueDate).toLocaleString() : 'Not set'}</p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                <Bars2Icon className="w-4 h-4" />
                Status
              </label>
              <p className="text-[var(--text-primary)] font-semibold">{task.status}</p>
            </div>
             <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                <UserCircleIcon className="w-4 h-4" />
                Created By
              </label>
              <p className="text-[var(--text-primary)] font-semibold">{createdBy}</p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                <UserGroupIcon className="w-4 h-4" />
                Assigned To
              </label>
              <p className="text-[var(--text-primary)] font-semibold">
                {assignees.length > 0 ? assignees.map(u => u.username).join(', ') : 'Unassigned'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-[var(--bg-tertiary)]/50 border-t border-[var(--border-color)] flex justify-between items-center">
          <button type="button" onClick={handleDelete} className="flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-md py-2 px-3 transition-colors">
            <TrashIcon className="w-4 h-4"/>
            Delete
          </button>
          <button type="button" onClick={handleEdit} className="flex items-center gap-2 bg-[var(--color-primary-500)] text-white px-5 py-2.5 rounded-[var(--border-radius)] text-sm font-semibold hover:bg-[var(--color-primary-600)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)]">
            <PencilSquareIcon className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewItemModal;