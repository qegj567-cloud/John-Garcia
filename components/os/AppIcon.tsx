
import React from 'react';
import { AppConfig } from '../../types';
import { Icons } from '../../constants';
import { useOS } from '../../context/OSContext';

interface AppIconProps {
  app: AppConfig;
  onClick: () => void;
  size?: 'md' | 'lg';
}

const AppIcon: React.FC<AppIconProps> = ({ app, onClick, size = 'md' }) => {
  const { customIcons } = useOS();
  const IconComponent = Icons[app.icon] || Icons.Settings;
  const sizeClass = size === 'lg' ? 'w-16 h-16' : 'w-14 h-14';
  const customIconUrl = customIcons[app.id];
  
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-1 group active:scale-95 transition-transform duration-100"
    >
      <div className={`${sizeClass} ${app.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/20 group-hover:shadow-primary/40 group-hover:ring-2 ring-primary/50 transition-all overflow-hidden relative`}>
        {customIconUrl ? (
            <img src={customIconUrl} className="w-full h-full object-cover" alt={app.name} />
        ) : (
            <IconComponent className="w-1/2 h-1/2" />
        )}
      </div>
      {size === 'md' && (
        <span className="text-white text-[10px] font-medium drop-shadow-md text-center leading-tight">
          {app.name}
        </span>
      )}
    </button>
  );
};

export default AppIcon;
