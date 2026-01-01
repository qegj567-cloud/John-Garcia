
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useOS } from '../context/OSContext';
import { AppID, CharacterProfile, MemoryFragment } from '../types';
import Modal from '../components/os/Modal';
import { processImage } from '../utils/file';

const CharacterCard: React.FC<{ 
    char: CharacterProfile; 
    onClick: () => void;
    onDelete: (e: React.MouseEvent) => void;
}> = ({ char, onClick, onDelete }) => (
    <div 
        onClick={onClick}
        className="relative p-4 rounded-3xl border bg-white/40 border-white/40 hover:bg-white/60 hover:scale-[1.01] transition-all duration-300 cursor-pointer group shadow-sm"
    >
        <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-white/50 overflow-hidden relative shadow-inner">
                <div className="absolute inset-0 bg-slate-100/50"></div> 
                <img src={char.avatar} className="w-full h-full object-cover relative z-10" alt={char.name} />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate text-slate-700">
                    {char.name}
                </h3>
                <p className="text-xs text-slate-400 truncate mt-0.5 font-light">
                    {char.description || '暂无描述'}
                </p>
            </div>
        </div>
        <button 
            onClick={onDelete}
            className="absolute top-2 right-2 p-1.5 rounded-full text-slate-300 hover:bg-red-50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
        </button>
    </div>
);

interface MemoryArchivistProps {
    memories: MemoryFragment[];
    refinedMemories: Record<string, string>;
    onRefine: (year: string, month: string, summary: string) => Promise<void>;
}

