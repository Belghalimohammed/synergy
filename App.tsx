import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/views/DashboardView';
import TaskListView from './components/views/TaskListView';
import KanbanView from './components/views/KanbanView';
import CalendarView from './components/views/CalendarView';
import NotesView from './components/views/NotesView';
import ChatView from './components/views/ChatView';
import GalleryView from './components/views/GalleryView';
import WorkflowsView from './components/views/WorkflowsView';
import MindMapView from './components/views/MindMapView';
import AdminView from './components/views/AdminView';
import FriendsView from './components/views/FriendsView';
import EditItemModal from './components/EditItemModal';
import ViewItemModal from './components/ViewItemModal';
import ViewNoteModal from './components/ViewNoteModal';
import AddItemModal from './components/AddItemModal';
import Loader from './components/Loader';
import SelectionToolbar from './components/SelectionToolbar';
import StylePanel from './components/StylePanel';
import WorkspaceManagementModal from './components/WorkspaceManagementModal';
import SummaryModal from './components/SummaryModal';
import ShareNoteModal from './components/ShareNoteModal';
import { User, ViewType, Task, Note, Item, ItemType, ChatSession, SavedImage, ThemeSettings, Workflow, WorkflowTriggerType, Workspace, Folder, FolderType, Widget, WidgetType, Invitation } from './types';
import { processCommand, generateNoteContent, formatTextAsNote, generateNoteWithSearch } from './services/geminiService';
import * as dbService from './services/dbService';
import * as themeService from './services/themeService';

const defaultWidgets: Widget[] = [
    { id: `widget_default_1`, type: 'task_stats' },
    { id: `widget_default_2`, type: 'status_chart' },
    { id: `widget_default_3`, type: 'upcoming_tasks' },
    { id: `widget_default_4`, type: 'recent_notes' },
    { id: `widget_default_5`, type: 'streak' },
    { id: `widget_default_6`, type: 'quote' },
    { id: `widget_default_7`, type: 'pomodoro' },
];

interface AppProps {
  currentUser: User;
  onLogout: () => void;
}

