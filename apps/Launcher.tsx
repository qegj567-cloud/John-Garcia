
import React, { useMemo } from 'react';
import { useOS } from '../context/OSContext';
import { INSTALLED_APPS, DOCK_APPS } from '../constants';
import AppIcon from '../components/os/AppIcon';

const Launcher: React.FC = () => {
  const { openApp } = useOS();

  const gridApps = useMemo(() => 
    INSTALLED_APPS.filter(app => !DOCK_APPS.includes(app.id)), 
    []
  );

  const dockAppsConfig = useMemo(() => 
    DOCK_APPS.map(id => INSTALLED_APPS.find(app => app.id === id)).filter(Boolean) as typeof INSTALLED_APPS,
    []
  );

  return (
    <div className="h-full w-full flex flex-col pt-16 pb-6 relative z-10">
      {/* Grid Area - explicitly handling overflow and touch events */}
      <div className="flex-1 px-5 grid grid-cols-4 grid-rows-6 gap-x-4 gap-y-6 content-start pointer-events-auto">
        {gridApps.map(app => (
          <div key={app.id} className="flex justify-center z-20">
            <AppIcon app={app} onClick={() => openApp(app.id)} />
          </div>
        ))}
      </div>

      {/* Dock Area */}
      <div className="px-4 pb-2 shrink-0 z-20">
        <div className="w-full bg-white/20 backdrop-blur-2xl rounded-[2.5rem] p-4 flex justify-around items-center border border-white/20 shadow-xl ring-1 ring-white/10">
          {dockAppsConfig.map(app => (
            <AppIcon key={app.id} app={app} onClick={() => openApp(app.id)} size="lg" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Launcher;
