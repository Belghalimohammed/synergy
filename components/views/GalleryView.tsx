import React, { useState, useMemo } from 'react';
import { SavedImage, Folder, FolderType } from '../../types';
import { PhotoIcon, TrashIcon, PencilSquareIcon, FolderIcon, FolderPlusIcon, FolderOpenIcon } from '../Icons';

interface GalleryViewProps {
  images: SavedImage[];
  folders: Folder[];
  onDelete: (imageId: string) => void;
  onSaveFolder: (folderData: Omit<Folder, 'id' | 'createdAt' | 'workspaceId'>, id?: string) => Promise<Folder>;
  onDeleteFolder: (folder: Folder) => void;
  onMoveItem: (itemId: string, itemType: 'image', folderId: string | null) => void;
}

const GalleryView: React.FC<GalleryViewProps> = ({ images, folders, onDelete, onSaveFolder, onDeleteFolder, onMoveItem }) => {
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const handleDelete = (image: SavedImage) => {
    if (window.confirm(`Are you sure you want to delete the image "${image.name}"?`)) {
      onDelete(image.id);
    }
  };

  const handleSaveFolder = async (name: string, id?: string) => {
    if (name.trim()) {
      await onSaveFolder({ name: name.trim(), type: FolderType.Image }, id);
    }
    setEditingFolderId(null);
    setIsCreatingFolder(false);
  };

  const handleStartRenameFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };
  
  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ itemId: imageId, itemType: 'image' }));
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    if (data.itemType === 'image') {
      onMoveItem(data.itemId, 'image', folderId);
    }
    setDragOverFolderId(null);
  };
  
  const filteredImages = useMemo(() => {
    if (activeFolderId === null) return images;
    return images.filter(i => i.folderId === activeFolderId);
  }, [images, activeFolderId]);

  return (
    <div className="animate-fade-in flex h-full gap-6">
      {/* Folder Sidebar */}
      <div className="w-1/3 max-w-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-2 flex flex-col">
          <div className="p-2 mb-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Image Folders</h1>
          </div>
          <div className="overflow-y-auto pr-1 flex-1">
             <div className="px-2 mb-2">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-semibold text-[var(--text-muted)]">Folders</h3>
                    <button onClick={() => setIsCreatingFolder(true)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><FolderPlusIcon className="w-5 h-5"/></button>
                </div>
                {isCreatingFolder && (
                    <form onSubmit={(e) => { e.preventDefault(); handleSaveFolder(editingFolderName); setEditingFolderName(''); }} className="mb-2">
                        <input type="text" value={editingFolderName} onChange={e => setEditingFolderName(e.target.value)} autoFocus onBlur={() => setIsCreatingFolder(false)} placeholder="New folder name" className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-2 py-1 text-sm"/>
                    </form>
                )}
                <ul className="space-y-1">
                    {folders.map(folder => (
                        <li key={folder.id} onDragOver={(e) => {e.preventDefault(); setDragOverFolderId(folder.id)}} onDragLeave={() => setDragOverFolderId(null)} onDrop={(e) => handleDrop(e, folder.id)}
                            className={`rounded-md group transition-colors ${dragOverFolderId === folder.id ? 'bg-[var(--color-primary-500)]/20' : ''}`}>
                             {editingFolderId === folder.id ? (
                                <input type="text" value={editingFolderName} onChange={e => setEditingFolderName(e.target.value)} autoFocus onBlur={() => handleSaveFolder(editingFolderName, folder.id)} onKeyDown={e => e.key === 'Enter' && handleSaveFolder(editingFolderName, folder.id)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-3 py-2 text-sm"/>
                             ) : (
                                <div onClick={() => setActiveFolderId(folder.id)} className={`flex justify-between items-center p-2 cursor-pointer rounded-md ${activeFolderId === folder.id ? 'bg-[var(--color-primary-600)]/30' : 'hover:bg-[var(--bg-tertiary)]'}`}>
                                    <div className="flex items-center gap-2">
                                        {activeFolderId === folder.id ? <FolderOpenIcon className="w-5 h-5 text-[var(--color-primary-200)]"/> : <FolderIcon className="w-5 h-5 text-[var(--text-secondary)]"/>}
                                        <span className={`font-semibold truncate ${activeFolderId === folder.id ? 'text-[var(--color-primary-100)]' : 'text-[var(--text-primary)]'}`}>{folder.name}</span>
                                    </div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100">
                                        <button onClick={(e)=>{e.stopPropagation(); handleStartRenameFolder(folder)}} className="p-1"><PencilSquareIcon className="w-4 h-4 text-[var(--text-muted)]"/></button>
                                        <button onClick={(e)=>{e.stopPropagation(); onDeleteFolder(folder)}} className="p-1"><TrashIcon className="w-4 h-4 text-[var(--text-muted)]"/></button>
                                    </div>
                                </div>
                             )}
                        </li>
                    ))}
                </ul>
             </div>
             <div className="w-full h-px bg-[var(--border-color)] my-2"></div>
             <div onDragOver={(e) => { e.preventDefault(); setDragOverFolderId('uncategorized'); }} onDragLeave={() => setDragOverFolderId(null)} onDrop={(e) => handleDrop(e, null)}
                className={`p-2 rounded-md transition-colors ${dragOverFolderId === 'uncategorized' ? 'bg-[var(--color-primary-500)]/20' : ''}`}>
                <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-1 cursor-pointer" onClick={() => setActiveFolderId(null)}>
                    {activeFolderId === null ? <strong>All Images</strong> : 'All Images'}
                </h3>
            </div>
          </div>
      </div>
      
      {/* Image Grid */}
      <div className="flex-1">
        <h1 className="text-3xl font-bold mb-6 text-[var(--text-primary)]">
            {activeFolderId ? folders.find(f=>f.id === activeFolderId)?.name : 'All Images'}
        </h1>
        {filteredImages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredImages.map(image => (
              <div key={image.id} draggable onDragStart={(e) => handleDragStart(e, image.id)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] overflow-hidden group cursor-grab">
                <div className="aspect-square bg-[var(--bg-tertiary)]">
                  <img src={`data:${image.mimeType};base64,${image.data}`} alt={image.name} className="w-full h-full object-cover"/>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start gap-2">
                      <p className="font-semibold text-[var(--text-primary)] break-all">{image.name}</p>
                      <button onClick={() => handleDelete(image)} className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                          <TrashIcon className="w-4 h-4" />
                      </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{new Date(image.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)]">
              <PhotoIcon className="w-12 h-12 mx-auto text-[var(--text-muted)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-4">This Folder is Empty</h3>
              <p className="text-[var(--text-secondary)] mt-2">Save images from the AI Chat or drag them here to organize.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryView;