import React, { useState } from 'react';
import { Task, Item } from '../../types';
import { PlusCircleIcon, PencilSquareIcon, Bars2Icon, TrashIcon } from '../Icons';

interface KanbanTaskCardProps {
  task: Task;
  onSelectItem: (item: Item) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDelete: (itemId: string) => void;
}

const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({ task, onSelectItem, onDragStart, onDelete }) => {
  return (
    <div
      draggable
      onClick={() => onSelectItem(task)}
      onDragStart={(e) => onDragStart(e, task.id)}
      className="bg-[var(--bg-tertiary)] p-4 rounded-md border border-[var(--border-color)] cursor-grab active:cursor-grabbing hover:bg-[var(--bg-quaternary)] transition-colors group"
    >
      <div className="flex justify-between items-start gap-2">
        <p className="font-semibold text-[var(--text-primary)] mb-2 flex-1 break-words">{task.title}</p>
        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onSelectItem(task); }} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <PencilSquareIcon className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1 text-[var(--text-secondary)] hover:text-red-400">
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
      </div>
      {task.description && <p className="text-sm text-[var(--text-secondary)] mb-3 break-words">{task.description}</p>}
      {task.dueDate && (
        <p className="text-xs text-[var(--text-muted)]">
          Due: {new Date(task.dueDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
};

interface KanbanColumnProps {
  status: string;
  tasks: Task[];
  onSelectItem: (item: Item) => void;
  onDelete: (itemId: string) => void;
  onCardDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onColumnDragStart: (e: React.DragEvent<HTMLDivElement>, status: string) => void;
  isDraggingColumn: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, tasks, onSelectItem, onDelete, onCardDragStart, onColumnDragStart, isDraggingColumn }) => {
  return (
    <div
      className={`w-80 flex-shrink-0 flex flex-col bg-[var(--bg-secondary)]/80 rounded-[var(--border-radius)] transition-all duration-200 ${isDraggingColumn ? 'opacity-50' : ''}`}
    >
      <div 
        draggable
        onDragStart={(e) => onColumnDragStart(e, status)}
        className="p-4 border-b border-[var(--border-color)] flex items-center justify-between cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{status}</h2>
            <span className="text-sm font-normal text-[var(--text-muted)]">{tasks.length}</span>
        </div>
        <Bars2Icon className="w-5 h-5 text-[var(--text-muted)]" />
      </div>
      <div className="p-2 h-full overflow-y-auto space-y-2">
        {tasks.map(task => (
          <KanbanTaskCard key={task.id} task={task} onSelectItem={onSelectItem} onDragStart={onCardDragStart} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
};

interface KanbanViewProps {
  tasks: Task[];
  statuses: string[];
  onUpdateStatus: (taskId: string, newStatus: string) => void;
  onSelectItem: (item: Item) => void;
  onSetStatuses: (updater: string[] | ((prev: string[]) => string[])) => void;
  onDelete: (itemId: string) => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({ tasks, statuses, onUpdateStatus, onSelectItem, onSetStatuses, onDelete }) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedStatus, setDraggedStatus] = useState<string | null>(null);
  const [newStatusName, setNewStatusName] = useState('');
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: {type: 'task', id: string} | {type: 'status', id: string}) => {
    if (item.type === 'task') {
        setDraggedTaskId(item.id);
    } else {
        setDraggedStatus(item.id);
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: string) => {
    e.preventDefault();
    
    // Handle card drop
    if (draggedTaskId) {
        const task = tasks.find(t => t.id === draggedTaskId);
        if (task && task.status !== targetStatus) {
            onUpdateStatus(draggedTaskId, targetStatus);
        }
    }
    // Handle column drop
    else if (draggedStatus && draggedStatus !== targetStatus) {
        onSetStatuses(prevStatuses => {
            const draggedIndex = prevStatuses.findIndex(s => s === draggedStatus);
            const targetIndex = prevStatuses.findIndex(s => s === targetStatus);
            
            const newStatuses = [...prevStatuses];
            const [removed] = newStatuses.splice(draggedIndex, 1);
            newStatuses.splice(targetIndex, 0, removed);
            
            return newStatuses;
        });
    }

    handleDragEnd();
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDraggedStatus(null);
  };
  
  const handleAddNewStatus = (e: React.FormEvent) => {
      e.preventDefault();
      if (newStatusName.trim() && !statuses.includes(newStatusName.trim())) {
          onSetStatuses(prev => [...prev, newStatusName.trim()]);
          setNewStatusName('');
          setIsAddingStatus(false);
      }
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <h1 className="text-3xl font-bold mb-6 text-[var(--text-primary)]">Kanban Board</h1>
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4" onDragEnd={handleDragEnd}>
        {statuses.map(status => (
          <div key={status} onDrop={(e) => handleDrop(e, status)} onDragOver={handleDragOver}>
            <KanbanColumn
              status={status}
              tasks={tasks.filter(t => t.status === status)}
              onSelectItem={onSelectItem}
              onDelete={onDelete}
              onCardDragStart={(e, taskId) => handleDragStart(e, { type: 'task', id: taskId })}
              onColumnDragStart={(e, statusId) => handleDragStart(e, { type: 'status', id: statusId })}
              isDraggingColumn={draggedStatus === status}
            />
          </div>
        ))}
        <div className="w-80 flex-shrink-0">
            {isAddingStatus ? (
                <form onSubmit={handleAddNewStatus} className="p-4 bg-[var(--bg-secondary)] rounded-[var(--border-radius)] border border-[var(--border-color)]">
                    <input 
                        type="text"
                        autoFocus
                        value={newStatusName}
                        onChange={e => setNewStatusName(e.target.value)}
                        placeholder="New column name..."
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                    />
                    <div className="flex gap-2 mt-2">
                        <button type="submit" className="flex-1 bg-[var(--color-primary-500)] text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-[var(--color-primary-600)]">Add</button>
                        <button type="button" onClick={() => setIsAddingStatus(false)} className="flex-1 bg-[var(--bg-quaternary)] text-[var(--text-primary)] px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-[var(--border-color)]">Cancel</button>
                    </div>
                </form>
            ) : (
                <button onClick={() => setIsAddingStatus(true)} className="w-full h-12 flex items-center justify-center gap-2 bg-transparent text-[var(--text-secondary)] rounded-[var(--border-radius)] border-2 border-dashed border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] hover:border-slate-600 hover:text-[var(--text-primary)] transition-colors">
                    <PlusCircleIcon className="w-5 h-5" />
                    Add New Column
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default KanbanView;