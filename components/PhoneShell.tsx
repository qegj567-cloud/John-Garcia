
import React from 'react';
import { useOS } from '../context/OSContext';
import StatusBar from './os/StatusBar';
import Launcher from '../apps/Launcher';
import Settings from '../apps/Settings';
import Character from '../apps/Character';
import Chat from '../apps/Chat'; 
import ThemeMaker from '../apps/ThemeMaker';
import Appearance from '../apps/Appearance';
import { AppID } from '../types';

const PhoneShell: React.FC = () => {
  const { theme, isLocked, unlock, activeApp, virtualTime, isDataLoaded, toasts } = useOS();

  if (!isDataLoaded) {
    return <div className="w-full h-full bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div></div>;
  }

  if (isLocked) {
    return (
      <div 
        onClick={unlock}
        className="relative w-full h-full bg-cover bg-center cursor-pointer overflow-hidden group font-light"
        style={{ backgroundImage: `url(${theme.wallpaper})` }}
      >
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-all group-hover:backdrop-blur-none group-hover:bg-black/10 duration-700" />
        <div className="absolute top-24 w-full text-center text-white drop-shadow-md">
           <div className="text-8xl tracking-tighter opacity-90 font-thin">
             {virtualTime.hours.toString().padStart(2,'0')}<span className="animate-pulse">:</span>{virtualTime.minutes.toString().padStart(2,'0')}
           </div>
           <div className="text-lg tracking-widest opacity-80 mt-2 uppercase text-xs">AetherOS Simulation</div>
        </div>
        <div className="absolute bottom-12 w-full flex flex-col items-center gap-3 animate-pulse text-white/70">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-transparent to-white/50"></div>
          <span className="text-[10px] tracking-widest uppercase">Tap to Unlock</span>
        </div>
      </div>
    );
  }

  const renderApp = () => {
    switch (activeApp) {
      case AppID.Settings: return <Settings />;
      case AppID.Character: return <Character />;
      case AppID.Chat: return <Chat />;
      case AppID.ThemeMaker: return <ThemeMaker />;
      case AppID.Appearance: return <Appearance />;
      case AppID.Launcher:
      default: return <Launcher />;
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#eef1f5] text-slate-900 font-sans select-none">
       <div 
         className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
         style={{ 
             backgroundImage: `url(${theme.wallpaper})`,
             transform: activeApp !== AppID.Launcher ? 'scale(1.15) blur(10px)' : 'scale(1) blur(0px)',
             opacity: activeApp !== AppID.Launcher ? 0.4 : 1
         }}
       />
       <div className={`absolute inset-0 transition-all duration-500 ${activeApp === AppID.Launcher ? 'bg-transparent' : 'bg-white/40 backdrop-blur-2xl'}`} />
       <div className="relative z-10 w-full h-full flex flex-col">
          <StatusBar />
          <div className="flex-1 relative overflow-hidden">{renderApp()}</div>
          <div className="h-6 w-full flex justify-center items-end pb-2 shrink-0 z-50 pointer-events-none">
             <div className="w-32 h-1 bg-slate-900/10 rounded-full backdrop-blur-md"></div>
          </div>
       </div>

       {/* System Toasts */}
       <div className="absolute top-12 left-0 w-full flex flex-col items-center gap-2 pointer-events-none z-[60]">
          {toasts.map(toast => (
             <div key={toast.id} className="animate-fade-in bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-black/5 flex items-center gap-2 max-w-[80%]">
                 {toast.type === 'success' && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                 {toast.type === 'error' && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                 {toast.type === 'info' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                 <span className="text-xs font-medium text-slate-700 truncate">{toast.message}</span>
             </div>
          ))}
       </div>
    </div>
  );
};

export default PhoneShell;
