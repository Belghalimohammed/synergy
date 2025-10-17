import { Item, ChatSession, SavedImage, Workflow, Workspace, Folder, User, Invitation, Task, Note } from '../types';

const DB_NAME = 'SynergyAIDB';
const DB_VERSION = 7; // Incremented for social features
const ITEMS_STORE = 'items';
const STATUSES_STORE = 'statuses';
const CHAT_SESSIONS_STORE = 'chatSessions';
const SAVED_IMAGES_STORE = 'savedImages';
const WORKFLOWS_STORE = 'workflows';
const WORKSPACES_STORE = 'workspaces';
const FOLDERS_STORE = 'folders';
const USERS_STORE = 'users';
const INVITATIONS_STORE = 'invitations';
const STATUSES_KEY = 'kanban_statuses';

let db: IDBDatabase;

const seedAdminUser = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const store = getStore(USERS_STORE, 'readwrite');
        const index = store.index('username');
        const getRequest = index.get('simobel');

        getRequest.onsuccess = () => {
            if (!getRequest.result) {
                // Admin does not exist, create it
                const adminUser: User = {
                    id: `user_${Date.now()}`,
                    username: 'simobel',
                    password: '123456789', // As requested.
                    role: 'admin',
                    createdAt: new Date().toISOString(),
                    friends: [],
                };
                const addRequest = store.add(adminUser);
                addRequest.onsuccess = () => resolve();
                addRequest.onerror = () => reject(addRequest.error);
            } else {
                // Admin already exists
                resolve();
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};

export const initDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(true);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database error:', request.error);
      reject(new Error('Error opening database'));
    };

    request.onsuccess = async () => {
      db = request.result;
      await seedAdminUser();
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      const tx = (event.target as IDBOpenDBRequest).transaction;

      // Initial schema creation for versions before 7
      if (event.oldVersion < 1) { // A catch-all for creating the DB from scratch
          if (!dbInstance.objectStoreNames.contains(ITEMS_STORE)) {
              const itemsStore = dbInstance.createObjectStore(ITEMS_STORE, { keyPath: 'id' });
              itemsStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          }
          if (!dbInstance.objectStoreNames.contains(STATUSES_STORE)) {
              dbInstance.createObjectStore(STATUSES_STORE, { keyPath: 'id' });
          }
          if (!dbInstance.objectStoreNames.contains(CHAT_SESSIONS_STORE)) {
              const chatStore = dbInstance.createObjectStore(CHAT_SESSIONS_STORE, { keyPath: 'id' });
              chatStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          }
           if (!dbInstance.objectStoreNames.contains(SAVED_IMAGES_STORE)) {
              const imageStore = dbInstance.createObjectStore(SAVED_IMAGES_STORE, { keyPath: 'id' });
              imageStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          }
           if (!dbInstance.objectStoreNames.contains(WORKFLOWS_STORE)) {
              const workflowStore = dbInstance.createObjectStore(WORKFLOWS_STORE, { keyPath: 'id' });
              workflowStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          }
           if (!dbInstance.objectStoreNames.contains(WORKSPACES_STORE)) {
              dbInstance.createObjectStore(WORKSPACES_STORE, { keyPath: 'id' });
          }
           if (!dbInstance.objectStoreNames.contains(FOLDERS_STORE)) {
              const folderStore = dbInstance.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
              folderStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          }
           if (!dbInstance.objectStoreNames.contains(USERS_STORE)) {
              const usersStore = dbInstance.createObjectStore(USERS_STORE, { keyPath: 'id' });
              usersStore.createIndex('username', 'username', { unique: true });
          }
      }
      
      // Migration for version 7 (Social Features)
      if (event.oldVersion < 7) {
        // Create invitations store
        if (!dbInstance.objectStoreNames.contains(INVITATIONS_STORE)) {
            const invitationsStore = dbInstance.createObjectStore(INVITATIONS_STORE, { keyPath: 'id' });
            invitationsStore.createIndex('toId', 'toId', { unique: false });
            invitationsStore.createIndex('fromId', 'fromId', { unique: false });
        }
        
        // The transaction now has access to all required stores
        const userStore = tx!.objectStore(USERS_STORE);
        userStore.openCursor().onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const user = cursor.value as User;
                if (!user.friends) {
                    user.friends = [];
                    cursor.update(user);
                }
                cursor.continue();
            }
        };
        
        const itemsStore = tx!.objectStore(ITEMS_STORE);
        itemsStore.openCursor().onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const item = cursor.value;
                if (item.type === 'task' || item.type === 'event') {
                    const task = item as Task;
                    if (task.createdBy === undefined) task.createdBy = 'system';
                    if (task.assignedTo === undefined) task.assignedTo = [];
                    cursor.update(task);
                }
                if (item.type === 'note') {
                    const note = item as Note;
                    if (note.ownerId === undefined) note.ownerId = 'system';
                    if (note.sharedWith === undefined) note.sharedWith = [];
                    cursor.update(note);
                }
                cursor.continue();
            }
        };
      }
    };
  });
};

const getStore = (storeName: string, mode: IDBTransactionMode): IDBObjectStore => {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
};