const App: React.FC<AppProps> = ({ currentUser, onLogout }) => {
  const [view, setView] = useState<ViewType>('dashboard');
  const [items, setItems] = useState<Item[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectionInfo, setSelectionInfo] = useState<{ text: string; position: { x: number; y: number } } | null>(null);
  
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(themeService.loadThemeSettings());
  const [isStylePanelOpen, setIsStylePanelOpen] = useState(false);
  
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  // Workspace State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  // New states for Summarization and Mind Map navigation
  const [summaryModalState, setSummaryModalState] = useState({ isOpen: false, content: '' });
  const [mindMapPreselect, setMindMapPreselect] = useState<{ type: 'note' | 'chat'; id: string } | null>(null);

  // New Social/Collab State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [sharingNote, setSharingNote] = useState<Note | null>(null);

  useEffect(() => {
    themeService.applyTheme(themeSettings);
  }, [themeSettings]);


  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      const activeElement = document.activeElement;
      const isEditable = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement instanceof HTMLElement && activeElement.isContentEditable)
      );

      if (selectedText && !isEditable && selection) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
            setSelectionInfo({
                text: selectedText,
                position: {
                    x: rect.left + window.scrollX + (rect.width / 2) - 60,
                    y: rect.top + window.scrollY - 50,
                },
            });
        }
      } else {
        setTimeout(() => setSelectionInfo(null), 100);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Initial data load for workspaces
  useEffect(() => {
    const loadInitialData = async () => {
        let dbWorkspaces = await dbService.getAllWorkspaces();
        let currentActiveWorkspace: Workspace | null = null;

        if (dbWorkspaces.length === 0) {
            const newWorkspace: Workspace = { id: `ws_${Date.now()}`, name: 'My Workspace', createdAt: new Date().toISOString(), dashboardWidgets: defaultWidgets };
            await dbService.saveWorkspace(newWorkspace);
            dbWorkspaces = [newWorkspace];
        }
        
        setWorkspaces(dbWorkspaces);
        const lastId = localStorage.getItem('activeWorkspaceId');
        if (lastId && dbWorkspaces.some(w => w.id === lastId)) {
            currentActiveWorkspace = dbWorkspaces.find(w => w.id === lastId) || null;
        } else {
            currentActiveWorkspace = dbWorkspaces[0] || null;
        }

        if (currentActiveWorkspace && !currentActiveWorkspace.dashboardWidgets) {
            currentActiveWorkspace.dashboardWidgets = defaultWidgets;
        }

        setActiveWorkspace(currentActiveWorkspace);
    };
    loadInitialData();
  }, []);

  // Load data when active workspace changes
  useEffect(() => {
    const loadDataForWorkspace = async () => {
      if (!activeWorkspace) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      localStorage.setItem('activeWorkspaceId', activeWorkspace.id);
      try {
        const [dbItems, dbStatuses, dbChatSessions, dbSavedImages, dbWorkflows, dbFolders, dbUsers, dbInvitations] = await Promise.all([
          dbService.getAllItems(activeWorkspace.id),
          dbService.getStatuses(),
          dbService.getAllChatSessions(activeWorkspace.id),
          dbService.getAllSavedImages(activeWorkspace.id),
          dbService.getAllWorkflows(activeWorkspace.id),
          dbService.getAllFoldersForWorkspace(activeWorkspace.id),
          dbService.getAllUsers(),
          dbService.getAllInvitations(),
        ]);
        
        const defaultStatuses = ['To Do', 'In Progress', 'Done'];
        let currentStatuses = dbStatuses && dbStatuses.length > 0 ? dbStatuses : defaultStatuses;
        if (dbStatuses.length === 0) await dbService.saveStatuses(defaultStatuses);
        setStatuses(currentStatuses);

        setItems(dbItems.map((item: any) => {
          const newItem = { ...item };
          if (newItem.dueDate) newItem.dueDate = new Date(newItem.dueDate);
          if ((newItem.type === 'task' || newItem.type === 'event') && !newItem.status) {
            newItem.status = currentStatuses[0];
          }
          return newItem;
        }));

        setChatSessions(dbChatSessions);
        if (dbChatSessions.length > 0) {
            setActiveChatSessionId(dbChatSessions[0].id);
        } else {
            setActiveChatSessionId(null);
        }

        setSavedImages(dbSavedImages);
        setWorkflows(dbWorkflows);
        setFolders(dbFolders);
        setAllUsers(dbUsers);
        setInvitations(dbInvitations);

      } catch (error) {
        console.error('Failed to load data from database', error);
        setStatuses(['To Do', 'In Progress', 'Done']);
      } finally {
        setIsLoading(false);
      }
    };
    loadDataForWorkspace();
  }, [activeWorkspace]);

  const activeWorkspaceId = activeWorkspace?.id || null;
  const dashboardWidgets = activeWorkspace?.dashboardWidgets || [];
  const tasks = items.filter(item => item.type === ItemType.Task || item.type === ItemType.Event) as Task[];
  const notes = items.filter(item => item.type === ItemType.Note) as Note[];
  const friends = allUsers.filter(u => currentUser.friends.includes(u.id));

  // Workspace Handlers
  const handleSwitchWorkspace = (workspaceId: string) => {
    if (workspaceId !== activeWorkspaceId) {
        let newActiveWorkspace = workspaces.find(w => w.id === workspaceId);
        if (newActiveWorkspace) {
            if (!newActiveWorkspace.dashboardWidgets) {
                newActiveWorkspace = { ...newActiveWorkspace, dashboardWidgets: defaultWidgets };
            }
            setActiveWorkspace(newActiveWorkspace);
        }
    }
  };

  const handleSaveWorkspace = async (workspaceData: Omit<Workspace, 'id' | 'createdAt' | 'dashboardWidgets'>, id?: string): Promise<Workspace> => {
      if (id) { // Update
          const workspaceToUpdate = workspaces.find(w => w.id === id);
          if (!workspaceToUpdate) throw new Error("Workspace not found");
          const updatedWorkspace = { ...workspaceToUpdate, ...workspaceData };
          await dbService.saveWorkspace(updatedWorkspace);
          setWorkspaces(workspaces.map(w => w.id === id ? updatedWorkspace : w));
          if (activeWorkspace?.id === id) {
              setActiveWorkspace(updatedWorkspace);
          }
          return updatedWorkspace;
      } else { // Create
          const newWorkspace: Workspace = { ...workspaceData, id: `ws_${Date.now()}`, createdAt: new Date().toISOString(), dashboardWidgets: defaultWidgets };
          await dbService.saveWorkspace(newWorkspace);
          setWorkspaces([...workspaces, newWorkspace]);
          return newWorkspace;
      }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
      if (workspaces.length <= 1) {
          alert("You cannot delete your only workspace.");
          return;
      }
      await dbService.deleteWorkspace(workspaceId);
      const newWorkspaces = workspaces.filter(w => w.id !== workspaceId);
      setWorkspaces(newWorkspaces);
      if (activeWorkspaceId === workspaceId) {
          setActiveWorkspace(newWorkspaces[0] || null);
      }
  };

  // Widget Handlers
  const handleUpdateCurrentWorkspace = async (updatedWorkspace: Workspace) => {
    setActiveWorkspace(updatedWorkspace);
    setWorkspaces(workspaces.map(w => w.id === updatedWorkspace.id ? updatedWorkspace : w));
    await dbService.saveWorkspace(updatedWorkspace);
  }

  const handleAddWidget = (type: WidgetType) => {
    if (!activeWorkspace) return;
    const newWidget: Widget = { id: `widget_${Date.now()}`, type };
    const updatedWidgets = [...(activeWorkspace.dashboardWidgets || []), newWidget];
    handleUpdateCurrentWorkspace({ ...activeWorkspace, dashboardWidgets: updatedWidgets });
  };
  
  const handleRemoveWidget = (widgetId: string) => {
    if (!activeWorkspace) return;
    const updatedWidgets = (activeWorkspace.dashboardWidgets || []).filter(w => w.id !== widgetId);
    handleUpdateCurrentWorkspace({ ...activeWorkspace, dashboardWidgets: updatedWidgets });
  };


  // Workflow Handlers
  const executeWorkflow = async (workflow: Workflow, triggerItem: Item | null) => {
    for (const action of workflow.actions) {
        const processTemplate = (template: string) => {
            if (!triggerItem) return template;
            return template.replace(/{{trigger.title}}/g, triggerItem.title);
        };

        const config = { ...action.config };
        config.title = processTemplate(config.title);
        if (config.description) config.description = processTemplate(config.description);
        if (config.content) config.content = processTemplate(config.content);

        if (action.type === 'create_task') {
            let dueDate: Date | null = null;
            if (config.dueDateOffsetDays !== undefined) {
                dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + config.dueDateOffsetDays);
            }
            await handleAddItem({
                type: ItemType.Task,
                title: config.title,
                description: config.description || '',
                status: config.status || statuses[0],
                dueDate,
                createdBy: currentUser.id,
                assignedTo: [],
            }, true); // Pass true to skip workflow checks
        } else if (action.type === 'create_note') {
            await handleAddItem({
                type: ItemType.Note,
                title: config.title,
                content: config.content || '',
                ownerId: currentUser.id,
                sharedWith: [],
            });
        }
    }
  };
  
  const handleRunWorkflow = async (workflowId: string) => {
      const workflow = workflows.find(w => w.id === workflowId);
      if (workflow && workflow.trigger.type === WorkflowTriggerType.Manual) {
          setIsLoading(true);
          try {
              await executeWorkflow(workflow, null);
          } catch (e) {
              console.error('Error running manual workflow', e);
              alert('Failed to run workflow.');
          } finally {
              setIsLoading(false);
          }
      }
  }

  const checkAndRunWorkflows = async (newItem: Item) => {
    if (newItem.type !== ItemType.Task && newItem.type !== ItemType.Event) return;
    
    for (const workflow of workflows) {
        if (workflow.trigger.type === WorkflowTriggerType.TaskCreated) {
            const keywords = (workflow.trigger.config.titleKeywords || '').toLowerCase().trim();
            if (keywords && newItem.title.toLowerCase().includes(keywords)) {
                await executeWorkflow(workflow, newItem);
            }
        }
    }
  }

  const handleSaveWorkflow = async (workflow: Workflow) => {
      setWorkflows(prev => {
          const index = prev.findIndex(w => w.id === workflow.id);
          if (index > -1) {
              const newWorkflows = [...prev];
              newWorkflows[index] = workflow;
              return newWorkflows;
          }
          return [workflow, ...prev];
      });
      await dbService.saveWorkflow(workflow);
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      await dbService.deleteWorkflow(workflowId);
  };

  // Item Handlers
  const handleAddItem = async (itemData: Omit<Task, 'id' | 'workspaceId'> | Omit<Note, 'id' | 'createdAt' | 'workspaceId'>, skipWorkflowCheck = false) => {
    if (!activeWorkspaceId) return;
    let newItem: Item;
    if (itemData.type === ItemType.Note) {
       newItem = { ...(itemData as Omit<Note, 'id' | 'createdAt' | 'workspaceId'>), id: `note_${Date.now()}`, createdAt: new Date().toISOString(), workspaceId: activeWorkspaceId };
    } else {
       newItem = { ...(itemData as Omit<Task, 'id' | 'workspaceId'>), id: `task_${Date.now()}`, workspaceId: activeWorkspaceId };
    }
    setItems(prev => [newItem, ...prev]);
    await dbService.saveItem(newItem);
    if (!skipWorkflowCheck) {
      await checkAndRunWorkflows(newItem);
    }
  };

  const handleCreateNote = async (folderId?: string | null): Promise<Note> => {
    if (!activeWorkspaceId) throw new Error("No active workspace");
    const newNote: Note = {
      id: `note_${Date.now()}`, type: ItemType.Note, title: 'New Note', content: '', createdAt: new Date().toISOString(), workspaceId: activeWorkspaceId, folderId,
      ownerId: currentUser.id, sharedWith: []
    };
    setItems(prev => [newNote, ...prev]);
    await dbService.saveItem(newNote);
    setView('notes');
    return newNote;
  };

  const handleUpdateItem = async (updatedItem: Item) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    await dbService.saveItem(updatedItem);
    if (editingItem && editingItem.id === updatedItem.id) {
      setEditingItem(updatedItem);
    }
    if (sharingNote && sharingNote.id === updatedItem.id) {
        setSharingNote(updatedItem as Note);
    }
  };
  
  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    const itemToUpdate = items.find(item => item.id === taskId);
    if (itemToUpdate && (itemToUpdate.type === 'task' || itemToUpdate.type === 'event')) {
      await handleUpdateItem({ ...itemToUpdate, status: newStatus } as Task);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    await dbService.deleteItem(itemId);
    setEditingItem(null);
  };
  
  const handleSetStatuses = async (newStatuses: string[] | ((prev: string[]) => string[])) => {
      const updatedStatuses = typeof newStatuses === 'function' ? newStatuses(statuses) : newStatuses;
      setStatuses(updatedStatuses);
      await dbService.saveStatuses(updatedStatuses);
  };
  
  // Selection Handlers
  const handleSelectionAction = async (action: 'createTask' | 'createNote' | 'aiSearchNote') => {
    if (!selectionInfo) return;
    const { text } = selectionInfo;
    setSelectionInfo(null); 

    if (action === 'createTask') {
        await handleAddItem({ type: ItemType.Task, title: text, description: '', status: statuses[0], dueDate: null, createdBy: currentUser.id, assignedTo: [] });
        setView('tasks');
    } else if (action === 'createNote') {
        const title = text.length > 50 ? text.substring(0, 47) + '...' : text;
        await handleAddItem({ type: ItemType.Note, title: `Note: "${title}"`, content: text, ownerId: currentUser.id, sharedWith: [] });
        setView('notes');
    } else if (action === 'aiSearchNote') {
        setIsLoading(true);
        try {
            const { content, sources } = await generateNoteWithSearch(text);
            const title = text.length > 50 ? text.substring(0, 47) + '...' : text;
            await handleAddItem({ type: ItemType.Note, title: `AI Note: "${title}"`, content: content + sources, ownerId: currentUser.id, sharedWith: [] });
            setView('notes');
        } catch (error) { console.error("Failed to create AI search note", error); alert("Sorry, there was an error creating the AI note."); }
        finally { setIsLoading(false); }
    }
  };

  const handleSelectItem = (item: Item) => {
    if (item.type !== ItemType.Note) setViewingItem(item);
  };

  // AI Command Handlers
  const handleAICommand = async (prompt: string) => {
      const result = await processCommand(prompt, statuses);
      if (result.command === 'createTask') {
        const { title, dueDate, status } = result.payload;
        await handleAddItem({ type: ItemType.Task, title, description: '', status: status || statuses[0], dueDate: dueDate ? new Date(dueDate) : null, createdBy: currentUser.id, assignedTo: [] });
        setView('tasks');
      } else if (result.command === 'createNote') {
          const { title, content, topicForContentGeneration, rawTextForFormatting } = result.payload;
          let noteContent = content || ''; let noteTitle = title;
          if (topicForContentGeneration) { noteContent = await generateNoteContent(topicForContentGeneration); noteTitle = title || topicForContentGeneration; }
          else if (rawTextForFormatting) { noteContent = await formatTextAsNote(rawTextForFormatting); noteTitle = title || "Formatted Note"; }
          await handleAddItem({ type: ItemType.Note, title: noteTitle, content: noteContent, ownerId: currentUser.id, sharedWith: [] });
          setView('notes');
       } else if (result.command === 'createTaskPlan') {
          const { tasks: planTasks } = result.payload;
          if (planTasks && Array.isArray(planTasks)) {
              for (const task of planTasks) {
                  await handleAddItem({ type: ItemType.Task, title: task.title, description: task.description || '', status: statuses[0], dueDate: task.estimatedDueDate ? new Date(task.estimatedDueDate) : null, createdBy: currentUser.id, assignedTo: [] });
              }
          }
          setView('tasks');
      } else { alert(`AI Assistant: ${result.payload.text}`); }
  };

  // Chat Handlers
  const handleNewChatSession = async (folderId?: string | null): Promise<ChatSession> => {
      if (!activeWorkspaceId) throw new Error("No active workspace");
      const newSession: ChatSession = { id: `chat_${Date.now()}`, title: 'New Chat', history: [], createdAt: new Date().toISOString(), workspaceId: activeWorkspaceId, folderId };
      const updatedSessions = [newSession, ...chatSessions];
      setChatSessions(updatedSessions);
      await dbService.saveChatSession(newSession);
      return newSession;
  };

  const handleUpdateChatSession = async (session: ChatSession) => {
      setChatSessions(prev => prev.map(s => s.id === session.id ? session : s));
      await dbService.saveChatSession(session);
  };

  const handleDeleteChatSession = async (sessionId: string) => {
      const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
      setChatSessions(updatedSessions);
      if (activeChatSessionId === sessionId) {
          setActiveChatSessionId(updatedSessions.length > 0 ? updatedSessions[0].id : null);
      }
      await dbService.deleteChatSession(sessionId);
  };
  
  const handleSaveAiResponseAsNote = async (content: string) => {
    if (!activeWorkspaceId) return;
    const title = content.length > 40 ? content.substring(0, 37) + '...' : content;
    await handleAddItem({
        type: ItemType.Note,
        title: `Note from AI Chat: "${title}"`,
        content: content,
        ownerId: currentUser.id,
        sharedWith: [],
    });
    alert('AI response saved as a new note!');
  };

  // Image Handlers
  const handleSaveImage = async (imageData: Omit<SavedImage, 'id' | 'createdAt' | 'workspaceId' | 'folderId'>, folderId?: string | null) => {
      if (!activeWorkspaceId) return;
      const newImage: SavedImage = { ...imageData, id: `img_${Date.now()}`, createdAt: new Date().toISOString(), workspaceId: activeWorkspaceId, folderId };
      setSavedImages(prev => [newImage, ...prev]);
      await dbService.saveSavedImage(newImage);
  };

  const handleDeleteImage = async (imageId: string) => {
      setSavedImages(prev => prev.filter(img => img.id !== imageId));
      await dbService.deleteSavedImage(imageId);
  };
  
  // Theme Handler
  const handleThemeChange = (settings: Partial<ThemeSettings>) => {
      setThemeSettings(prev => {
          const newSettings = { ...prev, ...settings };
          themeService.saveThemeSettings(newSettings);
          return newSettings;
      });
  }

  // Folder Handlers
  const handleSaveFolder = async (folderData: Omit<Folder, 'id' | 'createdAt'>, id?: string): Promise<Folder> => {
      if (id) { // Update
          const folderToUpdate = folders.find(f => f.id === id);
          if (!folderToUpdate) throw new Error("Folder not found");
          const updatedFolder = { ...folderToUpdate, ...folderData };
          await dbService.saveFolder(updatedFolder);
          setFolders(folders.map(f => f.id === id ? updatedFolder : f));
          return updatedFolder;
      } else { // Create
          if (!activeWorkspaceId) throw new Error("No active workspace");
          const newFolder: Folder = { ...folderData, id: `folder_${Date.now()}`, createdAt: new Date().toISOString(), workspaceId: activeWorkspaceId };
          await dbService.saveFolder(newFolder);
          setFolders([...folders, newFolder]);
          return newFolder;
      }
  };

    const handleDeleteFolder = async (folder: Folder) => {
        if (!window.confirm(`Are you sure you want to delete the "${folder.name}" folder? All items inside will be moved to the root.`)) {
            return;
        }

        setIsLoading(true);
        try {
            if (folder.type === FolderType.Note) {
                const itemsToMove = items.filter(i => (i as Note).folderId === folder.id);
                for (const item of itemsToMove) {
                    await handleUpdateItem({ ...(item as Note), folderId: null });
                }
            } else if (folder.type === FolderType.Chat) {
                const itemsToMove = chatSessions.filter(c => c.folderId === folder.id);
                for (const item of itemsToMove) {
                    await handleUpdateChatSession({ ...item, folderId: null });
                }
            } else if (folder.type === FolderType.Image) {
                const itemsToMove = savedImages.filter(i => i.folderId === folder.id);
                for (const item of itemsToMove) {
                    await dbService.saveSavedImage({ ...item, folderId: null }); // direct DB call to avoid state complexity
                }
                setSavedImages(prev => prev.map(i => i.folderId === folder.id ? { ...i, folderId: null } : i));
            }
            
            await dbService.deleteFolder(folder.id);
            setFolders(prev => prev.filter(f => f.id !== folder.id));

        } catch (error) {
            console.error("Failed to delete folder", error);
            alert("An error occurred while deleting the folder.");
        } finally {
            setIsLoading(false);
        }
    };
  
    const handleMoveItemToFolder = async (itemId: string, itemType: 'note' | 'chat' | 'image', folderId: string | null) => {
      if (itemType === 'note') {
        const item = items.find(i => i.id === itemId && i.type === ItemType.Note) as Note | undefined;
        if (item) await handleUpdateItem({ ...item, folderId });
      } else if (itemType === 'chat') {
        const item = chatSessions.find(c => c.id === itemId);
        if (item) await handleUpdateChatSession({ ...item, folderId });
      } else if (itemType === 'image') {
        const item = savedImages.find(i => i.id === itemId);
        if (item) {
          const updatedImage = { ...item, folderId };
          setSavedImages(prev => prev.map(i => i.id === itemId ? updatedImage : i));
          await dbService.saveSavedImage(updatedImage);
        }
      }
    };

    // Summarization and Mind Map Handlers
    const handleOpenSummaryModal = (content: string) => {
        setSummaryModalState({ isOpen: true, content });
    };

    const handleCloseSummaryModal = () => {
        setSummaryModalState({ isOpen: false, content: '' });
    };

    const handleNavigateToMindMap = (type: 'note' | 'chat', id: string) => {
        setMindMapPreselect({ type, id });
        setView('mindmap');
    };
    
    // Social/Collab Handlers
    const handleSendInvitation = async (toId: string) => {
        const newInvitation: Invitation = {
            id: `inv_${Date.now()}`, fromId: currentUser.id, toId, status: 'pending', createdAt: new Date().toISOString()
        };
        setInvitations(prev => [...prev, newInvitation]);
        await dbService.saveInvitation(newInvitation);
    };

    const handleAcceptInvitation = async (invitation: Invitation) => {
        // Update invitation status
        const updatedInvitation = { ...invitation, status: 'accepted' as const };
        await dbService.saveInvitation(updatedInvitation);

        // Update both users' friend lists
        const user1 = allUsers.find(u => u.id === invitation.fromId);
        const user2 = allUsers.find(u => u.id === invitation.toId);
        if (user1 && user2) {
            const updatedUser1 = { ...user1, friends: [...user1.friends, user2.id] };
            const updatedUser2 = { ...user2, friends: [...user2.friends, user1.id] };
            await dbService.saveUser(updatedUser1);
            await dbService.saveUser(updatedUser2);
            setAllUsers(prev => prev.map(u => u.id === user1.id ? updatedUser1 : (u.id === user2.id ? updatedUser2 : u)));
        }
        
        setInvitations(prev => prev.map(i => i.id === invitation.id ? updatedInvitation : i));
    };

    const handleDeclineInvitation = async (invitation: Invitation) => {
        const updatedInvitation = { ...invitation, status: 'declined' as const };
        setInvitations(prev => prev.map(i => i.id === invitation.id ? updatedInvitation : i));
        await dbService.saveInvitation(updatedInvitation);
    };

    const handleRemoveFriend = async (friendId: string) => {
        if (!window.confirm("Are you sure you want to remove this friend?")) return;
        
        const friend = allUsers.find(u => u.id === friendId);
        if (!friend) return;

        // Update both users
        const updatedCurrentUser = { ...currentUser, friends: currentUser.friends.filter(id => id !== friendId) };
        const updatedFriend = { ...friend, friends: friend.friends.filter(id => id !== currentUser.id) };
        
        await dbService.saveUser(updatedCurrentUser);
        await dbService.saveUser(updatedFriend);
        setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedCurrentUser : (u.id === friendId ? updatedFriend : u)));
    };

  const renderView = () => {
    if (isLoading || !activeWorkspaceId) return <Loader />;
    switch (view) {
      case 'dashboard':
        return <DashboardView 
                  tasks={tasks} 
                  notes={notes.filter(n => n.ownerId === currentUser.id || n.sharedWith.includes(currentUser.id))} 
                  statuses={statuses} 
                  widgets={dashboardWidgets}
                  onSelectItem={handleSelectItem} 
                  onViewChange={setView} 
                  onSelectNote={(note) => setViewingNote(note)}
                  onAddWidget={handleAddWidget}
                  onRemoveWidget={handleRemoveWidget}
                />;
      case 'tasks':
        return <TaskListView tasks={tasks} statuses={statuses} onUpdateStatus={handleUpdateStatus} onSelectItem={handleSelectItem} onDelete={handleDeleteItem} onAICommand={handleAICommand} allUsers={allUsers} />;
      case 'kanban':
        return <KanbanView tasks={tasks} statuses={statuses} onUpdateStatus={handleUpdateStatus} onSelectItem={handleSelectItem} onSetStatuses={handleSetStatuses} onDelete={handleDeleteItem} />;
      case 'calendar':
        return <CalendarView events={tasks} onSelectItem={handleSelectItem} onUpdateItem={handleUpdateItem} />;
      case 'chat':
        return <ChatView 
                  sessions={chatSessions}
                  activeSessionId={activeChatSessionId}
                  folders={folders.filter(f => f.type === FolderType.Chat)}
                  themeSettings={themeSettings}
                  onSetActiveSession={setActiveChatSessionId}
                  onNewSession={handleNewChatSession}
                  onUpdateSession={handleUpdateChatSession}
                  onDeleteSession={handleDeleteChatSession}
                  onSaveImage={handleSaveImage}
                  onSaveAsNote={handleSaveAiResponseAsNote}
                  onSaveFolder={handleSaveFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onMoveItem={handleMoveItemToFolder}
                  onOpenSummaryModal={handleOpenSummaryModal}
                  onNavigateToMindMap={handleNavigateToMindMap}
                />;
      case 'notes':
        return <NotesView 
                  notes={notes}
                  savedImages={savedImages}
                  folders={folders.filter(f => f.type === FolderType.Note)}
                  themeSettings={themeSettings}
                  currentUser={currentUser}
                  onUpdateNote={handleUpdateItem as (note: Note) => void} 
                  onCreateNote={handleCreateNote}
                  onDeleteNote={handleDeleteItem}
                  onSaveFolder={handleSaveFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onMoveItem={handleMoveItemToFolder}
                  onOpenSummaryModal={handleOpenSummaryModal}
                  onNavigateToMindMap={handleNavigateToMindMap}
                  onOpenShareModal={(note) => setSharingNote(note)}
                />;
      case 'gallery':
        return <GalleryView 
                  images={savedImages}
                  folders={folders.filter(f => f.type === FolderType.Image)}
                  onDelete={handleDeleteImage}
                  onSaveFolder={handleSaveFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onMoveItem={handleMoveItemToFolder}
                />;
      case 'workflows':
        return <WorkflowsView 
                  workflows={workflows}
                  statuses={statuses}
                  onSave={handleSaveWorkflow}
                  onDelete={handleDeleteWorkflow}
                  onRun={handleRunWorkflow}
                  workspaceId={activeWorkspaceId}
               />;
      case 'mindmap':
        return <MindMapView 
                    notes={notes} 
                    sessions={chatSessions} 
                    preselectedSource={mindMapPreselect}
                    onPreselectionUsed={() => setMindMapPreselect(null)}
                />;
      case 'admin':
        return currentUser.role === 'admin' ? <AdminView /> : <p>Access Denied</p>;
      case 'friends':
        return <FriendsView
                  currentUser={currentUser}
                  allUsers={allUsers}
                  invitations={invitations}
                  onSendInvitation={handleSendInvitation}
                  onAcceptInvitation={handleAcceptInvitation}
                  onDeclineInvitation={handleDeclineInvitation}
                  onRemoveFriend={handleRemoveFriend}
                />
      default:
        return <DashboardView 
                  tasks={tasks} 
                  notes={notes.filter(n => n.ownerId === currentUser.id || n.sharedWith.includes(currentUser.id))} 
                  statuses={statuses} 
                  widgets={dashboardWidgets}
                  onSelectItem={handleSelectItem} 
                  onViewChange={setView} 
                  onSelectNote={(note) => setViewingNote(note)}
                  onAddWidget={handleAddWidget}
                  onRemoveWidget={handleRemoveWidget}
               />;
    }
  };

  return (
    <div className="flex h-full min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--color-primary-500)]/20">
      <Sidebar 
        currentView={view} 
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        currentUser={currentUser}
        onViewChange={setView} 
        onAICommand={handleAICommand} 
        onShowAddItemModal={() => setIsAddingItem(true)}
        onShowStylePanel={() => setIsStylePanelOpen(true)}
        onSwitchWorkspace={handleSwitchWorkspace}
        onSaveWorkspace={handleSaveWorkspace}
        onShowWorkspaceManagement={() => setIsWorkspaceModalOpen(true)}
        onLogout={onLogout}
      />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {renderView()}
      </main>
      
      <ViewItemModal isOpen={!!viewingItem} item={viewingItem} savedImages={savedImages} allUsers={allUsers} onClose={() => setViewingItem(null)}
        onEdit={(itemToEdit) => { setViewingItem(null); setEditingItem(itemToEdit); }}
        onDelete={(itemId) => { handleDeleteItem(itemId); setViewingItem(null); }}
      />
      <ViewNoteModal isOpen={!!viewingNote} note={viewingNote} savedImages={savedImages} onClose={() => setViewingNote(null)} />
      <EditItemModal isOpen={!!editingItem && editingItem.type !== 'note'} item={editingItem} statuses={statuses} savedImages={savedImages} friends={friends}
        onClose={() => setEditingItem(null)} onUpdate={handleUpdateItem} onDelete={handleDeleteItem}
      />
      <AddItemModal isOpen={isAddingItem} statuses={statuses} savedImages={savedImages} currentUser={currentUser} friends={friends} onClose={() => setIsAddingItem(false)} onAddItem={handleAddItem} />
      {selectionInfo && <SelectionToolbar position={selectionInfo.position} onAction={handleSelectionAction} />}
      <StylePanel
        isOpen={isStylePanelOpen}
        onClose={() => setIsStylePanelOpen(false)}
        settings={themeSettings}
        onSettingsChange={handleThemeChange}
      />
      <WorkspaceManagementModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        workspaces={workspaces}
        onSave={handleSaveWorkspace}
        onDelete={handleDeleteWorkspace}
       />
       <SummaryModal
         isOpen={summaryModalState.isOpen}
         content={summaryModalState.content}
         onClose={handleCloseSummaryModal}
       />
       <ShareNoteModal
         isOpen={!!sharingNote}
         note={sharingNote}
         friends={friends}
         onClose={() => setSharingNote(null)}
         onUpdateShare={handleUpdateItem as (note: Note) => void}
        />
    </div>
  );
};

export default App;