import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatSession, ChatMessage, ChatMessagePart, SavedImage, Folder, FolderType, PrebuiltVoice, ThemeSettings } from '../../types';
import { continueChat, generateSpeech } from '../../services/geminiService';
import * as audioService from '../../services/audioService';
import { SparklesIcon, PaperClipIcon, ArrowUpCircleIcon, XCircleIcon, PlusIcon, TrashIcon, ArrowPathIcon, BookmarkSquareIcon, PencilSquareIcon, CheckIcon, XMarkIcon, FolderIcon, FolderPlusIcon, FolderOpenIcon, DocumentMagnifyingGlassIcon, CpuChipIcon, SpeakerWaveIcon, StopIcon } from '../Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatViewProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  folders: Folder[];
  themeSettings: ThemeSettings;
  onSetActiveSession: (sessionId: string) => void;
  onNewSession: (folderId?: string | null) => Promise<ChatSession>;
  onUpdateSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onSaveImage: (imageData: Omit<SavedImage, 'id' | 'createdAt' | 'workspaceId' | 'folderId'>, folderId?: string | null) => void;
  onSaveAsNote: (content: string) => void;
  onSaveFolder: (folderData: Omit<Folder, 'id' | 'createdAt' | 'workspaceId'>, id?: string) => Promise<Folder>;
  onDeleteFolder: (folder: Folder) => void;
  onMoveItem: (itemId: string, itemType: 'chat', folderId: string | null) => void;
  onOpenSummaryModal: (content: string) => void;
  onNavigateToMindMap: (type: 'chat', id: string) => void;
}

