import React, { useState, useEffect } from 'react';
import { Workflow, WorkflowTrigger, WorkflowTriggerType, WorkflowAction, WorkflowActionType } from '../../types';
import { PlusIcon, TrashIcon, PlayIcon, RectangleGroupIcon } from '../Icons';

interface WorkflowsViewProps {
  workflows: Workflow[];
  statuses: string[];
  onSave: (workflow: Workflow) => void;
  onDelete: (workflowId: string) => void;
  onRun: (workflowId: string) => void;
  workspaceId: string;
}

const getBlankWorkflow = (workspaceId: string): Workflow => ({
  id: `workflow_${Date.now()}`,
  name: 'New Workflow',
  description: '',
  trigger: { type: WorkflowTriggerType.Manual, config: {} },
  actions: [],
  createdAt: new Date().toISOString(),
  workspaceId: workspaceId,
});

const ActionEditor: React.FC<{ action: WorkflowAction, statuses: string[], onUpdate: (action: WorkflowAction) => void, onDelete: () => void }> = ({ action, statuses, onUpdate, onDelete }) => {
  const handleConfigChange = (field: keyof WorkflowAction['config'], value: any) => {
    onUpdate({ ...action, config: { ...action.config, [field]: value } });
  };

  const handleTypeChange = (newType: WorkflowActionType) => {
    onUpdate({ ...action, type: newType, config: { title: action.config.title } }); // Reset config but keep title
  };

  return (
    <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg border border-[var(--border-color)] space-y-3">
      <div className="flex justify-between items-center">
        <select
          value={action.type}
          onChange={(e) => handleTypeChange(e.target.value as WorkflowActionType)}
          className="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
        >
          <option value={WorkflowActionType.CreateTask}>Create Task</option>
          <option value={WorkflowActionType.CreateNote}>Create Note</option>
        </select>
        <button onClick={onDelete} className="p-1.5 text-[var(--text-muted)] hover:text-red-400"><TrashIcon className="w-5 h-5"/></button>
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Title</label>
        <input type="text" value={action.config.title} onChange={e => handleConfigChange('title', e.target.value)} placeholder="e.g., Sub-task for {{trigger.title}}" className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2 text-sm" />
      </div>
      {action.type === WorkflowActionType.CreateTask && (
        <>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description (Optional)</label>
            <textarea value={action.config.description || ''} onChange={e => handleConfigChange('description', e.target.value)} rows={2} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
              <select value={action.config.status || statuses[0]} onChange={e => handleConfigChange('status', e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2 text-sm">
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Due Date (in days)</label>
              <input type="number" value={action.config.dueDateOffsetDays || 0} onChange={e => handleConfigChange('dueDateOffsetDays', parseInt(e.target.value, 10))} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2 text-sm" />
            </div>
          </div>
        </>
      )}
      {action.type === WorkflowActionType.CreateNote && (
        <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Content (Template)</label>
            <textarea value={action.config.content || ''} onChange={e => handleConfigChange('content', e.target.value)} placeholder="Markdown content for the note..." rows={4} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2 text-sm" />
        </div>
      )}
    </div>
  );
};


const WorkflowsView: React.FC<WorkflowsViewProps> = ({ workflows, statuses, onSave, onDelete, onRun, workspaceId }) => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    if (workflows.length > 0 && !selectedWorkflowId) {
      setSelectedWorkflowId(workflows[0].id);
    }
  }, [workflows, selectedWorkflowId]);

  useEffect(() => {
    if (selectedWorkflowId === 'new') {
      setCurrentWorkflow(getBlankWorkflow(workspaceId));
    } else {
      const found = workflows.find(w => w.id === selectedWorkflowId);
      setCurrentWorkflow(found || null);
    }
  }, [selectedWorkflowId, workflows, workspaceId]);

  const handleUpdateField = (field: keyof Omit<Workflow, 'trigger' | 'actions' | 'id' | 'createdAt'>, value: string) => {
    if (!currentWorkflow) return;
    setCurrentWorkflow({ ...currentWorkflow, [field]: value });
  };

  const handleUpdateTrigger = (trigger: WorkflowTrigger) => {
    if (!currentWorkflow) return;
    setCurrentWorkflow({ ...currentWorkflow, trigger });
  };
  
  const handleUpdateAction = (actionId: string, updatedAction: WorkflowAction) => {
    if (!currentWorkflow) return;
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: currentWorkflow.actions.map(a => a.id === actionId ? updatedAction : a)
    });
  };

  const handleAddAction = () => {
    if (!currentWorkflow) return;
    const newAction: WorkflowAction = {
      id: `action_${Date.now()}`,
      type: WorkflowActionType.CreateTask,
      config: { title: 'New Automated Task' }
    };
    setCurrentWorkflow({ ...currentWorkflow, actions: [...currentWorkflow.actions, newAction] });
  };

  const handleDeleteAction = (actionId: string) => {
    if (!currentWorkflow) return;
    setCurrentWorkflow({
        ...currentWorkflow,
        actions: currentWorkflow.actions.filter(a => a.id !== actionId)
    });
  };
  
  const handleSave = () => {
    if (currentWorkflow) {
        onSave(currentWorkflow);
    }
  };

  const handleDelete = () => {
    if (currentWorkflow && window.confirm(`Delete workflow "${currentWorkflow.name}"?`)) {
        onDelete(currentWorkflow.id);
        setSelectedWorkflowId(null);
    }
  }

  return (
    <div className="flex h-full animate-fade-in gap-6">
      <div className="w-1/3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-2 flex flex-col">
        <div className="flex justify-between items-center px-2 pt-2 mb-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Workflows</h1>
          <button onClick={() => setSelectedWorkflowId('new')} className="p-2 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-quaternary)] hover:text-[var(--text-primary)] transition-colors">
            <PlusIcon className="w-5 h-5"/>
          </button>
        </div>
        <ul className="space-y-1 overflow-y-auto">
          {workflows.map(workflow => (
            <li
              key={workflow.id}
              onClick={() => setSelectedWorkflowId(workflow.id)}
              className={`p-3 rounded-md cursor-pointer transition-colors ${
                selectedWorkflowId === workflow.id ? 'bg-[var(--color-primary-600)]/30' : 'hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <h2 className={`font-semibold truncate ${selectedWorkflowId === workflow.id ? 'text-[var(--color-primary-100)]' : 'text-[var(--text-primary)]'}`}>{workflow.name}</h2>
              <p className="text-sm text-[var(--text-secondary)] truncate mt-1">{workflow.description || 'No description'}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="w-2/3 flex flex-col">
        {currentWorkflow ? (
          <div className="flex-1 flex flex-col bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)]">
            <div className="p-4 border-b border-[var(--border-color)]">
                <input type="text" value={currentWorkflow.name} onChange={e => handleUpdateField('name', e.target.value)} className="w-full bg-transparent text-xl font-bold text-[var(--text-primary)] focus:outline-none" />
                <textarea value={currentWorkflow.description} onChange={e => handleUpdateField('description', e.target.value)} placeholder="Workflow description..." rows={1} className="w-full bg-transparent text-sm text-[var(--text-secondary)] focus:outline-none resize-none" />
            </div>
            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
              {/* Trigger */}
              <div className="space-y-3">
                <h3 className="font-semibold text-[var(--text-primary)]">Trigger</h3>
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg border border-[var(--border-color)] space-y-3">
                  <select
                    value={currentWorkflow.trigger.type}
                    onChange={e => handleUpdateTrigger({ type: e.target.value as WorkflowTriggerType, config: {} })}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                  >
                    <option value={WorkflowTriggerType.Manual}>Manual (Run with button)</option>
                    <option value={WorkflowTriggerType.TaskCreated}>When a Task is Created</option>
                  </select>
                  {currentWorkflow.trigger.type === WorkflowTriggerType.TaskCreated && (
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">When task title contains:</label>
                      <input type="text" value={currentWorkflow.trigger.config.titleKeywords || ''} onChange={e => handleUpdateTrigger({ ...currentWorkflow.trigger, config: { titleKeywords: e.target.value } })} placeholder="e.g., Weekly Report" className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2 text-sm" />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-[var(--text-primary)]">Actions</h3>
                    <button onClick={handleAddAction} className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-400)]"><PlusIcon className="w-4 h-4"/> Add Action</button>
                </div>
                <div className="space-y-3">
                    {currentWorkflow.actions.map(action => (
                        <ActionEditor key={action.id} action={action} statuses={statuses} onUpdate={(updated) => handleUpdateAction(action.id, updated)} onDelete={() => handleDeleteAction(action.id)} />
                    ))}
                    {currentWorkflow.actions.length === 0 && <p className="text-sm text-center text-[var(--text-muted)] py-4">No actions yet. Add one to get started.</p>}
                </div>
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)]/50 border-t border-[var(--border-color)] flex justify-between items-center">
              <div>
                <button onClick={handleDelete} className="text-sm font-semibold text-red-500 hover:text-red-600">Delete Workflow</button>
              </div>
              <div className="flex items-center gap-3">
                {currentWorkflow.trigger.type === WorkflowTriggerType.Manual && (
                    <button onClick={() => onRun(currentWorkflow.id)} className="flex items-center gap-2 bg-transparent border border-[var(--color-primary-500)] text-[var(--color-primary-500)] px-4 py-2 rounded-[var(--border-radius)] text-sm font-semibold hover:bg-[var(--color-primary-500)]/10 transition-colors">
                        <PlayIcon className="w-4 h-4"/> Run Now
                    </button>
                )}
                <button onClick={handleSave} className="bg-[var(--color-primary-500)] text-white px-5 py-2.5 rounded-[var(--border-radius)] text-sm font-semibold hover:bg-[var(--color-primary-600)] transition-colors">Save</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)]">
              <div className="text-center">
                  <RectangleGroupIcon className="w-12 h-12 mx-auto text-[var(--text-muted)]" />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-4">Select a workflow</h3>
                  <p className="text-[var(--text-secondary)] mt-2">Choose a workflow to edit or create a new one.</p>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowsView;