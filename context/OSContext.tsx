
import React, { createContext, useContext, useEffect, useState } from 'react';
import { APIConfig, AppID, OSTheme, VirtualTime, CharacterProfile, ChatTheme, Toast, FullBackupData } from '../types';
import { DB } from '../utils/db';

interface OSContextType {
  activeApp: AppID;
  openApp: (appId: AppID) => void;
  closeApp: () => void;
  theme: OSTheme;
  updateTheme: (updates: Partial<OSTheme>) => void;
  virtualTime: VirtualTime;
  apiConfig: APIConfig;
  updateApiConfig: (updates: Partial<APIConfig>) => void;
  isLocked: boolean;
  unlock: () => void;
  isDataLoaded: boolean;
  
  characters: CharacterProfile[];
  activeCharacterId: string;
  addCharacter: () => void;
  updateCharacter: (id: string, updates: Partial<CharacterProfile>) => void;
  deleteCharacter: (id: string) => void;
  setActiveCharacterId: (id: string) => void;
  
  availableModels: string[];
  setAvailableModels: (models: string[]) => void;

  customThemes: ChatTheme[];
  addCustomTheme: (theme: ChatTheme) => void;
  removeCustomTheme: (id: string) => void;

  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;

  // Icons
  customIcons: Record<string, string>;
  setCustomIcon: (appId: string, iconUrl: string | undefined) => void;

  // System
  exportSystem: () => Promise<string>;
  importSystem: (json: string) => Promise<void>;
}

const defaultTheme: OSTheme = {
  hue: 245,
  saturation: 25,
  lightness: 65,
  wallpaper: 'https://images.unsplash.com/photo-1518182170546-0766bd6f6a56?q=80&w=2688&auto=format&fit=crop',
  darkMode: false,
};

const defaultApiConfig: APIConfig = {
  baseUrl: 'https://woof.guagua.uk/v1',
  apiKey: 'sk-KOutsrOElMjVkiieGG9wRB9BoqimBcJccCidWaXftkterYyk',
  model: 'gpt-4o-mini',
};

const initialCharacter: CharacterProfile = {
  id: 'default-01',
  name: 'Aether',
  avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Aether&backgroundColor=e6e6fa',
  description: '你的虚拟伴侣。',
  systemPrompt: '你是一个温柔、冷静且带有一点神秘感的AI助手。',
  memories: [],
};

const OSContext = createContext<OSContextType | undefined>(undefined);

