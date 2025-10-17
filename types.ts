export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  dashboardWidgets?: Widget[];
}

export enum FolderType {
  Note = 'note',
  Chat = 'chat',
  Image = 'image',
}

export interface Folder {
  id: string;
  name: string;
  type: FolderType;
  workspaceId: string;
  createdAt: string;
}

export enum ItemType {
  Task = 'task',
  Event = 'event',
  Note = 'note',
}

export interface BaseItem {
  id: string;
  type: ItemType;
  title: string;
  workspaceId: string;
}

export interface Task extends BaseItem {
  type: ItemType.Task | ItemType.Event;
  description?: string;
  status: string;
  dueDate: Date | null;
  imageId?: string;
  createdBy: string; // User ID
  assignedTo: string[]; // Array of User IDs
}

export interface Note extends BaseItem {
  type: ItemType.Note;
  content: string;
  createdAt: string;
  folderId?: string | null;
  ownerId: string; // User ID
  sharedWith: string[]; // Array of User IDs
}

export type Item = Task | Note;

export type ViewType = 'dashboard' | 'tasks' | 'kanban' | 'calendar' | 'notes' | 'chat' | 'gallery' | 'workflows' | 'mindmap' | 'admin' | 'friends';

export interface ChatMessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 encoded
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatMessagePart[];
}

export interface ChatSession {
  id: string;
  title: string;
  history: ChatMessage[];
  createdAt: string;
  workspaceId: string;
  folderId?: string | null;
}

export interface SavedImage {
  id: string;
  name: string;
  data: string; // base64 encoded
  mimeType: string;
  createdAt: string;
  workspaceId: string;
  folderId?: string | null;
}

export type PrebuiltVoice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface ThemeSettings {
  mode: 'light' | 'dark';
  color: 'sky' | 'rose' | 'emerald' | 'indigo';
  fontSize: 'sm' | 'md' | 'lg';
  cornerRadius: 'sm' | 'md' | 'lg';
  voiceEngine: 'ai' | 'browser';
  voice: PrebuiltVoice;
}

// New Workflow Types
export enum WorkflowTriggerType {
  Manual = 'manual',
  TaskCreated = 'task_created',
}

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  config: {
    titleKeywords?: string; // For TaskCreated trigger
  };
}

export enum WorkflowActionType {
  CreateTask = 'create_task',
  CreateNote = 'create_note',
}

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  config: {
    title: string;
    description?: string; // For Task
    content?: string; // For Note
    status?: string; // For Task
    dueDateOffsetDays?: number; // For Task, in days from trigger time
  };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  createdAt: string;
  workspaceId: string;
}

// Mind Map Types
export interface GraphNode {
  id: string;
  label: string;
  group: number;
}

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
}

export interface MindMapData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// New Widget Types
export type WidgetType = 
  | 'pomodoro' 
  | 'quote' 
  | 'streak'
  | 'task_stats'
  | 'status_chart'
  | 'completion_chart'
  | 'upcoming_tasks'
  | 'recent_notes';

export interface Widget {
  id: string;
  type: WidgetType;
}

// User Authentication
export interface User {
    id: string;
    username: string;
    password: string; // NOTE: Storing plaintext as requested. In a real application, this should be a secure hash.
    role: 'admin' | 'user';
    createdAt: string;
    friends: string[]; // Array of User IDs
}

// Friend Invitations
export interface Invitation {
    id: string;
    fromId: string;
    toId: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: string;
}