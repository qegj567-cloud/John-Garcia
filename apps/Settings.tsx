
import React, { useState, useRef } from 'react';
import { useOS } from '../context/OSContext';

const Settings: React.FC = () => {
  const { apiConfig, updateApiConfig, closeApp, availableModels, setAvailableModels, exportSystem, importSystem, addToast } = useOS();
  
  const [localKey, setLocalKey] = useState(apiConfig.apiKey);
  const [localUrl, setLocalUrl] = useState(apiConfig.baseUrl);
  const [localModel, setLocalModel] = useState(apiConfig.model);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const API_PRESETS = [
    { name: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o' },
    { name: 'DeepSeek', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    { name: 'Ollama (Local)', url: 'http://localhost:11434/v1', model: 'llama3' },
  ];

  const applyApiPreset = (preset: typeof API_PRESETS[0]) => {
      setLocalUrl(preset.url);
      if (preset.name.includes('Local')) setLocalKey('sk-local-token'); 
      setLocalModel(preset.model);
      setStatusMsg(`已应用 ${preset.name} 预设`);
      setTimeout(() => setStatusMsg(''), 1500);
  };

  const handleSaveApi = () => {
    updateApiConfig({ 
      apiKey: localKey, 
      baseUrl: localUrl, 
      model: localModel
    });
    setStatusMsg('配置已保存');
    setTimeout(() => setStatusMsg(''), 2000);
  };

  const fetchModels = async () => {
    if (!localUrl) { setStatusMsg('请先填写 URL'); return; }
    setIsLoadingModels(true);
    setStatusMsg('正在获取模型...');
    try {
        const baseUrl = localUrl.replace(/\/+$/, '');
        const response = await fetch(`${baseUrl}/models`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localKey}`, 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
            const models = data.data.map((m: any) => m.id);
            setAvailableModels(models);
            if (models.length > 0 && !models.includes(localModel)) setLocalModel(models[0]);
            setStatusMsg(`成功获取 ${models.length} 个模型`);
        } else { setStatusMsg('格式无法识别'); }
    } catch (error: any) {
        console.error(error);
        setStatusMsg(`连接失败: ${error.message}`);
    } finally {
        setIsLoadingModels(false);
        setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const handleExport = async () => {
      try {
          addToast('正在打包全系统数据...', 'info');
          const json = await exportSystem();
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `AetherOS_Backup_${new Date().toISOString().slice(0,10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addToast('导出成功', 'success');
      } catch (e: any) {
          addToast(`导出失败: ${e.message}`, 'error');
      }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
          try {
              const json = ev.target?.result as string;
              await importSystem(json);
          } catch (err: any) {
              addToast(err.message, 'error');
          }
      };
      reader.readAsText(file);
      if (importInputRef.current) importInputRef.current.value = '';
  };

  return (
    <div className="h-full w-full bg-slate-50/50 flex flex-col font-light">
      <div className="h-20 bg-white/70 backdrop-blur-md flex items-end pb-3 px-4 border-b border-white/40 shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-2 w-full">
            <button onClick={closeApp} className="p-2 -ml-2 rounded-full hover:bg-black/5 active:scale-90 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
            </button>
            <h1 className="text-xl font-medium text-slate-700 tracking-wide">系统设置</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
        
        {/* 数据备份区域 */}
        <section className="bg-white/60 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>
                </div>
                <h2 className="text-sm font-semibold text-slate-600 tracking-wider">数据管理</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <button onClick={handleExport} className="py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm active:scale-95 transition-all flex flex-col items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                    导出全量数据
                </button>
                <div onClick={() => importInputRef.current?.click()} className="py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm active:scale-95 transition-all flex flex-col items-center gap-1 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-500"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    导入恢复数据
                </div>
                <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleImport} />
            </div>
            <p className="mt-3 text-[10px] text-slate-400 leading-relaxed px-1">
                包括角色档案、聊天记录、自定义主题、壁纸及所有设置。导入将覆盖当前所有数据，建议先备份。
            </p>
        </section>

        {/* AI 连接设置区域 */}
        <section className="bg-white/60 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-white/50">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100/50 rounded-xl text-emerald-600">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                        </svg>
                    </div>
                    <h2 className="text-sm font-semibold text-slate-600 tracking-wider">神经网络</h2>
                </div>
            </div>

            {/* 快捷预设 */}
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                {API_PRESETS.map(preset => (
                    <button 
                        key={preset.name}
                        onClick={() => applyApiPreset(preset)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg text-[10px] font-medium text-slate-500 transition-all shrink-0"
                    >
                        {preset.name}
                    </button>
                ))}
            </div>
            
            <div className="space-y-4">
                <div className="group">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">API Base URL</label>
                    <input 
                        type="text" 
                        value={localUrl}
                        onChange={(e) => setLocalUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full bg-white/50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary/50 text-slate-700 transition-all placeholder:text-slate-300 font-mono"
                    />
                </div>

                <div className="group">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">API Key (Optional)</label>
                    <input 
                        type="password" 
                        value={localKey}
                        onChange={(e) => setLocalKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-white/50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary/50 text-slate-700 transition-all placeholder:text-slate-300 font-mono"
                    />
                </div>

                <div className="pt-2">
                     <div className="flex justify-between items-center mb-1.5 pl-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Model</label>
                        <button 
                            onClick={fetchModels}
                            disabled={isLoadingModels}
                            className="text-[10px] text-primary hover:text-primary-focus underline decoration-1 underline-offset-2 disabled:opacity-50"
                        >
                            {isLoadingModels ? '获取中...' : '刷新列表'}
                        </button>
                    </div>
                    
                    {availableModels.length > 0 ? (
                        <div className="relative">
                            <select
                                value={localModel}
                                onChange={(e) => setLocalModel(e.target.value)}
                                className="w-full appearance-none bg-white/50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary/50 text-slate-700 transition-all pr-8"
                            >
                                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    ) : (
                        <input 
                            type="text" 
                            value={localModel}
                            onChange={(e) => setLocalModel(e.target.value)}
                            placeholder="gpt-4o"
                            className="w-full bg-white/50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-primary/50 text-slate-700 transition-all"
                        />
                    )}
                </div>
                
                <div className="pt-2">
                    <button 
                        onClick={handleSaveApi}
                        className="w-full py-3 rounded-2xl font-medium text-white shadow-lg shadow-primary/20 bg-primary active:scale-98 hover:bg-primary-focus transition-all flex justify-center items-center"
                    >
                        {statusMsg || '保存配置'}
                    </button>
                </div>
            </div>
        </section>

        <div className="text-center text-[10px] text-slate-300 pb-8 font-mono tracking-widest uppercase">
            AetherOS System<br/>
            Kernel v0.1.3
        </div>
      </div>
    </div>
  );
};

export default Settings;
