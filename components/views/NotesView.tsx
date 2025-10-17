import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Note, SavedImage, Folder, FolderType, ThemeSettings, PrebuiltVoice, User } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { DocumentTextIcon, PlusIcon, TrashIcon, SparklesIcon, ArrowDownTrayIcon, ArrowPathIcon, FolderIcon, FolderPlusIcon, PencilSquareIcon, FolderOpenIcon, DocumentMagnifyingGlassIcon, CpuChipIcon, SpeakerWaveIcon, StopIcon, UserGroupIcon } from '../Icons';
import MarkdownToolbar from '../MarkdownToolbar';
import { generateNoteContent, generateSpeech } from '../../services/geminiService';
import * as audioService from '../../services/audioService';
import SelectImageModal from '../SelectImageModal';

interface NotesViewProps {
  notes: Note[];
  savedImages: SavedImage[];
  folders: Folder[];
  themeSettings: ThemeSettings;
  currentUser: User;
  onUpdateNote: (updatedNote: Note) => void;
  onCreateNote: (folderId?: string | null) => Promise<Note>;
  onDeleteNote: (noteId: string) => void;
  onSaveFolder: (folderData: Omit<Folder, 'id' | 'createdAt' | 'workspaceId'>, id?: string) => Promise<Folder>;
  onDeleteFolder: (folder: Folder) => void;
  onMoveItem: (itemId: string, itemType: 'note', folderId: string | null) => void;
  onOpenSummaryModal: (content: string) => void;
  onNavigateToMindMap: (type: 'note', id: string) => void;
  onOpenShareModal: (note: Note) => void;
}

