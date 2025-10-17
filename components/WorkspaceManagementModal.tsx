import React, { useState } from 'react';
import { Workspace } from '../types';
import { XMarkIcon, PencilSquareIcon, CheckIcon, TrashIcon } from './Icons';

interface WorkspaceManagementModalProps {
  isOpen: boolean;
  workspaces: Workspace[];
  onClose: () => void;
  onSave: (workspace: Omit<Workspace, 'id' | 'createdAt'>, id: string) => void;
  onDelete: (workspaceId: string) => void;
}

const WorkspaceManagementModal: React.FC<WorkspaceManagementModalProps> = ({
  isOpen,
  workspaces,
  onClose,
  onSave,
  onDelete,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!isOpen) return null;

  const handleEdit = (workspace: Workspace) => {
    setEditingId(workspace.id);
    setEditingName(workspace.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSave = (id: string) => {
    if (editingName.trim()) {
      onSave({ name: editingName.trim() }, id);
    }
    handleCancelEdit();
  };

  const handleDelete = (workspace: Workspace) => {
    if (window.confirm(`Are you sure you want to delete the "${workspace.name}" workspace? This will delete all associated tasks, notes, and data.`)) {
      onDelete(workspace.id);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast">
      <div className="bg-[var(--bg-secondary)] rounded-[var(--border-radius)] shadow-2xl w-full max-w-md border border-[var(--border-color)]">
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Manage Workspaces</h2>
          <button onClick={onClose} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto">
            <ul className="space-y-2">
                {workspaces.map(w => (
                    <li key={w.id} className="flex items-center justify-between p-2 bg-[var(--bg-tertiary)] rounded-md">
                        {editingId === w.id ? (
                            <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSave(w.id)}
                                onBlur={() => handleSave(w.id)}
                                className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-2 py-1 text-sm"
                            />
                        ) : (
                            <span className="flex-1 text-sm font-medium text-[var(--text-primary)] truncate">{w.name}</span>
                        )}
                        <div className="flex items-center gap-1 ml-4">
                            {editingId === w.id ? (
                                <button onClick={() => handleSave(w.id)} className="p-2 text-[var(--text-secondary)] hover:text-green-500">
                                    <CheckIcon className="w-5 h-5"/>
                                </button>
                            ) : (
                                <button onClick={() => handleEdit(w)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                    <PencilSquareIcon className="w-5 h-5"/>
                                </button>
                            )}
                            <button onClick={() => handleDelete(w)} className="p-2 text-[var(--text-secondary)] hover:text-red-400">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
        
        <div className="px-6 py-4 bg-[var(--bg-tertiary)]/50 border-t border-[var(--border-color)] flex justify-end">
          <button onClick={onClose} className="bg-[var(--color-primary-500)] text-white px-5 py-2.5 rounded-[var(--border-radius)] text-sm font-semibold hover:bg-[var(--color-primary-600)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)]">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceManagementModal;
