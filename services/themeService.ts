import { ThemeSettings } from '../types';

const THEME_SETTINGS_KEY = 'synergy-ai-theme-settings';

const defaultSettings: ThemeSettings = {
  mode: 'dark',
  color: 'sky',
  fontSize: 'md',
  cornerRadius: 'md',
  voiceEngine: 'ai',
  voice: 'Zephyr',
};

export const saveThemeSettings = (settings: ThemeSettings): void => {
  try {
    localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save theme settings:', error);
  }
};

export const loadThemeSettings = (): ThemeSettings => {
  try {
    const savedSettings = localStorage.getItem(THEME_SETTINGS_KEY);
    const parsedSettings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
    // Ensure all keys are present, falling back to default for missing ones
    return { ...defaultSettings, ...parsedSettings };
  } catch (error) {
    console.error('Failed to load theme settings:', error);
    return defaultSettings;
  }
};

export const applyTheme = (settings: ThemeSettings): void => {
  const root = document.documentElement;
  
  // Remove old theme classes
  root.classList.remove('theme-sky', 'theme-rose', 'theme-emerald', 'theme-indigo');
  root.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
  root.classList.remove('radius-sm', 'radius-md', 'radius-lg');

  // Add new theme classes
  root.classList.add(`theme-${settings.color}`);
  root.classList.add(`font-size-${settings.fontSize}`);
  root.classList.add(`radius-${settings.cornerRadius}`);

  // Handle dark/light mode
  if (settings.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};