export const OSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeApp, setActiveApp] = useState<AppID>(AppID.Launcher);
  const [theme, setTheme] = useState<OSTheme>(defaultTheme);
  const [apiConfig, setApiConfig] = useState<APIConfig>(defaultApiConfig);
  const [isLocked, setIsLocked] = useState(true);
  const [virtualTime, setVirtualTime] = useState<VirtualTime>({
    hours: 9,
    minutes: 41,
    day: 'Mon',
  });
  
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [activeCharacterId, setActiveCharacterId] = useState<string>('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [customThemes, setCustomThemes] = useState<ChatTheme[]>([]);
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Load Settings and Data on mount
  useEffect(() => {
    const loadSettings = async () => {
        // Load simple settings from LocalStorage
        const savedThemeStr = localStorage.getItem('os_theme');
        const savedApi = localStorage.getItem('os_api_config');
        const savedModels = localStorage.getItem('os_available_models');
        
        let loadedTheme = { ...defaultTheme };
        if (savedThemeStr) {
             const parsed = JSON.parse(savedThemeStr);
             loadedTheme = { ...loadedTheme, ...parsed };
             // Ensure wallpaper in LS is not a Base64 blob, if it is, it's stale data.
             if (loadedTheme.wallpaper.startsWith('data:')) {
                 loadedTheme.wallpaper = defaultTheme.wallpaper;
             }
        }
        
        if (savedApi) setApiConfig(JSON.parse(savedApi));
        if (savedModels) setAvailableModels(JSON.parse(savedModels));

        // Load Large Assets (Wallpaper & Icons) from IndexedDB
        try {
            const assets = await DB.getAllAssets();
            const assetMap: Record<string, string> = {};
            assets.forEach(a => assetMap[a.id] = a.data);

            if (assetMap['wallpaper']) {
                loadedTheme.wallpaper = assetMap['wallpaper'];
            }
            
            // Extract icons
            const loadedIcons: Record<string, string> = {};
            Object.keys(assetMap).forEach(key => {
                if (key.startsWith('icon_')) {
                    const appId = key.replace('icon_', '');
                    loadedIcons[appId] = assetMap[key];
                }
            });
            setCustomIcons(loadedIcons);
            
        } catch (e) {
            console.error("Failed to load assets from DB", e);
        }

        setTheme(loadedTheme);
    };

    const initData = async () => {
      try {
        await loadSettings();

        const [dbChars, dbThemes] = await Promise.all([
            DB.getAllCharacters(),
            DB.getThemes()
        ]);

        if (dbChars.length > 0) {
          setCharacters(dbChars);
          const lastActiveId = localStorage.getItem('os_last_active_char_id');
          if (lastActiveId && dbChars.find(c => c.id === lastActiveId)) {
            setActiveCharacterId(lastActiveId);
          } else {
            setActiveCharacterId(dbChars[0].id);
          }
        } else {
          await DB.saveCharacter(initialCharacter);
          setCharacters([initialCharacter]);
          setActiveCharacterId(initialCharacter.id);
        }

        setCustomThemes(dbThemes);

      } catch (err) {
        console.error('Data init failed:', err);
      } finally {
        setIsDataLoaded(true);
      }
    };

    initData();
  }, []);

  const updateTheme = async (updates: Partial<OSTheme>) => {
    // Separate wallpaper from other updates
    const { wallpaper, ...styleUpdates } = updates;
    
    // Update State
    const newTheme = { ...theme, ...updates };
    setTheme(newTheme);

    // Save Wallpaper to DB if changed
    if (wallpaper) {
         if (wallpaper.startsWith('data:')) {
             await DB.saveAsset('wallpaper', wallpaper);
         } else {
             // If it's a URL (preset), we could save to DB or just leave it. 
             // To keep logic consistent, if it's external, we also save it or treat it as override.
             // But for presets in LS, we save string.
             // Actually, prompt says NO IMAGES IN LOCALSTORAGE.
             // So we only save metadata to LS.
         }
    }

    // Save Metadata (colors) to LS
    // Construct LS object without big data
    const lsTheme = { ...newTheme };
    if (lsTheme.wallpaper.startsWith('data:')) {
        lsTheme.wallpaper = ''; // Don't save base64 to LS
    }
    localStorage.setItem('os_theme', JSON.stringify(lsTheme));
  };

  const updateApiConfig = (updates: Partial<APIConfig>) => {
    const newConfig = { ...apiConfig, ...updates };
    setApiConfig(newConfig);
    localStorage.setItem('os_api_config', JSON.stringify(newConfig));
  };

  const saveModels = (models: string[]) => {
      setAvailableModels(models);
      localStorage.setItem('os_available_models', JSON.stringify(models));
  };
  
  const addCharacter = async () => {
    const newChar: CharacterProfile = {
        id: `char-${Date.now()}`,
        name: 'New Character',
        avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${Date.now()}&backgroundColor=e2e8f0`,
        description: '点击编辑设定...',
        systemPrompt: '',
        memories: []
    };
    setCharacters(prev => [...prev, newChar]);
    setActiveCharacterId(newChar.id);
    await DB.saveCharacter(newChar);
  };

  const updateCharacter = async (id: string, updates: Partial<CharacterProfile>) => {
    setCharacters(prev => {
        const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
        const target = updated.find(c => c.id === id);
        if (target) DB.saveCharacter(target); 
        return updated;
    });
  };

  const deleteCharacter = async (id: string) => {
    setCharacters(prev => {
        const remaining = prev.filter(c => c.id !== id);
        if (remaining.length > 0 && activeCharacterId === id) {
            setActiveCharacterId(remaining[0].id);
        }
        return remaining;
    });
    await DB.deleteCharacter(id);
  };

  const addCustomTheme = async (theme: ChatTheme) => {
      setCustomThemes(prev => {
          const exists = prev.find(t => t.id === theme.id);
          if (exists) return prev.map(t => t.id === theme.id ? theme : t);
          return [...prev, theme];
      });
      await DB.saveTheme(theme);
  };

  const removeCustomTheme = async (id: string) => {
      setCustomThemes(prev => prev.filter(t => t.id !== id));
      await DB.deleteTheme(id);
  };

  const setCustomIcon = async (appId: string, iconUrl: string | undefined) => {
      setCustomIcons(prev => {
          const next = { ...prev };
          if (iconUrl) next[appId] = iconUrl;
          else delete next[appId];
          return next;
      });

      // Save to DB, do not touch LocalStorage
      if (iconUrl) {
          await DB.saveAsset(`icon_${appId}`, iconUrl);
      } else {
          await DB.deleteAsset(`icon_${appId}`);
      }
  };

  const handleSetActiveCharacter = (id: string) => {
      setActiveCharacterId(id);
      localStorage.setItem('os_last_active_char_id', id);
  };

  const addToast = (message: string, type: Toast['type'] = 'info') => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
  };

  const exportSystem = async (): Promise<string> => {
      const dbData = await DB.exportFullData();
      const backup: FullBackupData = {
          timestamp: Date.now(),
          version: 1,
          theme,
          apiConfig,
          availableModels,
          customIcons,
          characters: dbData.characters || [],
          messages: dbData.messages || [],
          customThemes: dbData.customThemes || [],
          savedEmojis: dbData.savedEmojis || [],
          assets: dbData.assets || []
      };
      return JSON.stringify(backup);
  };

  const importSystem = async (json: string): Promise<void> => {
      try {
          const data: FullBackupData = JSON.parse(json);
          // Restore DB
          await DB.importFullData(data);
          
          // Restore Settings
          // Do not write data URLs to LS
          if (data.theme) {
              const cleanTheme = { ...data.theme };
              if (cleanTheme.wallpaper && cleanTheme.wallpaper.startsWith('data:')) {
                  cleanTheme.wallpaper = '';
              }
              updateTheme(cleanTheme);
          }
          if (data.apiConfig) updateApiConfig(data.apiConfig);
          if (data.availableModels) saveModels(data.availableModels);
          
          // Custom Icons are now fully in DB/assets, but we update state for immediate feedback
          // The page reload below will handle the heavy lifting of state sync
          
          // Refresh Memory State
          const chars = await DB.getAllCharacters();
          const themes = await DB.getThemes();
          setCharacters(chars);
          setCustomThemes(themes);
          if (chars.length > 0) setActiveCharacterId(chars[0].id);

          addToast('系统恢复成功，即将重启...', 'success');
          setTimeout(() => window.location.reload(), 1500);
      } catch (e: any) {
          console.error(e);
          throw new Error('导入文件格式错误或已损坏');
      }
  };

  const openApp = (appId: AppID) => setActiveApp(appId);
  const closeApp = () => setActiveApp(AppID.Launcher);
  const unlock = () => setIsLocked(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-hue', theme.hue.toString());
    root.style.setProperty('--primary-sat', `${theme.saturation}%`);
    root.style.setProperty('--primary-lightness', `${theme.lightness}%`);
  }, [theme]);

  useEffect(() => {
    const timer = setInterval(() => {
      setVirtualTime((prev) => {
        let newMin = prev.minutes + 1;
        let newHour = prev.hours;
        if (newMin >= 60) {
          newMin = 0;
          newHour = (newHour + 1) % 24;
        }
        return { ...prev, minutes: newMin, hours: newHour };
      });
    }, 5000); 
    return () => clearInterval(timer);
  }, []);

  return (
    <OSContext.Provider
      value={{
        activeApp, openApp, closeApp, theme, updateTheme, virtualTime, apiConfig, updateApiConfig, isLocked, unlock, isDataLoaded,
        characters, activeCharacterId, addCharacter, updateCharacter, deleteCharacter, setActiveCharacterId: handleSetActiveCharacter,
        availableModels, setAvailableModels: saveModels,
        customThemes, addCustomTheme, removeCustomTheme,
        toasts, addToast,
        customIcons, setCustomIcon,
        exportSystem, importSystem
      }}
    >
      {children}
    </OSContext.Provider>
  );
};

export const useOS = () => {
  const context = useContext(OSContext);
  if (!context) throw new Error('useOS must be used within an OSProvider');
  return context;
};