const MemoryArchivist: React.FC<MemoryArchivistProps> = ({ memories, refinedMemories, onRefine }) => {
    const [viewState, setViewState] = useState<{
        level: 'root' | 'year' | 'month';
        selectedYear: string | null;
        selectedMonth: string | null;
    }>({ level: 'root', selectedYear: null, selectedMonth: null });
    const [isRefining, setIsRefining] = useState(false);

    const { tree, stats } = useMemo(() => {
        const tree: Record<string, Record<string, MemoryFragment[]>> = {};
        let totalChars = 0;
        memories.forEach(m => {
            totalChars += m.summary.length;
            let year = '未知年份', month = '未知';
            const dateMatch = m.date.match(/(\d{4})[-/年](\d{1,2})/);
            if (dateMatch) {
                year = dateMatch[1];
                month = dateMatch[2].padStart(2, '0');
            } else if (m.date.includes('unknown')) year = '未归档';
            if (!tree[year]) tree[year] = {};
            if (!tree[year][month]) tree[year][month] = [];
            tree[year][month].push(m);
        });
        const sortedTree: typeof tree = {};
        Object.keys(tree).sort((a, b) => b.localeCompare(a)).forEach(y => {
            sortedTree[y] = {};
            Object.keys(tree[y]).sort((a, b) => b.localeCompare(a)).forEach(m => {
                sortedTree[y][m] = tree[y][m].sort((ma, mb) => mb.date.localeCompare(ma.date));
            });
        });
        return { tree: sortedTree, stats: { totalChars, count: memories.length } };
    }, [memories]);

    const handleYearClick = (year: string) => setViewState({ level: 'year', selectedYear: year, selectedMonth: null });
    const handleMonthClick = (month: string) => setViewState(prev => ({ ...prev, level: 'month', selectedMonth: month }));
    const handleBack = () => {
        if (viewState.level === 'month') setViewState(prev => ({ ...prev, level: 'year', selectedMonth: null }));
        else if (viewState.level === 'year') setViewState({ level: 'root', selectedYear: null, selectedMonth: null });
    };

    const triggerRefine = async () => {
        if (!viewState.selectedYear || !viewState.selectedMonth) return;
        setIsRefining(true);
        // Concatenate all summaries for this month
        const monthMems = tree[viewState.selectedYear][viewState.selectedMonth];
        const combinedText = monthMems.map(m => `${m.date}: ${m.summary} (${m.mood || '无'})`).join('\n');
        
        try {
            await onRefine(viewState.selectedYear, viewState.selectedMonth, combinedText);
        } finally {
            setIsRefining(false);
        }
    };

    if (memories.length === 0) return (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mb-2 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008h-.008V6.75Z" /></svg>
            <p className="text-xs">暂无记忆档案</p>
        </div>
    );

    const renderYears = () => (
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
            {Object.keys(tree).map(year => (
                <div key={year} onClick={() => handleYearClick(year)} className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-sm active:scale-95 transition-all flex flex-col justify-between h-28 group cursor-pointer hover:bg-white/80">
                    <div className="flex justify-between items-start">
                         <div className="p-2 bg-amber-100/50 rounded-lg text-amber-600 group-hover:bg-amber-100 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg></div>
                         <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full text-slate-500 font-mono">{Object.values(tree[year]).reduce((acc, curr) => acc + curr.length, 0)}项</span>
                    </div>
                    <div><h3 className="text-xl font-light text-slate-800 tracking-tight">{year}</h3><p className="text-[10px] text-slate-400">年度档案归档</p></div>
                </div>
            ))}
        </div>
    );

    const renderMonths = () => viewState.selectedYear && (
        <div className="grid grid-cols-3 gap-3 animate-fade-in">
            {Object.keys(tree[viewState.selectedYear]).map(month => (
                <div key={month} onClick={() => handleMonthClick(month)} className="bg-white/50 backdrop-blur-sm p-3 rounded-2xl border border-white/40 shadow-sm active:scale-95 transition-all flex flex-col justify-center items-center gap-2 aspect-square cursor-pointer hover:bg-white/70 relative overflow-hidden">
                    {/* Visual indicator if this month is already refined */}
                    {refinedMemories?.[`${viewState.selectedYear}-${month}`] && <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-bl-lg shadow-sm"></div>}
                    <span className="text-2xl font-light text-slate-700">{parseInt(month)}<span className="text-xs ml-0.5 text-slate-400">月</span></span>
                    <div className="h-0.5 w-4 bg-primary/30 rounded-full"></div>
                    <span className="text-[10px] text-slate-400">{tree[viewState.selectedYear!][month].length} 条记忆</span>
                </div>
            ))}
        </div>
    );

    const renderMemories = () => {
        if (!viewState.selectedYear || !viewState.selectedMonth) return null;
        const key = `${viewState.selectedYear}-${viewState.selectedMonth}`;
        const refinedContent = refinedMemories?.[key];

        return (
            <div className="space-y-6 animate-fade-in pb-8">
                {/* Refined Memory Section */}
                <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 relative group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-indigo-700">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .914-.143Z" clipRule="evenodd" /></svg>
                             <h4 className="text-xs font-bold tracking-wide uppercase">核心记忆 (AI Context)</h4>
                        </div>
                        <button 
                            onClick={triggerRefine}
                            disabled={isRefining}
                            className="text-[10px] bg-white text-indigo-600 px-3 py-1 rounded-full border border-indigo-200 shadow-sm hover:bg-indigo-500 hover:text-white transition-colors flex items-center gap-1"
                        >
                            {isRefining ? '计算中...' : (refinedContent ? '重新精炼' : '生成精炼')}
                        </button>
                    </div>
                    {refinedContent ? (
                        <p className="text-xs text-indigo-900/80 leading-relaxed whitespace-pre-wrap">{refinedContent}</p>
                    ) : (
                        <p className="text-xs text-indigo-300 italic">点击右上角生成本月记忆摘要。生成后，即使原对话被清理，AI 依然会记得这些关键信息。</p>
                    )}
                </div>

                {/* Raw Memories */}
                <div className="space-y-4">
                    {tree[viewState.selectedYear][viewState.selectedMonth].map((mem) => (
                        <div key={mem.id} className="relative pl-4 group">
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-200 group-hover:bg-primary/30 transition-colors"></div>
                            <div className="absolute left-[-2px] top-3 w-1.5 h-1.5 rounded-full bg-slate-300 border border-white group-hover:bg-primary transition-colors"></div>
                            <div className="mb-1 flex items-baseline gap-2">
                                <span className="text-xs font-mono font-bold text-slate-600">{mem.date}</span>
                                {mem.mood && <span className="text-[10px] px-1.5 py-0.5 bg-primary/5 text-primary rounded-md">#{mem.mood}</span>}
                            </div>
                            <div className="bg-white p-4 rounded-xl rounded-tl-sm shadow-sm border border-slate-100 text-sm text-slate-700 leading-relaxed text-justify">{mem.summary}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex gap-4">
                    <div><span className="block text-[10px] text-slate-400 uppercase tracking-widest">总字数</span><span className="text-lg font-medium text-slate-700 font-mono">{stats.totalChars.toLocaleString()}</span></div>
                    <div><span className="block text-[10px] text-slate-400 uppercase tracking-widest">总条目</span><span className="text-lg font-medium text-slate-700 font-mono">{stats.count}</span></div>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-white/50 px-3 py-1.5 rounded-full border border-white/50 shadow-sm">
                    {viewState.level === 'root' ? <span>档案室</span> : (
                        <>
                            <button onClick={() => setViewState({level: 'root', selectedYear: null, selectedMonth: null})} className="hover:text-primary">档案</button><span className="text-slate-300">/</span>
                            {viewState.level === 'year' ? <span className="text-slate-800">{viewState.selectedYear}</span> : (
                                <><button onClick={() => setViewState(prev => ({...prev, level: 'year', selectedMonth: null}))} className="hover:text-primary">{viewState.selectedYear}</button><span className="text-slate-300">/</span><span className="text-slate-800">{parseInt(viewState.selectedMonth!)}月</span></>
                            )}
                        </>
                    )}
                </div>
            </div>
            {viewState.level === 'root' && renderYears()}
            {viewState.level === 'year' && (
                <><div className="mb-4 flex items-center gap-2"><button onClick={handleBack} className="p-1.5 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg></button><h3 className="text-sm font-medium text-slate-600">选择月份</h3></div>{renderMonths()}</>
            )}
            {viewState.level === 'month' && (
                <><div className="mb-4 flex items-center gap-2"><button onClick={handleBack} className="p-1.5 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg></button><h3 className="text-sm font-medium text-slate-600">本月记忆</h3></div>{renderMemories()}</>
            )}
        </div>
    );
};

const Character: React.FC = () => {
  const { closeApp, openApp, characters, activeCharacterId, setActiveCharacterId, addCharacter, updateCharacter, deleteCharacter, apiConfig, addToast } = useOS();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [detailTab, setDetailTab] = useState<'identity' | 'memory'>('identity');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CharacterProfile | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [isProcessingMemory, setIsProcessingMemory] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    if (editingId && view === 'detail') {
        if (!formData || formData.id !== editingId) {
            const target = characters.find(c => c.id === editingId);
            if (target) setFormData(target);
        }
    }
  }, [editingId, view]); 

  useEffect(() => {
    if (formData && editingId) {
        updateCharacter(editingId, formData);
    }
  }, [formData]);

  const handleBack = () => {
      if (view === 'detail') {
          setView('list');
          setEditingId(null);
      } else closeApp();
  };

  const handleChange = (field: keyof CharacterProfile, value: any) => {
      if (!formData) return;
      setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              setIsCompressing(true);
              const processedBase64 = await processImage(file);
              handleChange('avatar', processedBase64);
              addToast('头像上传成功', 'success');
          } catch (error: any) { 
              addToast(error.message || '图片处理失败', 'error'); 
          } finally {
              setIsCompressing(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      }
  };
  
  const handleRefineMonth = async (year: string, month: string, rawText: string) => {
      if (!apiConfig.apiKey) {
          addToast('请先配置 API Key', 'error');
          return;
      }
      
      const prompt = `You are a memory compressor for an AI roleplay system. 
Task: Summarize the following log from ${year}-${month} into a concise "Core Memory" for the AI.
Rules:
1. Focus on key relationship milestones, major events, and the user's personal info/preferences.
2. Ignore trivial small talk (hellos, weather).
3. Output format: A concise paragraph or 3-5 bullet points. Max 200 words.
4. If the log is empty or trivial, output "No significant events recorded."
5. Language: Use the same language as the log (likely Chinese).

Log:
${rawText.substring(0, 5000)}`;

      try {
          const response = await fetch(`${apiConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.apiKey}` },
              body: JSON.stringify({
                  model: apiConfig.model,
                  messages: [{ role: "user", content: prompt }],
                  temperature: 0.3
              })
          });

          if (!response.ok) throw new Error('API Request failed');
          const data = await response.json();
          const summary = data.choices[0].message.content.trim();
          
          const key = `${year}-${month}`;
          const newRefined = { ...(formData?.refinedMemories || {}), [key]: summary };
          handleChange('refinedMemories', newRefined);
          addToast(`${year}年${month}月记忆精炼完成`, 'success');

      } catch (e: any) {
          addToast(`精炼失败: ${e.message}`, 'error');
      }
  };

  const handleExportPreview = () => {
      if (!formData) return;
      const mems = formData.memories as any[];
      if (!mems || mems.length === 0) {
          addToast('暂无记忆数据可导出', 'info');
          return;
      }

      const sortedMemories = [...mems].sort((a, b) => a.date.localeCompare(b.date));
      let text = `【角色档案】\nName: ${formData.name}\nExported: ${new Date().toLocaleString()}\n\n`;
      
      // Append Refined Memories
      if (formData.refinedMemories) {
          text += `=== 核心记忆 (AI精炼版) ===\n`;
          Object.entries(formData.refinedMemories).sort().forEach(([k, v]) => {
              text += `[${k}]: ${v}\n`;
          });
          text += `\n=== 详细日志 ===\n`;
      }

      let currentYear = '', currentMonth = '';
      sortedMemories.forEach(mem => {
          const match = mem.date.match(/(\d{4})[-/年](\d{1,2})/);
          if (match) {
              const y = match[1], m = match[2];
              if (y !== currentYear) { text += `\n[ ${y}年 ]\n`; currentYear = y; currentMonth = ''; }
              if (m !== currentMonth) { text += `\n-- ${parseInt(m)}月 --\n\n`; currentMonth = m; }
          }
          text += `📅 ${mem.date} ${mem.mood ? `(#${mem.mood})` : ''}\n${mem.summary}\n\n--------------------------\n\n`;
      });
      setExportText(text);
      setShowExportModal(true);
  };

  const handleDownloadTxt = () => {
      if(!exportText) {
          addToast('导出内容为空', 'error');
          return;
      }
      try {
          const blob = new Blob([exportText], {type: 'text/plain'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${formData?.name || 'character'}_memories.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addToast('下载请求已发送', 'success');
          setShowExportModal(false);
      } catch (e) {
          addToast('下载被浏览器阻止，请尝试复制文本', 'error');
      }
  };

  const handleCopyText = async () => {
      try {
          await navigator.clipboard.writeText(exportText);
          addToast('已复制到剪贴板', 'success');
          setShowExportModal(false);
      } catch (e) {
          addToast('复制失败，请手动选择文本', 'error');
      }
  };

  const handleImportMemories = async () => {
      if (!importText.trim() || !apiConfig.apiKey) {
          addToast('请检查输入内容或 API 设置', 'error');
          return;
      }
      setIsProcessingMemory(true);
      setImportStatus('正在链接神经云端进行清洗...');
      try {
          const prompt = `你是一个专业的记忆档案管理员。请将以下文本整理提取为标准 JSON 数组格式。
要求：
1. 直接返回 JSON 数组，不要包含任何 Markdown 标记或其他解释性文字。
2. 数组中每个对象包含三个字段：
   - date: 日期字符串 (YYYY-MM-DD 或 YYYY年MM月)
   - summary: 记忆摘要 (简练的中文描述)
   - mood: 情感标签 (如: 开心, 忧郁, 平静)
3. 文本内容：
${importText.substring(0, 8000)}`;

          const response = await fetch(`${apiConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.apiKey}` },
              body: JSON.stringify({
                  model: apiConfig.model,
                  messages: [{ role: "system", content: "You are a memory archivist. Output only valid JSON array." }, { role: "user", content: prompt }],
                  temperature: 0.1
              })
          });
          
          if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

          const data = await response.json();
          let content = data.choices?.[0]?.message?.content || '';
          
          // Clean up potential markdown code blocks
          content = content.replace(/```json/g, '').replace(/```/g, '').trim();

          // Robustness: Extract array if surrounded by text
          const firstBracket = content.indexOf('[');
          const lastBracket = content.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket !== -1) {
              content = content.substring(firstBracket, lastBracket + 1);
          }

          let parsed;
          try {
             parsed = JSON.parse(content);
          } catch (e) {
             throw new Error('解析返回数据失败，格式非 JSON');
          }

          let targetArray = null;
          if (Array.isArray(parsed)) targetArray = parsed;
          // Handle object wrappers like { "memories": [...] }
          else if (parsed.memories && Array.isArray(parsed.memories)) targetArray = parsed.memories;
          else if (parsed.data && Array.isArray(parsed.data)) targetArray = parsed.data;

          if (Array.isArray(targetArray)) {
              const newMems = targetArray.map((m: any) => ({ 
                  id: `mem-${Date.now()}-${Math.random()}`, 
                  date: m.date || '未知', 
                  summary: m.summary || '无内容', 
                  mood: m.mood || '记录' 
              }));
              handleChange('memories', [...(formData?.memories || []), ...newMems]);
              addToast(`成功导入 ${newMems.length} 条记忆`, 'success');
              setShowImportModal(false);
          } else {
              throw new Error('返回数据结构不是数组');
          }
      } catch (e: any) { 
          setImportStatus(`错误: ${e.message || '未知错误'}`); 
          addToast('记忆清洗失败', 'error');
          console.error(e);
      } finally { 
          setIsProcessingMemory(false); 
      }
  };

  return (
    <div className="h-full w-full bg-slate-50/30 font-light relative">
       {view === 'list' ? (
           <div className="flex flex-col h-full animate-fade-in">
               <div className="px-6 pt-12 pb-4 shrink-0 flex items-center justify-between">
                   <div><h1 className="text-2xl font-light text-slate-800 tracking-tight">神经链接</h1><p className="text-xs text-slate-400 mt-1">已建立 {characters.length} 个角色连接</p></div>
                   <button onClick={closeApp} className="p-2 rounded-full bg-white/40 hover:bg-white/80 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
               </div>
               <div className="flex-1 overflow-y-auto px-5 pb-20 no-scrollbar space-y-3">
                   {characters.map(char => (
                       <CharacterCard key={char.id} char={char} onClick={() => { setEditingId(char.id); setView('detail'); }} onDelete={(e) => { e.stopPropagation(); deleteCharacter(char.id); }} />
                   ))}
                   <button onClick={addCharacter} className="w-full py-4 rounded-3xl border border-dashed border-slate-300 text-slate-400 text-sm hover:bg-white/30 transition-all flex items-center justify-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>新建链接
                   </button>
               </div>
           </div>
       ) : formData && (
           <div className="flex flex-col h-full animate-fade-in bg-slate-50/50 relative">
               <div className="h-28 bg-gradient-to-b from-white/90 to-transparent backdrop-blur-sm flex flex-col justify-end px-5 pb-2 shrink-0 z-40 sticky top-0">
                   <div className="flex justify-between items-center mb-3">
                       <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-white/60 flex items-center gap-1 text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg><span className="text-sm font-medium">列表</span></button>
                       {/* 替换为发消息按钮 */}
                       <button 
                           onClick={() => { setActiveCharacterId(formData.id); openApp(AppID.Chat); }} 
                           className="text-xs px-3 py-1.5 bg-primary text-white rounded-full font-bold shadow-sm shadow-primary/30 flex items-center gap-1 active:scale-95 transition-transform"
                       >
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926H16.5a.75.75 0 0 1 0 1.5H3.693l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" /></svg>
                           发消息
                       </button>
                   </div>
                   <div className="flex gap-6 text-sm font-medium text-slate-400 pl-1">
                       <button onClick={() => setDetailTab('identity')} className={`pb-2 transition-colors relative ${detailTab === 'identity' ? 'text-slate-800' : ''}`}>人格设定{detailTab === 'identity' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full"></div>}</button>
                       <button onClick={() => setDetailTab('memory')} className={`pb-2 transition-colors relative ${detailTab === 'memory' ? 'text-slate-800' : ''}`}>记忆档案 ({(formData.memories as MemoryFragment[])?.length || 0}){detailTab === 'memory' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full"></div>}</button>
                   </div>
               </div>
               <div className="flex-1 overflow-y-auto p-5 no-scrollbar pb-10">
                   {detailTab === 'identity' ? (
                       <div className="space-y-6 animate-fade-in">
                           <div className="flex items-center gap-5">
                               <div className="relative group cursor-pointer w-24 h-24 shrink-0" onClick={() => fileInputRef.current?.click()}>
                                   <div className="w-full h-full rounded-[2rem] shadow-md bg-white border-4 border-white overflow-hidden relative"><img src={formData.avatar} className={`w-full h-full object-cover ${isCompressing ? 'opacity-50 blur-sm' : ''}`} alt="A" /></div>
                                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                               </div>
                               <div className="flex-1 space-y-3">
                                   <input value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full bg-transparent py-1 text-xl font-medium text-slate-800 border-b border-slate-200" placeholder="名称" />
                                   <input value={formData.description} onChange={(e) => handleChange('description', e.target.value)} className="w-full bg-transparent py-1 text-sm text-slate-500 border-b border-slate-200" placeholder="描述" />
                               </div>
                           </div>
                           <textarea value={formData.systemPrompt} onChange={(e) => handleChange('systemPrompt', e.target.value)} className="w-full h-64 bg-white rounded-3xl p-5 text-sm shadow-sm resize-none focus:ring-1 focus:ring-primary/20 transition-all" placeholder="设定..." />
                       </div>
                   ) : (
                       <div className="space-y-4 animate-fade-in">
                           <div className="flex justify-center gap-4 mb-4">
                               <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-white rounded-full text-xs font-semibold text-primary shadow-sm">导入/清洗</button>
                               <button onClick={handleExportPreview} className="px-4 py-2 bg-white rounded-full text-xs font-semibold text-slate-600 shadow-sm">导出备份</button>
                           </div>
                           <MemoryArchivist 
                               memories={formData.memories} 
                               refinedMemories={formData.refinedMemories || {}} 
                               onRefine={handleRefineMonth}
                           />
                       </div>
                   )}
               </div>
           </div>
       )}
       
       {/* 导入 Modal */}
       <Modal
           isOpen={showImportModal}
           title="记忆导入/清洗"
           onClose={() => setShowImportModal(false)}
           footer={
               <>
                   <button onClick={() => setShowImportModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-2xl">取消</button>
                   <button onClick={handleImportMemories} disabled={isProcessingMemory} className="flex-1 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2">
                       {isProcessingMemory && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                       {isProcessingMemory ? '处理中...' : '开始执行'}
                   </button>
               </>
           }
       >
           <div className="space-y-3">
               <div className="text-xs text-slate-400 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                   请粘贴任意乱序的文本记录（如聊天记录、日记片段），AI 将自动将其整理为结构化的记忆档案。需消耗 Token。
               </div>
               {importStatus && <div className="text-xs text-primary font-medium">{importStatus}</div>}
               <textarea 
                   value={importText}
                   onChange={e => setImportText(e.target.value)}
                   placeholder="在此粘贴文本..."
                   className="w-full h-32 bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm text-slate-700 resize-none focus:ring-2 focus:ring-primary/20 transition-all"
               />
           </div>
       </Modal>

       {/* 导出 Modal */}
       <Modal
           isOpen={showExportModal}
           title="记忆备份导出"
           onClose={() => setShowExportModal(false)}
           footer={
               <div className="flex gap-2 w-full">
                    <button onClick={handleDownloadTxt} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-3-3m0 0 3-3m-3 3h7.5" /></svg>
                        下载文件
                    </button>
                    <button onClick={handleCopyText} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl shadow-sm">
                        复制文本
                    </button>
               </div>
           }
       >
           <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
               <div className="text-[10px] text-slate-400 mb-2">已生成 {formData?.memories?.length} 条记忆档案。如果下载没反应，请使用右侧“复制文本”。</div>
               <textarea 
                   value={exportText}
                   readOnly
                   className="w-full h-40 bg-transparent border-none text-[10px] font-mono text-slate-600 resize-none focus:ring-0 leading-relaxed select-all"
                   onClick={(e) => e.currentTarget.select()}
               />
           </div>
       </Modal>
    </div>
  );
};
export default Character;