const NotesView: React.FC<NotesViewProps> = (props) => {
  const { notes, savedImages, folders, themeSettings, currentUser, onUpdateNote, onCreateNote, onDeleteNote, onSaveFolder, onDeleteFolder, onMoveItem, onOpenSummaryModal, onNavigateToMindMap, onOpenShareModal } = props;
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId), [notes, selectedNoteId]);
  
  const [editorContent, setEditorContent] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [aiNotePrompt, setAiNotePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSelectingImage, setIsSelectingImage] = useState(false);
  
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const wordsRef = useRef<string[]>([]);
  const audioOperationRef = useRef(0);

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const isOwner = selectedNote?.ownerId === currentUser.id;

  const displayedNotes = useMemo(() => {
    return notes.filter(n => (n.ownerId === currentUser.id || n.sharedWith.includes(currentUser.id)));
  }, [notes, currentUser]);
  
  const filteredNotes = useMemo(() => {
      return displayedNotes.filter(n => (n.folderId || null) === activeFolderId);
  }, [displayedNotes, activeFolderId]);


  useEffect(() => {
    if (!selectedNoteId && filteredNotes.length > 0) {
      setSelectedNoteId(filteredNotes[0].id);
    }
    if (selectedNoteId && !filteredNotes.find(n => n.id === selectedNoteId)) {
      setSelectedNoteId(filteredNotes.length > 0 ? filteredNotes[0].id : null);
    }
  }, [filteredNotes, selectedNoteId]);

  useEffect(() => {
    setEditorContent(selectedNote?.content ?? '');
    audioService.stopAllAudio();
    setAudioState('idle');
    setHighlightedWordIndex(-1);
  }, [selectedNote]);
  
  useEffect(() => {
      return () => { audioService.stopAllAudio(); }
  }, []);

  const transformImageUri = (uri: string) => {
    if (uri.startsWith('image:')) {
      const imageId = uri.substring(6);
      const image = savedImages.find(img => img.id === imageId);
      if (image) return `data:${image.mimeType};base64,${image.data}`;
      return '';
    }
    return uri;
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current || !selectedNote || isPrinting) return;
    setIsPrinting(true);
    try {
        const element = printRef.current;
        const isDarkMode = document.documentElement.classList.contains('dark');
        element.style.backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
        element.style.color = isDarkMode ? '#e2e8f0' : '#0f172a';

        const canvas = await html2canvas(element, { scale: 2, useCORS: true, windowWidth: element.scrollWidth, windowHeight: element.scrollHeight, backgroundColor: null });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const margin = 40;
        const contentWidth = pdfWidth - margin * 2;
        const contentHeight = (canvas.height * contentWidth) / canvas.width;
        let heightLeft = contentHeight;
        let position = margin;
        
        pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
        heightLeft -= (pdf.internal.pageSize.getHeight() - margin * 2);

        while (heightLeft > 0) {
            position -= (pdf.internal.pageSize.getHeight() - margin);
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
            heightLeft -= (pdf.internal.pageSize.getHeight() - margin * 2);
        }
        pdf.save(`${selectedNote.title.replace(/ /g, '_')}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Sorry, there was an error creating the PDF.");
    } finally {
        setIsPrinting(false);
        if (printRef.current) {
            printRef.current.style.backgroundColor = '';
            printRef.current.style.color = '';
        }
    }
  };

  const handleNoteSelect = (note: Note) => {
    if (selectedNote && isOwner && editorContent !== selectedNote.content) {
        onUpdateNote({ ...selectedNote, content: editorContent });
    }
    setSelectedNoteId(note.id);
  };

  const handleCreateNewNote = async () => {
    const newNote = await onCreateNote(activeFolderId);
    setSelectedNoteId(newNote.id);
  };

  const handleDeleteNote = () => {
    if (!selectedNoteId || !isOwner) return;
    if (window.confirm(`Are you sure you want to delete "${selectedNote?.title}"?`)) {
      onDeleteNote(selectedNoteId);
    }
  };
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (selectedNote && isOwner && editorContent !== selectedNote.content) {
          onUpdateNote({ ...selectedNote, content: editorContent });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [editorContent, selectedNote, onUpdateNote, isOwner]);

  const handleAIGenerateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiNotePrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
        const newContent = await generateNoteContent(aiNotePrompt);
        setEditorContent(prev => prev + (prev.trim() === '' ? '' : '\n\n') + newContent);
        setAiNotePrompt('');
    } catch (error) {
        console.error("AI content generation failed", error);
        alert("Sorry, I couldn't generate content for that topic.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleImageInsert = (image: SavedImage) => {
    const textarea = editorRef.current;
    if (!textarea) return;
    const sanitizedName = image.name.replace(/[[\]()]/g, '');
    const imageMarkdown = `\n![${sanitizedName}](image:${image.id})\n`;
    const { selectionStart, selectionEnd, value } = textarea;
    const newContent = value.substring(0, selectionStart) + imageMarkdown + value.substring(selectionEnd);
    setEditorContent(newContent);
    setIsSelectingImage(false);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = selectionStart + imageMarkdown.length;
    }, 0);
  };

  const handleSaveFolder = async (name: string, id?: string) => {
    if (name.trim()) {
      await onSaveFolder({ name: name.trim(), type: FolderType.Note }, id);
    }
    setEditingFolderId(null);
    setIsCreatingFolder(false);
  };

  const handleStartRenameFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };
  
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ itemId: noteId, itemType: 'note' }));
  };
  
  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    if (data.itemType === 'note') {
      onMoveItem(data.itemId, 'note', folderId);
    }
    setDragOverFolderId(null);
  };
  
  const handleReadAloud = async () => {
    const operationId = ++audioOperationRef.current;
    
    if (audioState === 'playing' || audioState === 'loading') {
        audioService.stopAllAudio();
        setAudioState('idle');
        setHighlightedWordIndex(-1);
        return;
    }

    if (!selectedNote || !editorContent.trim()) return;

    const textToRead = selectedNote.title + "\n\n" + editorContent;
    
    if (themeSettings.voiceEngine === 'browser') {
        setAudioState('playing'); // Browser TTS is fast, so go straight to playing
        wordsRef.current = textToRead.split(/(\s+)/); // Split by whitespace but keep them for reconstruction
        
        const findWordIndex = (charIndex: number) => {
            let accumulatedLength = 0;
            for (let i = 0; i < wordsRef.current.length; i++) {
                accumulatedLength += wordsRef.current[i].length;
                if (charIndex < accumulatedLength) {
                    return i;
                }
            }
            return -1;
        };

        audioService.speakBrowserTTS(
            textToRead,
            (event) => { // onBoundary
                if (operationId === audioOperationRef.current) {
                    const wordIndex = findWordIndex(event.charIndex);
                    if (wordIndex !== -1 && wordsRef.current[wordIndex].trim() !== '') {
                        setHighlightedWordIndex(wordIndex);
                    }
                }
            },
            () => { // onEnd
                 if (operationId === audioOperationRef.current) {
                    setAudioState('idle');
                    setHighlightedWordIndex(-1);
                }
            }
        );
    } else { // AI voice engine
        try {
            setAudioState('loading');
            const audioBase64 = await generateSpeech(textToRead, themeSettings.voice);
            if (operationId !== audioOperationRef.current) return;
            setAudioState('playing');
            audioService.playAIAudioFromBase64(audioBase64, () => {
                if (operationId === audioOperationRef.current) {
                    setAudioState('idle');
                }
            });
        } catch (error) {
            if (operationId === audioOperationRef.current) {
                console.error("Failed to read note", error);
                alert("Sorry, couldn't read the note aloud.");
                setAudioState('idle');
            }
        }
    }
  };
  
  const MarkdownPreview = () => {
    if (audioState === 'playing' && themeSettings.voiceEngine === 'browser') {
        return (
            <div className="whitespace-pre-wrap">
                {wordsRef.current.map((word, index) => (
                    <span key={index} className={index === highlightedWordIndex ? 'bg-[var(--color-primary-500)]/30 rounded' : ''}>
                        {word}
                    </span>
                ))}
            </div>
        );
    }
    return <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={transformImageUri}>{editorContent}</ReactMarkdown>;
  };

  if (displayedNotes.length === 0 && folders.length === 0) {
      return (
          <div className="text-center py-16 px-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] animate-fade-in">
              <DocumentTextIcon className="w-12 h-12 mx-auto text-[var(--text-muted)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-4">No Notes Found</h3>
              <p className="text-[var(--text-secondary)] mt-2">Create your first note or use the AI assistant!</p>
              <button onClick={handleCreateNewNote} className="mt-4 bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-[var(--border-radius)] text-sm font-semibold hover:bg-[var(--color-primary-600)] transition-colors flex items-center gap-2 mx-auto">
                <PlusIcon className="w-4 h-4" />
                Create Note
              </button>
          </div>
      )
  }

  return (
    <>
      {selectedNote && (
         <div ref={printRef} style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px' }} className={document.documentElement.classList.contains('dark') ? 'dark' : ''}>
            <div className="p-8"><h1 className="text-3xl font-bold border-b border-[var(--border-color)] pb-4 mb-4">{selectedNote.title}</h1><div className="prose dark:prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={transformImageUri}>{editorContent}</ReactMarkdown></div></div>
         </div>
      )}
      <div className="flex h-full animate-fade-in gap-6">
        <div className="w-1/3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-2 flex flex-col">
          <div className="flex justify-between items-center px-2 pt-2 mb-2">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Notes</h1>
              <button onClick={handleCreateNewNote} className="p-2 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-quaternary)] hover:text-[var(--text-primary)] transition-colors"><PlusIcon className="w-5 h-5"/></button>
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
                    {activeFolderId === null ? <strong>Uncategorized</strong> : 'Uncategorized'}
                </h3>
                <ul className="space-y-1">
                    {filteredNotes.map(note => (
                        <li key={note.id} onClick={() => handleNoteSelect(note)} draggable={note.ownerId === currentUser.id} onDragStart={(e) => handleDragStart(e, note.id)}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${selectedNoteId === note.id ? 'bg-[var(--color-primary-600)]/30' : 'hover:bg-[var(--bg-tertiary)]'}`}>
                            <h2 className={`font-semibold truncate ${selectedNoteId === note.id ? 'text-[var(--color-primary-100)]' : 'text-[var(--text-primary)]'}`}>{note.title}</h2>
                            <p className="text-sm text-[var(--text-secondary)] truncate mt-1">{note.content?.split('\n')[0] || 'No content'}</p>
                        </li>
                    ))}
                </ul>
            </div>
          </div>
        </div>

        {selectedNote ? (
          <div className={`w-2/3 flex flex-col bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] transition-all ${audioState === 'playing' && themeSettings.voiceEngine === 'ai' ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)] ring-[var(--color-primary-500)]' : ''}`}>
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-start">
              <div>
                  <input type="text" value={selectedNote.title} onChange={e => onUpdateNote({...selectedNote, title: e.target.value})} readOnly={!isOwner} className={`w-full bg-transparent text-xl font-bold text-[var(--text-primary)] focus:outline-none ${!isOwner ? 'cursor-default' : ''}`}/>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Created: {new Date(selectedNote.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {isOwner && (
                    <button onClick={() => onOpenShareModal(selectedNote)} title="Share Note" className="p-2 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-quaternary)] hover:text-[var(--text-primary)] transition-colors"><UserGroupIcon className="w-5 h-5"/></button>
                  )}
                  <button onClick={handleReadAloud} title={audioState === 'playing' ? 'Stop Reading' : 'Read Note Aloud'} className="p-2 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-quaternary)] hover:text-[var(--text-primary)] transition-colors">
                    {audioState === 'loading' ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : audioState === 'playing' ? <StopIcon className="w-5 h-5"/> : <SpeakerWaveIcon className="w-5 h-5"/>}
                  </button>
                  <button onClick={() => onOpenSummaryModal(selectedNote.title + '\n\n' + editorContent)} title="Summarize with AI" className="p-2 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-quaternary)] hover:text-[var(--text-primary)] transition-colors"><DocumentMagnifyingGlassIcon className="w-5 h-5"/></button>
                  <button onClick={() => onNavigateToMindMap('note', selectedNote.id)} title="Generate Mind Map" className="p-2 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-quaternary)] hover:text-[var(--text-primary)] transition-colors"><CpuChipIcon className="w-5 h-5"/></button>
                  <button onClick={handleDownloadPdf} disabled={isPrinting} className="p-2 w-28 text-center text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-quaternary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-wait">
                      {isPrinting ? <span className="flex items-center justify-center gap-2"><ArrowPathIcon className="w-5 h-5 animate-spin"/>Saving...</span> : <span className="flex items-center justify-center gap-2"><ArrowDownTrayIcon className="w-5 h-5"/>PDF</span>}
                  </button>
                  {isOwner && (
                    <button onClick={handleDeleteNote} title="Delete Note" className="p-2 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-md hover:bg-red-500/10 hover:text-red-400 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                  )}
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-px bg-[var(--border-color)] overflow-hidden">
              <div className="flex flex-col bg-[var(--bg-secondary)]"><MarkdownToolbar editorRef={editorRef} setContent={setEditorContent} onInsertImage={() => setIsSelectingImage(true)}/><textarea ref={editorRef} value={editorContent} onChange={e => setEditorContent(e.target.value)} placeholder="Start writing your note here..." readOnly={!isOwner} className={`w-full flex-1 bg-[var(--bg-secondary)] p-4 resize-none focus:outline-none text-[var(--text-primary)] font-mono text-sm ${!isOwner ? 'cursor-not-allowed' : ''}`}/>
                  {isOwner && (
                    <div className="p-2 border-t border-[var(--border-color)]">
                        <form onSubmit={handleAIGenerateContent}><div className="relative"><input type="text" value={aiNotePrompt} onChange={e => setAiNotePrompt(e.target.value)} placeholder="Ask AI to write about a topic..." disabled={isGenerating} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md py-2 pl-3 pr-10 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] transition-colors disabled:opacity-50"/><button type="submit" disabled={isGenerating || !aiNotePrompt.trim()} className="absolute inset-y-0 right-0 flex items-center pr-3 disabled:opacity-40 disabled:cursor-not-allowed group"><SparklesIcon className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--color-primary-400)] transition-colors" /></button></div>{isGenerating && <p className="text-xs text-[var(--text-muted)] mt-2 text-center animate-pulse">Generating content...</p>}</form>
                    </div>
                  )}
              </div>
              <div className="bg-[var(--bg-tertiary)] p-4 overflow-y-auto h-full"><div className="prose prose-sm dark:prose-invert max-w-none"><MarkdownPreview /></div></div>
            </div>
          </div>
        ) : (
          <div className="w-2/3 flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)]"><div className="text-center"><DocumentTextIcon className="w-12 h-12 mx-auto text-[var(--text-muted)]" /><h3 className="text-lg font-semibold text-[var(--text-primary)] mt-4">Select a note</h3><p className="text-[var(--text-secondary)] mt-2">Choose a note from the list to view or edit it.</p></div></div>
        )}
      </div>
      <SelectImageModal isOpen={isSelectingImage} images={savedImages} onClose={() => setIsSelectingImage(false)} onSelect={handleImageInsert}/>
    </>
  );
};

export default NotesView;