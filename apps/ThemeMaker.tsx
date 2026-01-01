
import React, { useState, useRef } from 'react';
import { useOS } from '../context/OSContext';
import { ChatTheme, BubbleStyle } from '../types';
import { processImage } from '../utils/file';

const DEFAULT_THEME: ChatTheme = {
    id: '',
    name: 'New Theme',
    type: 'custom',
    user: {
        textColor: '#ffffff',
        backgroundColor: '#6366f1',
        borderRadius: 20,
        opacity: 1,
    },
    ai: {
        textColor: '#334155',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        opacity: 1,
    }
};

const ThemeMaker: React.FC = () => {
    const { closeApp, addCustomTheme, addToast } = useOS();
    const [editingTheme, setEditingTheme] = useState<ChatTheme>({ ...DEFAULT_THEME, id: `theme-${Date.now()}` });
    const [activeTab, setActiveTab] = useState<'user' | 'ai'>('user');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const decorationInputRef = useRef<HTMLInputElement>(null);

    const updateStyle = (key: keyof BubbleStyle, value: any) => {
        setEditingTheme(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                [key]: value
            }
        }));
    };

    const handleImageUpload = async (file: File, type: 'bg' | 'deco') => {
        try {
            const result = await processImage(file);
            if (type === 'bg') updateStyle('backgroundImage', result);
            else updateStyle('decoration', result);
            addToast('图片上传成功', 'success');
        } catch (e: any) {
            addToast(e.message, 'error');
        }
    };

    const saveTheme = () => {
        if (!editingTheme.name.trim()) return;
        addCustomTheme(editingTheme);
        closeApp();
    };

    // Helper to generate CSS for preview
    const getStyle = (style: BubbleStyle) => ({
        color: style.textColor,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage ? `url(${style.backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: `${style.borderRadius}px`,
        opacity: style.opacity,
        borderBottomLeftRadius: activeTab === 'user' ? `${style.borderRadius}px` : '4px',
        borderBottomRightRadius: activeTab === 'user' ? '4px' : `${style.borderRadius}px`,
    });

    return (
        <div className="h-full w-full bg-slate-50 flex flex-col font-light relative">
            {/* Header */}
            <div className="h-20 bg-white/70 backdrop-blur-md flex items-end pb-3 px-4 border-b border-white/40 shrink-0 z-20 justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={closeApp} className="p-2 -ml-2 rounded-full hover:bg-black/5 active:scale-90 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-medium text-slate-700">气泡工坊</h1>
                </div>
                <button onClick={saveTheme} className="px-4 py-1.5 bg-primary text-white rounded-full text-xs font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all">
                    保存
                </button>
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-slate-100 relative overflow-hidden flex flex-col p-4 justify-center items-stretch gap-4">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                {/* AI Bubble Preview */}
                <div className="flex justify-start relative z-10">
                    <div className="w-8 h-8 rounded-full bg-slate-300 mr-2 shrink-0"></div>
                    <div className="relative max-w-[80%] p-3 shadow-sm text-sm" style={getStyle(editingTheme.ai)}>
                        {editingTheme.ai.decoration && (
                             <img src={editingTheme.ai.decoration} className="absolute -top-3 -left-3 w-8 h-8 object-contain drop-shadow-sm" alt="" />
                        )}
                        你好！这是一个预览气泡。
                    </div>
                </div>

                {/* User Bubble Preview */}
                <div className="flex justify-end relative z-10">
                     <div className="relative max-w-[80%] p-3 shadow-sm text-sm" style={getStyle(editingTheme.user)}>
                        {editingTheme.user.decoration && (
                             <img src={editingTheme.user.decoration} className="absolute -top-3 -right-3 w-8 h-8 object-contain drop-shadow-sm" alt="" />
                        )}
                        感觉不错！这里的样式可以随意调整。
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/20 ml-2 shrink-0"></div>
                </div>
            </div>

            {/* Editor Controls */}
            <div className="bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-30 flex flex-col h-[55%]">
                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    <button 
                        onClick={() => setActiveTab('user')} 
                        className={`flex-1 py-4 text-xs font-bold tracking-wider uppercase transition-colors ${activeTab === 'user' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
                    >
                        User Bubble
                    </button>
                    <button 
                        onClick={() => setActiveTab('ai')} 
                        className={`flex-1 py-4 text-xs font-bold tracking-wider uppercase transition-colors ${activeTab === 'ai' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
                    >
                        AI Bubble
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    
                    {/* Name Input */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Theme Name</label>
                        <input 
                            value={editingTheme.name}
                            onChange={(e) => setEditingTheme(prev => ({...prev, name: e.target.value}))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-primary/50 transition-all outline-none"
                            placeholder="My Awesome Theme"
                        />
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Text Color</label>
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <input 
                                    type="color" 
                                    value={editingTheme[activeTab].textColor}
                                    onChange={(e) => updateStyle('textColor', e.target.value)}
                                    className="w-8 h-8 rounded-lg border-none cursor-pointer bg-transparent"
                                />
                                <span className="text-xs font-mono text-slate-500">{editingTheme[activeTab].textColor}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Background</label>
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <input 
                                    type="color" 
                                    value={editingTheme[activeTab].backgroundColor}
                                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                                    className="w-8 h-8 rounded-lg border-none cursor-pointer bg-transparent"
                                />
                                <span className="text-xs font-mono text-slate-500">{editingTheme[activeTab].backgroundColor}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sliders */}
                    <div>
                         <div className="flex justify-between mb-2">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roundness</label>
                             <span className="text-[10px] text-slate-500 font-mono">{editingTheme[activeTab].borderRadius}px</span>
                         </div>
                         <input 
                            type="range" min="0" max="30" 
                            value={editingTheme[activeTab].borderRadius}
                            onChange={(e) => updateStyle('borderRadius', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    <div>
                         <div className="flex justify-between mb-2">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opacity</label>
                             <span className="text-[10px] text-slate-500 font-mono">{Math.round(editingTheme[activeTab].opacity * 100)}%</span>
                         </div>
                         <input 
                            type="range" min="0.1" max="1" step="0.1"
                            value={editingTheme[activeTab].opacity}
                            onChange={(e) => updateStyle('opacity', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    {/* Assets */}
                    <div className="grid grid-cols-2 gap-4">
                        <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer group">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">BG Texture</label>
                             <div className="h-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 group-hover:border-primary/50 group-hover:text-primary transition-all overflow-hidden relative">
                                {editingTheme[activeTab].backgroundImage ? (
                                    <>
                                        <img src={editingTheme[activeTab].backgroundImage} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                        <span className="relative z-10 text-[10px] bg-white/80 px-2 py-1 rounded">Change</span>
                                    </>
                                ) : <span className="text-xs">+ Image</span>}
                             </div>
                             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'bg')} />
                             {editingTheme[activeTab].backgroundImage && <button onClick={(e) => { e.stopPropagation(); updateStyle('backgroundImage', undefined); }} className="text-[10px] text-red-400 mt-1 hover:underline">Remove</button>}
                        </div>

                        <div onClick={() => decorationInputRef.current?.click()} className="cursor-pointer group">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Sticker</label>
                             <div className="h-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 group-hover:border-primary/50 group-hover:text-primary transition-all relative">
                                 {editingTheme[activeTab].decoration ? (
                                    <>
                                        <img src={editingTheme[activeTab].decoration} className="w-8 h-8 object-contain mb-1" />
                                        <span className="text-[10px]">Change</span>
                                    </>
                                ) : <span className="text-xs">+ Icon</span>}
                             </div>
                             <input type="file" ref={decorationInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'deco')} />
                             {editingTheme[activeTab].decoration && <button onClick={(e) => { e.stopPropagation(); updateStyle('decoration', undefined); }} className="text-[10px] text-red-400 mt-1 hover:underline">Remove</button>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThemeMaker;
