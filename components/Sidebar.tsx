import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ViewType, Workspace, User } from '../types';
import { 
    HomeIcon, ClipboardDocumentListIcon, ViewColumnsIcon, CalendarDaysIcon, 
    DocumentTextIcon, PlusIcon, SparklesIcon, ChatBubbleOvalLeftEllipsisIcon, 
    PhotoIcon, PaintBrushIcon, RectangleGroupIcon, ChevronUpDownIcon, CheckIcon, Cog6ToothIcon, CpuChipIcon,
    ArrowLeftOnRectangleIcon, UserGroupIcon
} from './Icons';

interface SidebarProps {
  currentView: ViewType;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  currentUser: User;
  onViewChange: (view: ViewType) => void;
  onAICommand: (prompt: string) => void;
  onShowAddItemModal: () => void;
  onShowStylePanel: () => void;
  onSwitchWorkspace: (workspaceId: string) => void;
  onSaveWorkspace: (workspace: Omit<Workspace, 'id' | 'createdAt'>, id?: string) => Promise<Workspace>;
  onShowWorkspaceManagement: () => void;
  onLogout: () => void;
}

const baseNavItems = [
  { view: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { view: 'tasks', label: 'Tasks & Events', icon: ClipboardDocumentListIcon },
  { view: 'kanban', label: 'Kanban Board', icon: ViewColumnsIcon },
  { view: 'calendar', label: 'Calendar', icon: CalendarDaysIcon },
  { view: 'chat', label: 'AI Chat', icon: ChatBubbleOvalLeftEllipsisIcon },
  { view: 'notes', label: 'Notes', icon: DocumentTextIcon },
  { view: 'gallery', label: 'Gallery', icon: PhotoIcon },
  { view: 'workflows', label: 'Workflows', icon: RectangleGroupIcon },
  { view: 'mindmap', label: 'Mind Maps', icon: CpuChipIcon },
  { view: 'friends', label: 'Friends', icon: UserGroupIcon },
] as const;


const WorkspaceSwitcher: React.FC<Pick<SidebarProps, 'workspaces' | 'activeWorkspaceId' | 'onSwitchWorkspace' | 'onSaveWorkspace' | 'onShowWorkspaceManagement'>> = 
({ workspaces, activeWorkspaceId, onSwitchWorkspace, onSaveWorkspace, onShowWorkspaceManagement }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const switcherRef = useRef<HTMLDivElement>(null);

    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsCreating(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newWorkspaceName.trim()) {
            const newWorkspace = await onSaveWorkspace({ name: newWorkspaceName.trim() });
            onSwitchWorkspace(newWorkspace.id);
            setNewWorkspaceName("");
            setIsCreating(false);
            setIsOpen(false);
        }
    }

    if (!activeWorkspace) return null;

    return (
        <div ref={switcherRef} className="relative mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-[var(--border-radius)] hover:bg-[var(--bg-quaternary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <SparklesIcon className="w-6 h-6 text-[var(--color-primary-400)] flex-shrink-0" />
                    <span className="font-bold text-lg text-[var(--text-primary)] truncate">{activeWorkspace.name}</span>
                </div>
                <ChevronUpDownIcon className="w-5 h-5 text-[var(--text-secondary)] flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] shadow-lg z-10 p-2 animate-fade-in-fast">
                    {isCreating ? (
                        <form onSubmit={handleCreate} className="p-2">
                            <input
                                type="text"
                                autoFocus
                                value={newWorkspaceName}
                                onChange={(e) => setNewWorkspaceName(e.target.value)}
                                placeholder="New workspace name..."
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-2 py-1.5 text-sm mb-2"
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsCreating(false)} className="px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-md">Cancel</button>
                                <button type="submit" className="px-2 py-1 text-xs font-semibold text-white bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] rounded-md">Create</button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)]">Workspaces</p>
                            <ul className="my-1">
                                {workspaces.map(w => (
                                    <li key={w.id}>
                                        <button onClick={() => { onSwitchWorkspace(w.id); setIsOpen(false); }} className="w-full flex items-center justify-between text-left p-2 rounded-md text-sm hover:bg-[var(--bg-tertiary)]">
                                            <span className={w.id === activeWorkspaceId ? "font-semibold text-[var(--color-primary-500)]" : "text-[var(--text-primary)]"}>{w.name}</span>
                                            {w.id === activeWorkspaceId && <CheckIcon className="w-4 h-4 text-[var(--color-primary-500)]"/>}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="w-full h-px bg-[var(--border-color)] my-1"></div>
                            <button onClick={() => setIsCreating(true)} className="w-full text-left p-2 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-2">
                                <PlusIcon className="w-4 h-4" /> Create Workspace
                            </button>
                            <button onClick={() => { onShowWorkspaceManagement(); setIsOpen(false); }} className="w-full text-left p-2 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-2">
                                <Cog6ToothIcon className="w-4 h-4" /> Manage Workspaces
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};


const Sidebar: React.FC<SidebarProps> = (props) => {
  const { currentView, onViewChange, onAICommand, onShowAddItemModal, onShowStylePanel, currentUser, onLogout } = props;
  const [aiPrompt, setAiPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navItems = useMemo(() => {
    // FIX: Broaden the type of `items` to allow for the admin view to be pushed.
    const items: {
      view: ViewType;
      label: string;
      icon: React.FC<React.SVGProps<SVGSVGElement>>;
    }[] = [...baseNavItems];
    if (currentUser.role === 'admin') {
      items.push({ view: 'admin', label: 'Admin Panel', icon: Cog6ToothIcon });
    }
    return items;
  }, [currentUser.role]);

  const handleAICommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAICommand(aiPrompt);
      setAiPrompt('');
    } catch(error) {
        console.error("AI command failed", error);
        alert("Sorry, I couldn't process that command.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <aside className="w-64 bg-[var(--bg-secondary)]/70 border-r border-[var(--border-color)] flex flex-col p-4">
      
      <WorkspaceSwitcher {...props} />
      
      <button 
        onClick={onShowAddItemModal}
        className="w-full flex items-center justify-center gap-2 mb-4 px-3 py-2.5 bg-[var(--color-primary-500)] text-white rounded-[var(--border-radius)] text-sm font-semibold hover:bg-[var(--color-primary-600)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
      >
        <PlusIcon className="w-5 h-5 font-bold" />
        Create New
      </button>

      <nav className="flex-1 space-y-1.5 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.view}
            onClick={() => onViewChange(item.view)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] ${
              currentView === item.view
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-4">
        <form onSubmit={handleAICommandSubmit} className="mb-2">
            <label htmlFor="ai-prompt" className="text-xs font-semibold text-[var(--text-muted)] mb-2 block px-1">Ask AI Assistant...</label>
            <div className="relative">
                <input
                    id="ai-prompt"
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder='e.g., "new task for friday"'
                    disabled={isSubmitting}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[var(--border-radius)] py-2 pl-3 pr-10 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] transition-colors disabled:opacity-50"
                />
                 <button type="submit" disabled={isSubmitting || !aiPrompt.trim()} className="absolute inset-y-0 right-0 flex items-center pr-3 disabled:opacity-40 disabled:cursor-not-allowed group">
                    <svg className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--color-primary-400)] transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086L2.279 16.76a.75.75 0 00.95.826l16-5.333a.75.75 0 000-1.418l-16-5.333z" />
                    </svg>
                </button>
            </div>
             {isSubmitting && <p className="text-xs text-[var(--text-muted)] mt-2 text-center animate-pulse">Thinking...</p>}
        </form>
        <div className="border-t border-[var(--border-color)] pt-2 mt-2 space-y-2">
            <button
                onClick={onShowStylePanel}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
            >
                <PaintBrushIcon className="w-5 h-5" />
                Style
            </button>
            <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
            >
                <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                Logout
            </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;