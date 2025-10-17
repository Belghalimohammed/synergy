import React, { useState, useMemo } from 'react';
import { Task, Item, User } from '../../types';
import { PencilSquareIcon, TrashIcon, SparklesIcon, ChevronUpDownIcon, ArrowUpIcon, ArrowDownIcon, ArrowDownTrayIcon } from '../Icons';

type SortableKeys = 'title' | 'status' | 'dueDate' | 'createdBy';
interface SortConfig {
  key: SortableKeys;
  direction: 'ascending' | 'descending';
}

interface TaskListViewProps {
  tasks: Task[];
  statuses: string[];
  allUsers: User[];
  onUpdateStatus: (taskId: string, newStatus: string) => void;
  onSelectItem: (item: Item) => void;
  onDelete: (itemId: string) => void;
  onAICommand: (prompt: string) => Promise<void>;
}

const TaskListView: React.FC<TaskListViewProps> = ({ tasks, statuses, allUsers, onUpdateStatus, onSelectItem, onDelete, onAICommand }) => {
  const [aiTaskPrompt, setAiTaskPrompt] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'dueDate', direction: 'ascending' });
  
  const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u.username])), [allUsers]);

  const handleAIPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTaskPrompt.trim() || isGeneratingPlan) return;

    setIsGeneratingPlan(true);
    try {
      await onAICommand(aiTaskPrompt);
      setAiTaskPrompt('');
    } catch(error) {
        console.error("AI plan generation failed", error);
        alert("Sorry, I couldn't generate a plan for that.");
    } finally {
        setIsGeneratingPlan(false);
    }
  };

  const sortedAndFilteredTasks = useMemo(() => {
    let filteredTasks = tasks;

    // Filter by tab
    if (activeTab !== 'All') {
      filteredTasks = filteredTasks.filter(task => task.status === activeTab);
    }

    // Filter by search term
    if (searchTerm) {
      filteredTasks = filteredTasks.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    if (sortConfig !== null) {
      filteredTasks.sort((a, b) => {
        let aValue, bValue;

        if (sortConfig.key === 'createdBy') {
          aValue = userMap.get(a.createdBy) || '';
          bValue = userMap.get(b.createdBy) || '';
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        let comparison = 0;
        if (sortConfig.key === 'dueDate' && aValue instanceof Date && bValue instanceof Date) {
            comparison = aValue.getTime() - bValue.getTime();
        } else {
            if (aValue < bValue) comparison = -1;
            if (aValue > bValue) comparison = 1;
        }

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }

    return filteredTasks;
  }, [tasks, activeTab, searchTerm, sortConfig, userMap]);
  
  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortableKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronUpDownIcon className="w-4 h-4 text-[var(--text-muted)]" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUpIcon className="w-4 h-4 text-[var(--text-primary)]" />;
    }
    return <ArrowDownIcon className="w-4 h-4 text-[var(--text-primary)]" />;
  };
  
  const handleExport = () => {
    const headers = ['Title', 'Description', 'Status', 'Due Date', 'Created By', 'Assigned To'];
    const rows = sortedAndFilteredTasks.map(task => [
        `"${task.title.replace(/"/g, '""')}"`,
        `"${(task.description || '').replace(/"/g, '""')}"`,
        task.status,
        task.dueDate ? new Date(task.dueDate).toISOString() : '',
        userMap.get(task.createdBy) || task.createdBy,
        `"${task.assignedTo.map(id => userMap.get(id) || id).join(', ')}"`
    ].join(','));
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tasks_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = ['All', ...statuses];

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">Tasks & Events</h1>
      
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-4">
          <form onSubmit={handleAIPlanSubmit}>
              <label htmlFor="ai-plan-prompt" className="text-sm font-semibold text-[var(--color-primary-400)] mb-2 block">Plan with AI</label>
              <div className="relative">
                  <input
                      id="ai-plan-prompt"
                      type="text"
                      value={aiTaskPrompt}
                      onChange={(e) => setAiTaskPrompt(e.target.value)}
                      placeholder='e.g., "plan a marketing campaign for a new app"'
                      disabled={isGeneratingPlan}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md py-2.5 pl-4 pr-12 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] transition-colors disabled:opacity-50"
                  />
                   <button type="submit" disabled={isGeneratingPlan || !aiTaskPrompt.trim()} className="absolute inset-y-0 right-0 flex items-center pr-3 disabled:opacity-40 disabled:cursor-not-allowed group">
                      <SparklesIcon className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--color-primary-400)] transition-colors" />
                  </button>
              </div>
               {isGeneratingPlan && <p className="text-xs text-[var(--text-muted)] mt-2 text-center animate-pulse">Generating tasks for your plan...</p>}
          </form>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)]">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:w-auto border-b border-[var(--border-color)] sm:border-b-0">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab
                        ? 'border-[var(--color-primary-500)] text-[var(--color-primary-600)]'
                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-gray-300'
                    }`}
                    >
                    {tab}
                    </button>
                ))}
                </nav>
            </div>
            <div className="w-full sm:w-auto flex items-center gap-2">
                 <input type="text" placeholder="Search tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full sm:w-48 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]" />
                 <button onClick={handleExport} className="flex items-center gap-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] px-3 py-2 rounded-md text-sm font-semibold hover:bg-[var(--bg-quaternary)] transition-colors">
                     <ArrowDownTrayIcon className="w-4 h-4" />
                     Export
                 </button>
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-color)]">
              <thead className="bg-[var(--bg-tertiary)]/50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-[var(--text-primary)] sm:pl-6">
                     <button onClick={() => requestSort('title')} className="flex items-center gap-2 group">Title {getSortIcon('title')}</button>
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-[var(--text-primary)]">
                    <button onClick={() => requestSort('status')} className="flex items-center gap-2 group">Status {getSortIcon('status')}</button>
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-[var(--text-primary)]">Assigned To</th>
                   <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-[var(--text-primary)]">
                    <button onClick={() => requestSort('createdBy')} className="flex items-center gap-2 group">Created By {getSortIcon('createdBy')}</button>
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-[var(--text-primary)]">
                    <button onClick={() => requestSort('dueDate')} className="flex items-center gap-2 group">Due Date {getSortIcon('dueDate')}</button>
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-secondary)]">
                {sortedAndFilteredTasks.length > 0 ? sortedAndFilteredTasks.map((task) => (
                  <tr key={task.id} onClick={() => onSelectItem(task)} className="hover:bg-[var(--bg-tertiary)]/50 cursor-pointer group">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-[var(--text-primary)] sm:pl-6">{task.title}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-[var(--text-secondary)]">
                        <select 
                            value={task.status} 
                            onChange={(e) => onUpdateStatus(task.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent border-none rounded-md py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                        >
                            {statuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </td>
                    <td className="px-3 py-4 text-sm text-[var(--text-secondary)]">{task.assignedTo.map(id => userMap.get(id)).join(', ')}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-[var(--text-secondary)]">{userMap.get(task.createdBy) || 'Unknown'}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-[var(--text-secondary)]">
                      {task.dueDate ? new Date(task.dueDate).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); onSelectItem(task); }} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md">
                            <PencilSquareIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1.5 text-[var(--text-secondary)] hover:text-red-400 rounded-md">
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                    <tr>
                        <td colSpan={6} className="text-center py-16 px-6 text-[var(--text-secondary)]">
                            No tasks found for your current filters.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default TaskListView;