// Items, Statuses, Chat, Images, Workflows, Workspaces, Folders (no changes to these functions)
export const getAllItems = (workspaceId: string): Promise<Item[]> => {
  return new Promise((resolve, reject) => {
    const store = getStore(ITEMS_STORE, 'readonly');
    const index = store.index('workspaceId');
    const request = index.getAll(workspaceId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};
export const saveItem = (item: Item): Promise<void> => {
  return new Promise((resolve, reject) => {
    const store = getStore(ITEMS_STORE, 'readwrite');
    const request = store.put(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
export const deleteItem = (itemId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const store = getStore(ITEMS_STORE, 'readwrite');
    const request = store.delete(itemId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
export const getStatuses = (): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const store = getStore(STATUSES_STORE, 'readonly');
    const request = store.get(STATUSES_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result ? request.result.value : []);
    };
  });
};
export const saveStatuses = (statuses: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    const store = getStore(STATUSES_STORE, 'readwrite');
    const request = store.put({ id: STATUSES_KEY, value: statuses });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
export const getAllChatSessions = (workspaceId: string): Promise<ChatSession[]> => {
  return new Promise((resolve, reject) => {
    const store = getStore(CHAT_SESSIONS_STORE, 'readonly');
    const index = store.index('workspaceId');
    const request = index.getAll(workspaceId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });
};
export const saveChatSession = (session: ChatSession): Promise<void> => {
  return new Promise((resolve, reject) => {
    const store = getStore(CHAT_SESSIONS_STORE, 'readwrite');
    const request = store.put(session);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
export const deleteChatSession = (sessionId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const store = getStore(CHAT_SESSIONS_STORE, 'readwrite');
    const request = store.delete(sessionId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
export const getAllSavedImages = (workspaceId: string): Promise<SavedImage[]> => {
    return new Promise((resolve, reject) => {
        const store = getStore(SAVED_IMAGES_STORE, 'readonly');
        const index = store.index('workspaceId');
        const request = index.getAll(workspaceId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
};
export const saveSavedImage = (image: SavedImage): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore(SAVED_IMAGES_STORE, 'readwrite');
        const request = store.put(image);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};
export const deleteSavedImage = (imageId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore(SAVED_IMAGES_STORE, 'readwrite');
        const request = store.delete(imageId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};
export const getAllWorkflows = (workspaceId: string): Promise<Workflow[]> => {
  return new Promise((resolve, reject) => {
    const store = getStore(WORKFLOWS_STORE, 'readonly');
    const index = store.index('workspaceId');
    const request = index.getAll(workspaceId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};
export const saveWorkflow = (workflow: Workflow): Promise<void> => {
  return new Promise((resolve, reject) => {
    const store = getStore(WORKFLOWS_STORE, 'readwrite');
    const request = store.put(workflow);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
export const deleteWorkflow = (workflowId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const store = getStore(WORKFLOWS_STORE, 'readwrite');
    const request = store.delete(workflowId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
export const getAllWorkspaces = (): Promise<Workspace[]> => {
  return new Promise((resolve, reject) => {
    const store = getStore(WORKSPACES_STORE, 'readonly');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  });
};
export const saveWorkspace = (workspace: Workspace): Promise<void> => {
  return new Promise((resolve, reject) => {
    const store = getStore(WORKSPACES_STORE, 'readwrite');
    const request = store.put(workspace);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
export const deleteWorkspace = (workspaceId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const storesToDeleteFrom = [WORKSPACES_STORE, ITEMS_STORE, CHAT_SESSIONS_STORE, SAVED_IMAGES_STORE, WORKFLOWS_STORE, FOLDERS_STORE];
    const tx = db.transaction(storesToDeleteFrom, 'readwrite');
    
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    storesToDeleteFrom.forEach(storeName => {
        const store = tx.objectStore(storeName);
        if (storeName === WORKSPACES_STORE) {
            store.delete(workspaceId);
        } else {
            const index = store.index('workspaceId');
            const request = index.openCursor(IDBKeyRange.only(workspaceId));
            request.onsuccess = (e) => {
                const cursor = (e.target as IDBRequest<IDBCursor>).result;
                if(cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                }
            }
        }
    });
  });
};
export const getAllFoldersForWorkspace = (workspaceId: string): Promise<Folder[]> => {
    return new Promise((resolve, reject) => {
        const store = getStore(FOLDERS_STORE, 'readonly');
        const index = store.index('workspaceId');
        const request = index.getAll(workspaceId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};
export const saveFolder = (folder: Folder): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore(FOLDERS_STORE, 'readwrite');
        const request = store.put(folder);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};
export const deleteFolder = (folderId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore(FOLDERS_STORE, 'readwrite');
        const request = store.delete(folderId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

// Users
export const getUserByUsername = (username: string): Promise<User | undefined> => {
    return new Promise((resolve, reject) => {
        const store = getStore(USERS_STORE, 'readonly');
        const index = store.index('username');
        const request = index.get(username);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

export const getAllUsers = (): Promise<User[]> => {
    return new Promise((resolve, reject) => {
        const store = getStore(USERS_STORE, 'readonly');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

export const saveUser = (user: User): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore(USERS_STORE, 'readwrite');
        const request = store.put(user);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const deleteUser = (userId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore(USERS_STORE, 'readwrite');
        const request = store.delete(userId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

// Invitations
export const getAllInvitations = (): Promise<Invitation[]> => {
    return new Promise((resolve, reject) => {
        const store = getStore(INVITATIONS_STORE, 'readonly');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

export const saveInvitation = (invitation: Invitation): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore(INVITATIONS_STORE, 'readwrite');
        const request = store.put(invitation);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const deleteInvitation = (invitationId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore(INVITATIONS_STORE, 'readwrite');
        const request = store.delete(invitationId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};