const ChatView: React.FC<ChatViewProps> = (props) => {
  const { 
    sessions, activeSessionId, folders, themeSettings, onSetActiveSession, onNewSession,
    onUpdateSession, onDeleteSession, onSaveImage, onSaveAsNote, onSaveFolder, onDeleteFolder, onMoveItem,
    onOpenSummaryModal, onNavigateToMindMap
  } = props;
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [audioState, setAudioState] = useState<{ id: string; status: 'loading' | 'playing' } | null>(null);
  const [highlightState, setHighlightState] = useState<{ messageId: string | null; wordIndex: number }>({ messageId: null, wordIndex: -1 });
  const wordsRef = useRef<string[]>([]);
  const audioOperationRef = useRef(0);
  
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingImagePart, setSavingImagePart] = useState<ChatMessagePart | null>(null);
  
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.history]);
  
  useEffect(() => {
    audioService.stopAllAudio();
    setAudioState(null);
    setHighlightState({ messageId: null, wordIndex: -1 });
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      onSetActiveSession(sessions[0].id);
    }
  }, [activeSessionId, sessions, onSetActiveSession]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && !imageFile) || isLoading || !activeSession) return;
    setIsLoading(true);

    const userMessagePart: ChatMessagePart[] = [];
    if (prompt.trim()) userMessagePart.push({ text: prompt });
    if (imageFile && imageBase64) {
      const base64Data = imageBase64.split(',')[1];
      userMessagePart.push({ inlineData: { mimeType: imageFile.type, data: base64Data }});
    }
    const userMessage: ChatMessage = { role: 'user', parts: userMessagePart };
    
    const updatedHistory = [...activeSession.history, userMessage];
    let updatedSession = {...activeSession, history: updatedHistory};
    onUpdateSession(updatedSession);
    
    const currentPrompt = prompt;
    const currentImage = imageFile;
    setPrompt('');
    removeImage();

    try {
      const response = await continueChat(activeSession.history, { text: currentPrompt, image: currentImage });
      const finalHistory = [...updatedHistory, response];
      const firstUserMessage = finalHistory.find(m => m.role === 'user' && m.parts[0]?.text)?.parts[0]?.text;
      const newTitle = firstUserMessage ? firstUserMessage.substring(0, 30) + (firstUserMessage.length > 30 ? '...' : '') : "New Chat";

      updatedSession = {
        ...updatedSession,
        history: finalHistory,
        title: activeSession.title === "New Chat" ? newTitle : activeSession.title,
      };
      onUpdateSession(updatedSession);
    } catch (error) {
      console.error("Chat submission failed", error);
      const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "I'm sorry, an error occurred while processing your request." }] };
      onUpdateSession({...updatedSession, history: [...updatedHistory, errorMessage]});
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = async (text: string, messageId: string) => {
    const operationId = ++audioOperationRef.current;

    if (audioState?.id === messageId) {
      audioService.stopAllAudio();
      setAudioState(null);
      setHighlightState({ messageId: null, wordIndex: -1 });
      return;
    }
    
    audioService.stopAllAudio();
    setHighlightState({ messageId: null, wordIndex: -1 });

    if (themeSettings.voiceEngine === 'browser') {
        setAudioState({ id: messageId, status: 'playing' });
        wordsRef.current = text.split(/(\s+)/);

        const findWordIndex = (charIndex: number) => {
            let len = 0;
            for (let i = 0; i < wordsRef.current.length; i++) {
                len += wordsRef.current[i].length;
                if (charIndex < len) return i;
            }
            return -1;
        };

        audioService.speakBrowserTTS(
            text,
            (event) => {
                if (operationId === audioOperationRef.current) {
                    const wordIndex = findWordIndex(event.charIndex);
                    if (wordIndex !== -1 && wordsRef.current[wordIndex].trim() !== '') {
                        setHighlightState({ messageId, wordIndex });
                    }
                }
            },
            () => {
                if (operationId === audioOperationRef.current) {
                    setAudioState(null);
                    setHighlightState({ messageId: null, wordIndex: -1 });
                }
            }
        );
    } else { // AI voice
        try {
            setAudioState({ id: messageId, status: 'loading' });
            const audioBase64 = await generateSpeech(text, themeSettings.voice);

            if (operationId !== audioOperationRef.current) return;

            setAudioState({ id: messageId, status: 'playing' });
            audioService.playAIAudioFromBase64(audioBase64, () => {
                if (operationId === audioOperationRef.current) {
                    setAudioState(null);
                }
            });
        } catch (error) {
            if (operationId === audioOperationRef.current) {
                console.error("Failed to play audio", error);
                alert("Sorry, couldn't play the audio.");
                setAudioState(null);
            }
        }
    }
  };

  const handleNewSession = async () => {
    const newSession = await onNewSession(activeFolderId);
    onSetActiveSession(newSession.id);
  };

  const handleClearHistory = () => {
    if (activeSession && window.confirm("Are you sure you want to clear all messages in this chat?")) {
      onUpdateSession({ ...activeSession, history: [] });
    }
  };

  const handleDeleteSession = () => {
    if (activeSession && window.confirm(`Are you sure you want to delete "${activeSession.title}"?`)) {
      onDeleteSession(activeSession.id);
    }
  };

  const handleEditSessionTitle = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveSessionTitle = (e: React.FormEvent) => {
    e.preventDefault();
    const sessionToUpdate = sessions.find(s => s.id === editingSessionId);
    if (sessionToUpdate && editingTitle.trim()) {
      onUpdateSession({ ...sessionToUpdate, title: editingTitle.trim() });
    }
    setEditingSessionId(null);
  };

  const handleConfirmSaveImage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!savingImagePart?.inlineData) return;
    const imageName = (e.currentTarget.elements.namedItem('imageName') as HTMLInputElement).value;
    if (imageName.trim()) {
      onSaveImage({
        name: imageName.trim(),
        data: savingImagePart.inlineData.data,
        mimeType: savingImagePart.inlineData.mimeType,
      }, activeSession?.folderId);
      alert("Image saved to gallery!");
      setSavingImagePart(null);
    }
  };

  const handleSummarize = () => {
      if (!activeSession || activeSession.history.length === 0) return;
      const content = activeSession.history.map(msg => {
          const author = msg.role === 'user' ? 'User' : 'AI';
          const text = msg.parts.map(p => p.text || '[image]').join(' ');
          return `${author}: ${text}`;
      }).join('\n\n');
      onOpenSummaryModal(content);
  };

  const handleSaveFolder = async (name: string, id?: string) => {
    if (name.trim()) {
      await onSaveFolder({ name: name.trim(), type: FolderType.Chat }, id);
    }
    setEditingFolderId(null);
    setIsCreatingFolder(false);
  };

  const handleStartRenameFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };
  
  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ itemId: sessionId, itemType: 'chat' }));
  };
  
  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    if (data.itemType === 'chat') {
      onMoveItem(data.itemId, 'chat', folderId);
    }
    setDragOverFolderId(null);
  };

  const filteredSessions = useMemo(() => {
      return sessions.filter(s => (s.folderId || null) === activeFolderId);
  }, [sessions, activeFolderId]);

  const MarkdownContent = ({ text, messageId }: { text: string; messageId: string }) => {
    const isHighlighting = highlightState.messageId === messageId && themeSettings.voiceEngine === 'browser';
  
    if (isHighlighting) {
      return (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
          {wordsRef.current.map((word, index) => (
            <span key={index} className={index === highlightState.wordIndex ? 'bg-[var(--color-primary-500)]/30 rounded' : ''}>
              {word}
            </span>
          ))}
        </div>
      );
    }
  
    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    );
  };

  return (
    <>
      <div className="h-full flex animate-fade-in gap-6">
        <div className="w-1/3 max-w-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-2 flex flex-col">
          <div className="flex justify-between items-center p-2 mb-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Chat Sessions</h1>
            <button onClick={handleNewSession} title="New Chat" className="p-2 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-quaternary)] hover:text-[var(--text-primary)] transition-colors">
              <PlusIcon className="w-5 h-5"/>
            </button>
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
                {filteredSessions.map(session => (
                    <li key={session.id} draggable onDragStart={(e) => handleDragStart(e, session.id)}>
                    {editingSessionId === session.id ? (
                        <form onSubmit={handleSaveSessionTitle} className="p-3 bg-[var(--bg-quaternary)] rounded-md">
                            <input type="text" value={editingTitle} onChange={e => setEditingTitle(e.target.value)} onBlur={() => setEditingSessionId(null)} autoFocus className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md px-2 py-1 text-sm"/>
                        </form>
                    ) : (
                        <div onClick={() => onSetActiveSession(session.id)} className={`p-3 rounded-md cursor-pointer group flex justify-between items-center ${activeSessionId === session.id ? 'bg-[var(--color-primary-600)]/30' : 'hover:bg-[var(--bg-tertiary)]'}`}>
                            <div className="flex-1 min-w-0">
                                <h2 className={`font-semibold truncate ${activeSessionId === session.id ? 'text-[var(--color-primary-100)]' : 'text-[var(--text-primary)]'}`}>{session.title}</h2>
                            </div>
                            <button onClick={e => { e.stopPropagation(); handleEditSessionTitle(session); }} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ml-2">
                                <PencilSquareIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    )}
                    </li>
                ))}
                </ul>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)]">
          {activeSession ? (
            <>
              <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] truncate px-2">{activeSession.title}</h2>
                  <div className="flex items-center gap-2">
                      <button onClick={handleSummarize} title="Summarize Chat" className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-md hover:text-[var(--text-primary)] transition-colors"><DocumentMagnifyingGlassIcon className="w-5 h-5"/></button>
                      <button onClick={() => onNavigateToMindMap('chat', activeSession.id)} title="Generate Mind Map" className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-md hover:text-[var(--text-primary)] transition-colors"><CpuChipIcon className="w-5 h-5"/></button>
                      <button onClick={handleClearHistory} title="Clear History" className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-md hover:text-[var(--text-primary)] transition-colors"><ArrowPathIcon className="w-5 h-5"/></button>
                      <button onClick={handleDeleteSession} title="Delete Chat" className="p-2 text-[var(--text-secondary)] hover:bg-red-500/10 rounded-md hover:text-red-400 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {activeSession.history.map((msg, index) => {
                    const messageBlockId = `${activeSession.id}-${index}`;
                    const isPlaying = audioState?.id.startsWith(messageBlockId) && audioState.status === 'playing' && themeSettings.voiceEngine === 'ai';
                    return (
                        <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-[var(--color-primary-500)]/30 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-[var(--color-primary-300)]"/></div>}
                            <div className={`w-full max-w-xl space-y-2 rounded-[var(--border-radius)] transition-all ${isPlaying ? 'bg-[var(--color-primary-500)]/10' : ''}`}>
                              {msg.parts.map((part, partIndex) => {
                                const messageId = `${messageBlockId}-${partIndex}`;
                                const isLoadingAudio = audioState?.id === messageId && audioState.status === 'loading';
                                const isPlayingAudio = audioState?.id === messageId && audioState.status === 'playing';

                                return (
                                  <div key={partIndex} className={`p-4 rounded-[var(--border-radius)] relative group ${msg.role === 'user' ? 'bg-[var(--bg-tertiary)]' : 'bg-transparent'}`}>
                                    {part.text && <MarkdownContent text={part.text} messageId={messageId} />}
                                    {part.inlineData && (
                                      <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} alt="Chat content" className="rounded-md max-w-full sm:max-w-sm h-auto" />
                                    )}
                                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {msg.role === 'model' && part.text && (
                                            <button
                                                onClick={() => handlePlayAudio(part.text!, messageId)}
                                                className="p-1.5 bg-black/50 text-white rounded-full"
                                                title={isPlayingAudio ? 'Stop' : 'Read Aloud'}
                                            >
                                                {isLoadingAudio ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : isPlayingAudio ? <StopIcon className="w-5 h-5"/> : <SpeakerWaveIcon className="w-5 h-5"/>}
                                            </button>
                                        )}
                                        {msg.role === 'model' && part.inlineData && (
                                            <button onClick={() => setSavingImagePart(part)} className="p-1.5 bg-black/50 text-white rounded-full" title="Save Image"><BookmarkSquareIcon className="w-5 h-5"/></button>
                                        )}
                                        {msg.role === 'model' && part.text && (
                                            <button onClick={() => onSaveAsNote(part.text!)} className="p-1.5 bg-black/50 text-white rounded-full" title="Save as Note"><BookmarkSquareIcon className="w-5 h-5"/></button>
                                        )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-[var(--bg-quaternary)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] flex-shrink-0">YOU</div>}
                        </div>
                    )
                })}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-primary-500)]/30 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-[var(--color-primary-300)]"/></div>
                        <div className="p-4 rounded-[var(--border-radius)] bg-transparent animate-pulse w-full max-w-xl"><div className="h-4 bg-[var(--bg-tertiary)] rounded w-3/4"></div><div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/2 mt-2"></div></div>
                    </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  <form onSubmit={handleSubmit} className="relative">
                    {imageBase64 && (
                      <div className="absolute bottom-full left-0 mb-2 p-1.5 bg-[var(--bg-tertiary)] rounded-md">
                          <img src={imageBase64} alt="upload preview" className="w-16 h-16 object-cover rounded-md"/>
                          <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-slate-800 text-slate-300 rounded-full hover:bg-red-500 hover:text-white transition-colors"><XCircleIcon className="w-6 h-6"/></button>
                      </div>
                    )}
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }}} placeholder="Ask anything or describe an image..." rows={1} disabled={isLoading} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[var(--border-radius)] py-3 pl-12 pr-12 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] resize-none disabled:opacity-50 transition-colors" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-secondary)] hover:text-[var(--color-primary-400)] transition-colors"><PaperClipIcon className="w-5 h-5"/><input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden"/></button>
                    <button type="submit" disabled={isLoading || (!prompt.trim() && !imageFile)} className="absolute inset-y-0 right-0 flex items-center pr-3 disabled:opacity-40 group"><ArrowUpCircleIcon className={`w-7 h-7 transition-colors ${isLoading || (!prompt.trim() && !imageFile) ? 'text-[var(--text-muted)]' : 'text-[var(--color-primary-500)] group-hover:text-[var(--color-primary-400)]'}`} /></button>
                  </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-[var(--text-muted)]"><div><SparklesIcon className="w-16 h-16 mx-auto text-[var(--border-color)]"/><h2 className="text-xl font-semibold mt-4 text-[var(--text-primary)]">Select or create a chat</h2><p className="mt-2">Choose a conversation from the list or start a new one.</p></div></div>
          )}
        </div>
      </div>
      {savingImagePart && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast">
          <div className="bg-[var(--bg-secondary)] rounded-[var(--border-radius)] shadow-2xl w-full max-w-sm border border-[var(--border-color)]">
              <form onSubmit={handleConfirmSaveImage}>
                  <div className="p-6"><h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Save Image to Gallery</h3><label htmlFor="imageName" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Image Name</label><input type="text" name="imageName" id="imageName" placeholder="e.g., 'Sunset over mountains'" required autoFocus className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] transition-colors"/></div>
                  <div className="px-6 py-4 bg-[var(--bg-tertiary)]/50 border-t border-[var(--border-color)] flex justify-end gap-3"><button type="button" onClick={() => setSavingImagePart(null)} className="bg-[var(--bg-quaternary)] text-[var(--text-primary)] px-4 py-2 rounded-md text-sm font-semibold hover:bg-[var(--border-color)] transition-colors">Cancel</button><button type="submit" className="bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-[var(--color-primary-600)] transition-colors">Save</button></div>
              </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatView;