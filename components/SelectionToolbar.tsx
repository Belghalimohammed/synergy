import React from 'react';
import { ClipboardDocumentListIcon, DocumentTextIcon, SparklesIcon } from './Icons';

interface SelectionToolbarProps {
  position: { x: number; y: number };
  onAction: (action: 'createTask' | 'createNote' | 'aiSearchNote') => void;
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ position, onAction }) => {
  const actions = [
    { id: 'createTask', label: 'Create Task', icon: ClipboardDocumentListIcon },
    { id: 'createNote', label: 'Create Note', icon: DocumentTextIcon },
    { id: 'aiSearchNote', label: 'AI Search Note', icon: SparklesIcon },
  ] as const;

  return (
    <div
      className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] shadow-2xl flex items-center p-1 animate-fade-in-fast"
      style={{ top: position.y, left: position.x }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {actions.map(action => (
        <button
          key={action.id}
          title={action.label}
          onClick={() => onAction(action.id)}
          className="p-2 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <action.icon className="w-5 h-5" />
        </button>
      ))}
    </div>
  );
};

export default SelectionToolbar;