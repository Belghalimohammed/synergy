import React from 'react';
import { ThemeSettings, PrebuiltVoice } from '../types';
import { XMarkIcon, CheckIcon } from './Icons';
import ThemeSlider from './ThemeSlider';

interface StylePanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ThemeSettings;
  onSettingsChange: (settings: Partial<ThemeSettings>) => void;
}

const colors: { name: ThemeSettings['color']; bg: string }[] = [
  { name: 'sky', bg: 'bg-sky-500' },
  { name: 'rose', bg: 'bg-rose-500' },
  { name: 'emerald', bg: 'bg-emerald-500' },
  { name: 'indigo', bg: 'bg-indigo-500' },
];

const fontSizes: { name: ThemeSettings['fontSize']; label: string }[] = [
  { name: 'sm', label: 'Small' },
  { name: 'md', label: 'Medium' },
  { name: 'lg', label: 'Large' },
];

const cornerRadii: { name: ThemeSettings['cornerRadius']; label: string }[] = [
  { name: 'sm', label: 'Sharp' },
  { name: 'md', label: 'Rounded' },
  { name: 'lg', label: 'Pill' },
];

const voiceEngines: { name: ThemeSettings['voiceEngine']; label: string }[] = [
  { name: 'browser', label: 'Browser (Fast)' },
  { name: 'ai', label: 'AI (High Quality)' },
];

const voices: { name: PrebuiltVoice; label: string }[] = [
  { name: 'Zephyr', label: 'Zephyr' },
  { name: 'Kore', label: 'Kore' },
  { name: 'Puck', label: 'Puck' },
  { name: 'Charon', label: 'Charon' },
  { name: 'Fenrir', label: 'Fenrir' },
];

const StylePanel: React.FC<StylePanelProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)] flex-shrink-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Theme Settings</h2>
            <button onClick={onClose} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-8 overflow-y-auto">
             {/* Appearance */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Appearance</h3>
              <div className="grid grid-cols-2 gap-3 bg-[var(--bg-tertiary)] p-1 rounded-lg">
                <button
                  onClick={() => onSettingsChange({ mode: 'light' })}
                  className={`py-1.5 px-4 rounded-md text-sm font-semibold transition-colors ${
                    settings.mode === 'light'
                      ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => onSettingsChange({ mode: 'dark' })}
                  className={`py-1.5 px-4 rounded-md text-sm font-semibold transition-colors ${
                    settings.mode === 'dark'
                      ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>

            {/* Primary Color */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Primary Color</h3>
              <div className="grid grid-cols-4 gap-3">
                {colors.map(color => (
                  <button
                    key={color.name}
                    onClick={() => onSettingsChange({ color: color.name })}
                    className={`w-full aspect-square rounded-lg ${color.bg} flex items-center justify-center transition-all ring-offset-2 ring-offset-[var(--bg-secondary)] ${
                      settings.color === color.name ? 'ring-2 ring-[var(--color-primary-400)]' : 'hover:opacity-80'
                    }`}
                  >
                    {settings.color === color.name && <CheckIcon className="w-6 h-6 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <ThemeSlider
                label="Font Size"
                options={fontSizes}
                value={settings.fontSize}
                onChange={(val) => onSettingsChange({ fontSize: val as ThemeSettings['fontSize'] })}
            />

            {/* Corner Radius */}
            <ThemeSlider
                label="Corner Radius"
                options={cornerRadii}
                value={settings.cornerRadius}
                onChange={(val) => onSettingsChange({ cornerRadius: val as ThemeSettings['cornerRadius'] })}
            />
            
            {/* Voice Engine */}
            <ThemeSlider
                label="Voice Engine"
                options={voiceEngines}
                value={settings.voiceEngine}
                onChange={(val) => onSettingsChange({ voiceEngine: val as ThemeSettings['voiceEngine'] })}
            />

            {/* AI Voice */}
            {settings.voiceEngine === 'ai' && (
              <ThemeSlider
                  label="AI Voice"
                  options={voices}
                  value={settings.voice}
                  onChange={(val) => onSettingsChange({ voice: val as PrebuiltVoice })}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StylePanel;