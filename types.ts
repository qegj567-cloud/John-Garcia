
export enum AppID {
  Launcher = 'launcher',
  Settings = 'settings',
  Character = 'character',
  Chat = 'chat',
  Gallery = 'gallery',
  Music = 'music',
  Browser = 'browser',
  ThemeMaker = 'thememaker',
  Appearance = 'appearance', // New App
}

export type MessageType = 'text' | 'transfer' | 'interaction' | 'voice' | 'emoji';

export interface Message {
    id: number;
    charId: string;
    role: 'user' | 'assistant' | 'system';
    type: MessageType;
    content: string;
    metadata?: any; 
    timestamp: number;
}

export interface AppConfig {
  id: AppID;
  name: string;
  icon: string;
  color: string;
}

export interface OSTheme {
  hue: number;
  saturation: number;
  lightness: number; 
  wallpaper: string;
  darkMode: boolean;
}

export interface APIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface VirtualTime {
  hours: number;
  minutes: number;
  day: string;
}

export interface MemoryFragment {
  id: string;
  date: string;
  summary: string;
  mood?: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  avatar: string;
  description: string;
  systemPrompt: string;
  memories: MemoryFragment[];
  refinedMemories?: Record<string, string>; 
  bubbleStyle?: string; 
}

export interface BubbleStyle {
    textColor: string;
    backgroundColor: string;
    backgroundImage?: string;
    borderRadius: number; 
    opacity: number; 
    decoration?: string; 
}

export interface ChatTheme {
    id: string;
    name: string;
    type: 'preset' | 'custom';
    user: BubbleStyle;
    ai: BubbleStyle;
}

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface FullBackupData {
    timestamp: number;
    version: number;
    theme: OSTheme;
    apiConfig: APIConfig;
    availableModels: string[];
    // customIcons is now derived from assets, keeping type for compatibility if needed, 
    // but actual storage moves to 'assets'
    customIcons: Record<string, string>; 
    characters: CharacterProfile[];
    messages: Message[];
    customThemes: ChatTheme[];
    savedEmojis: {name: string, url: string}[];
    assets: { id: string, data: string }[]; // New DB Store for wallpapers/icons
}
