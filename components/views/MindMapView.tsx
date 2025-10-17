import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ForceGraph2D, { GraphData } from 'react-force-graph-2d';
import { Note, ChatSession, MindMapData } from '../../types';
import { generateMindMapData } from '../../services/geminiService';
import { CpuChipIcon, SparklesIcon } from '../Icons';

interface MindMapViewProps {
  notes: Note[];
  sessions: ChatSession[];
  preselectedSource: { type: 'note' | 'chat'; id: string } | null;
  onPreselectionUsed: () => void;
}

const MindMapView: React.FC<MindMapViewProps> = ({ notes, sessions, preselectedSource, onPreselectionUsed }) => {
  const [sourceType, setSourceType] = useState<'note' | 'chat'>('note');
  const [sourceId, setSourceId] = useState<string>('');
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceOptions = useMemo(() => {
    if (sourceType === 'note') {
      return notes.map(n => ({ id: n.id, title: n.title }));
    }
    return sessions.map(s => ({ id: s.id, title: s.title }));
  }, [sourceType, notes, sessions]);

  const handleGenerate = useCallback(async (type: 'note' | 'chat', id: string) => {
    if (!id) {
      setError('Please select a source to analyze.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setMindMapData(null);
    try {
      let content = '';
      if (type === 'note') {
        const note = notes.find(n => n.id === id);
        if (note) content = `Title: ${note.title}\n\n${note.content}`;
      } else {
        const session = sessions.find(s => s.id === id);
        if (session) {
          content = session.history
            .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.parts.map(p => p.text).join(' ')}`)
            .join('\n');
        }
      }
      if (!content.trim()) throw new Error('The selected source is empty.');
      const data = await generateMindMapData(content);
      setMindMapData(data);
    } catch (err) {
      console.error('Mind map generation failed:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [notes, sessions]);

  useEffect(() => {
    if (preselectedSource) {
      setSourceType(preselectedSource.type);
      setSourceId(preselectedSource.id);
      handleGenerate(preselectedSource.type, preselectedSource.id);
      onPreselectionUsed();
    }
  }, [preselectedSource, onPreselectionUsed, handleGenerate]);
  
  useEffect(() => {
    if (preselectedSource) return; // Don't reset if we're handling a preselection
    setMindMapData(null);
    setError(null);
    if (sourceOptions.length > 0) {
      setSourceId(sourceOptions[0].id);
    } else {
      setSourceId('');
    }
  }, [sourceType, sourceOptions, preselectedSource]);

  return (
    <div className="flex h-full animate-fade-in gap-6">
      <div className="w-1/3 max-w-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-6 flex flex-col">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Mind Map Generator</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Source Type</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as 'note' | 'chat')}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
            >
              <option value="note">Note</option>
              <option value="chat">AI Chat</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Select Item</label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              disabled={sourceOptions.length === 0}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] disabled:opacity-50"
            >
              {sourceOptions.length > 0 ? (
                  sourceOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.title}</option>)
              ) : (
                  <option>No items available</option>
              )}
            </select>
          </div>
        </div>
        
        <button
          onClick={() => handleGenerate(sourceType, sourceId)}
          disabled={isLoading || !sourceId}
          className="w-full mt-6 flex items-center justify-center gap-2 px-3 py-3 bg-[var(--color-primary-500)] text-white rounded-[var(--border-radius)] text-sm font-semibold hover:bg-[var(--color-primary-600)] transition-colors disabled:bg-opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              Generate Mind Map
            </>
          )}
        </button>
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
      </div>

      <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] overflow-hidden relative">
        {mindMapData ? (
          <ForceGraph2D
            graphData={mindMapData as GraphData}
            nodeLabel="label"
            nodeAutoColorBy="group"
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.15}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
                const label = node.label;
                const fontSize = 12 / globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const isDark = document.documentElement.classList.contains('dark');
                ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';
                ctx.fillText(label, node.x, node.y);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
             <div className="text-center text-[var(--text-muted)]">
                <CpuChipIcon className="w-16 h-16 mx-auto text-[var(--border-color)]"/>
                <h2 className="text-xl font-semibold mt-4 text-[var(--text-primary)]">Visualize Your Knowledge</h2>
                <p className="mt-2 max-w-md mx-auto">Select a note or chat from the panel and click "Generate" to see an AI-powered visualization of its core concepts.</p>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MindMapView;
