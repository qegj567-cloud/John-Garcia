
import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../context/OSContext';
import { DB } from '../utils/db';
import { Message, MessageType, ChatTheme, BubbleStyle } from '../types';
import Modal from '../components/os/Modal';

// Built-in presets map to the new data structure for consistency
const PRESET_THEMES: Record<string, ChatTheme> = {
    default: {
        id: 'default', name: 'Indigo', type: 'preset',
        user: { textColor: '#ffffff', backgroundColor: '#6366f1', borderRadius: 20, opacity: 1 }, 
        ai: { textColor: '#1e293b', backgroundColor: '#ffffff', borderRadius: 20, opacity: 1 }
    },
    dream: {
        id: 'dream', name: 'Dream', type: 'preset',
        user: { textColor: '#ffffff', backgroundColor: '#f472b6', borderRadius: 20, opacity: 1 },
        ai: { textColor: '#1e293b', backgroundColor: '#ffffff', borderRadius: 20, opacity: 1 }
    },
    forest: {
        id: 'forest', name: 'Forest', type: 'preset',
        user: { textColor: '#ffffff', backgroundColor: '#10b981', borderRadius: 20, opacity: 1 },
        ai: { textColor: '#1e293b', backgroundColor: '#ffffff', borderRadius: 20, opacity: 1 }
    },
};

const USER_AVATAR = "https://api.dicebear.com/9.x/notionists/svg?seed=User&backgroundColor=b6e3f4";

const Chat: React.FC = () => {
    const { characters, activeCharacterId, setActiveCharacterId, updateCharacter, apiConfig, closeApp, customThemes, removeCustomTheme, addToast } = useOS();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [recallStatus, setRecallStatus] = useState<string>(''); // To show "Reading memory..." status
    const [showPanel, setShowPanel] = useState<'none' | 'actions' | 'emojis' | 'chars'>('none');
    const [emojis, setEmojis] = useState<{name: string, url: string}[]>([]);
    const [tokenCount, setTokenCount] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [modalType, setModalType] = useState<'none' | 'transfer' | 'emoji-import'>('none');
    const [transferAmt, setTransferAmt] = useState('');
    const [emojiImportText, setEmojiImportText] = useState('');
    
    const char = characters.find(c => c.id === activeCharacterId) || characters[0];
    
    // Theme Logic Resolution
    const currentThemeId = char?.bubbleStyle || 'default';
    const activeTheme = customThemes.find(t => t.id === currentThemeId) || PRESET_THEMES[currentThemeId] || PRESET_THEMES.default;

    const draftKey = `chat_draft_${activeCharacterId}`;

    useEffect(() => {
        if (activeCharacterId) {
            DB.getMessagesByCharId(activeCharacterId).then(setMessages);
            DB.getEmojis().then(setEmojis);
            const savedDraft = localStorage.getItem(draftKey);
            setInput(savedDraft || '');
        }
    }, [activeCharacterId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
        if (val.trim()) localStorage.setItem(draftKey, val);
        else localStorage.removeItem(draftKey);
    };

    useEffect(() => {
        const text = messages.map(m => m.content).join('');
        setTokenCount(Math.floor(text.length * 1.2));
    }, [messages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isTyping, recallStatus]);

    const handleSendText = async (customContent?: string, customType?: MessageType, metadata?: any) => {
        if (!char || (!input.trim() && !customContent)) return;
        const text = customContent || input.trim();
        if (!customContent) { setInput(''); localStorage.removeItem(draftKey); }
        await DB.saveMessage({ charId: char.id, role: 'user', type: customType || 'text', content: text, metadata });
        const updatedMsgs = await DB.getMessagesByCharId(char.id);
        setMessages(updatedMsgs);
        setShowPanel('none');
    };

    // Helper to get raw logs for a specific month
    const getDetailedLogsForMonth = (year: string, month: string) => {
        if (!char.memories) return null;
        const target = `${year}-${month.padStart(2, '0')}`;
        // Also match YYYY年MM月 format if date string varies
        const logs = char.memories.filter(m => {
            return m.date.includes(target) || m.date.includes(`${year}年${parseInt(month)}月`);
        });
        
        if (logs.length === 0) return null;
        return logs.map(m => `[${m.date}] (${m.mood || 'normal'}): ${m.summary}`).join('\n');
    };

    const triggerAI = async (currentMsgs: Message[]) => {
        if (isTyping || !char) return;
        if (!apiConfig.baseUrl) { alert("请先在设置中配置 API URL"); return; }

        setIsTyping(true);
        setRecallStatus('');

        try {
            const baseUrl = apiConfig.baseUrl.replace(/\/+$/, '');
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.apiKey || 'sk-none'}` };

            // 1. Prepare Base Context (System + Core Memories)
            let longTermMemoryContext = "";
            if (char.refinedMemories && Object.keys(char.refinedMemories).length > 0) {
                longTermMemoryContext = "\n[Core Memory Index (Summaries)]:\n";
                Object.entries(char.refinedMemories)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .forEach(([date, summary]) => {
                        longTermMemoryContext += `- ${date}: ${summary}\n`;
                    });
            }

            const baseSystemPrompt = `${char.systemPrompt || '你是一个温柔、有趣的AI伴侣。'}
${longTermMemoryContext}
[System Note]: 
- You are simulating a mobile chat.
- **Active Recall**: You have access to detailed memory archives. If the Core Memory Index above shows a record for a specific month (e.g., "2023-05") but lacks the specific detail you need to answer the user (e.g., "what movie did we see?"), you MUST output the tool code: \`[[RECALL: YYYY-MM]]\`.
- Example: Output \`[[RECALL: 2023-05]]\` strictly. Do not output anything else. The system will then pause, fetch the detailed logs, and feed them to you in the next turn.
- Only use RECALL if absolutely necessary for specific details. Otherwise, just chat normally.
- **Interactions**: "戳一戳" means the user poked you playfully. React emotionally.
- **Transfers**: React to money received.`;

            // 2. Prepare Chat History
            const buildHistory = (msgs: Message[]) => msgs.slice(-20).map(m => {
                let content = m.content;
                if (m.type === 'interaction') content = '[System: User POKED you]'; 
                else if (m.type === 'transfer') content = `[System: User sent ${m.metadata?.amount} Credits]`;
                else if (m.type === 'emoji') content = `[User sent a sticker/image]`;
                return { role: m.role, content };
            });

            let apiMessages = [
                { role: 'system', content: baseSystemPrompt },
                ...buildHistory(currentMsgs)
            ];

            // --- First Attempt ---
            let response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ model: apiConfig.model, messages: apiMessages, temperature: 0.7, stream: false })
            });

            if (!response.ok) throw new Error(`API Error ${response.status}`);
            let data = await response.json();
            let aiContent = data.choices?.[0]?.message?.content || '';

            // 3. Check for RECALL Command
            const recallMatch = aiContent.match(/\[\[RECALL:\s*(\d{4})[-/年](\d{1,2})\]\]/);
            
            if (recallMatch) {
                const year = recallMatch[1];
                const month = recallMatch[2];
                setRecallStatus(`正在调阅 ${year}年${month}月 的详细档案...`);
                
                // Fetch details
                const detailedLogs = getDetailedLogsForMonth(year, month);
                
                if (detailedLogs) {
                    // Inject detailed logs as a temporary system message
                    const injectionMessage = {
                        role: 'system', 
                        content: `[System: Detailed Logs for ${year}-${month} Retrieved Successfully]\n${detailedLogs}\n[System: Now answer the user's last message using these details.]`
                    };
                    
                    // Re-construct messages with injection
                    apiMessages = [
                        { role: 'system', content: baseSystemPrompt },
                        ...buildHistory(currentMsgs),
                        injectionMessage
                    ];

                    // --- Second Attempt (with details) ---
                    response = await fetch(`${baseUrl}/chat/completions`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ model: apiConfig.model, messages: apiMessages, temperature: 0.7, stream: false })
                    });
                    
                    if (response.ok) {
                        data = await response.json();
                        aiContent = data.choices?.[0]?.message?.content || '';
                        addToast(`已调用 ${year}-${month} 详细记忆`, 'info');
                    }
                } else {
                     // Log not found, tell AI to proceed without it
                     apiMessages.push({ role: 'system', content: `[System: RECALL failed. No detailed logs found for ${year}-${month}. Please answer as best as you can.]` });
                     response = await fetch(`${baseUrl}/chat/completions`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ model: apiConfig.model, messages: apiMessages, temperature: 0.7 })
                    });
                    if (response.ok) {
                        data = await response.json();
                        aiContent = data.choices?.[0]?.message?.content || '';
                    }
                }
            }
            
            setRecallStatus('');

            // 4. Stream/Simulate Output
            // Remove any leftover tool codes if they exist in final output
            aiContent = aiContent.replace(/\[\[RECALL:.*?\]\]/g, '').trim();
            if (!aiContent) aiContent = "..."; // Fallback

            const chunks = aiContent.split(/(?<=[。.!！?？\n])/).filter((s: string) => s.trim().length > 0);
            if (chunks.length === 0 && aiContent.length > 0) chunks.push(aiContent);

            for (let i = 0; i < chunks.length; i++) {
                let chunk = chunks[i].replace(/[,，]/g, ' ').replace(/[.。]$/g, '').trim();
                if (!chunk) continue;
                await new Promise(r => setTimeout(r, Math.min(Math.max(chunk.length * 50, 500), 2000)));
                await DB.saveMessage({ charId: char.id, role: 'assistant', type: 'text', content: chunk });
                setMessages(await DB.getMessagesByCharId(char.id));
                if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 400));
            }

        } catch (e: any) {
            await DB.saveMessage({ charId: char.id, role: 'system', type: 'text', content: `[连接中断: ${e.message}]` });
            setMessages(await DB.getMessagesByCharId(char.id));
        } finally {
            setIsTyping(false);
            setRecallStatus('');
        }
    };

    const getBubbleCSS = (role: 'user' | 'assistant', isFirst: boolean, isLast: boolean): React.CSSProperties => {
        const styleConfig = role === 'user' ? activeTheme.user : activeTheme.ai;
        const radius = styleConfig.borderRadius;
        
        let borderObj: React.CSSProperties = { borderRadius: `${radius}px` };
        if (!isFirst && !isLast) {
            borderObj = role === 'user' 
                ? { borderRadius: `${radius}px`, borderTopRightRadius: '4px', borderBottomRightRadius: '4px' }
                : { borderRadius: `${radius}px`, borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px' };
        } else if (isFirst && !isLast) {
            borderObj = role === 'user'
                ? { borderRadius: `${radius}px`, borderBottomRightRadius: '4px' }
                : { borderRadius: `${radius}px`, borderBottomLeftRadius: '4px' };
        } else if (!isFirst && isLast) {
            borderObj = role === 'user'
                ? { borderRadius: `${radius}px`, borderTopRightRadius: '4px' }
                : { borderRadius: `${radius}px`, borderTopLeftRadius: '4px' };
        } else {
             borderObj = role === 'user'
                ? { borderRadius: `${radius}px`, borderBottomRightRadius: '2px' }
                : { borderRadius: `${radius}px`, borderBottomLeftRadius: '2px' };
        }

        return {
            color: styleConfig.textColor,
            backgroundColor: styleConfig.backgroundColor,
            backgroundImage: styleConfig.backgroundImage ? `url(${styleConfig.backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: styleConfig.opacity,
            ...borderObj
        };
    };

    const renderMessage = (m: Message, index: number) => {
        const isUser = m.role === 'user';
        const isSystem = m.role === 'system';
        const prevRole = messages[index - 1]?.role;
        const nextRole = messages[index + 1]?.role;
        const isFirstInGroup = prevRole !== m.role;
        const isLastInGroup = nextRole !== m.role;
        const marginBottom = isLastInGroup ? 'mb-6' : 'mb-1.5';

        if (isSystem) return <div className="flex justify-center my-6 px-10"><span className="text-[11px] bg-slate-200/60 backdrop-blur-sm text-slate-500 px-4 py-1.5 rounded-full font-medium shadow-sm">{m.content}</span></div>;

        // Custom Render for Poke/Interaction
        if (m.type === 'interaction') {
            return (
                <div className={`flex justify-center ${marginBottom} w-full animate-fade-in`}>
                    <div className="group relative cursor-pointer active:scale-95 transition-transform">
                         <div className="text-[11px] text-slate-500 bg-slate-200/50 backdrop-blur-sm px-4 py-1.5 rounded-full flex items-center gap-1.5 border border-white/40 shadow-sm">
                            <span className="group-hover:animate-bounce">👉</span>
                            <span className="font-medium opacity-80">{isUser ? '你' : char.name}</span>
                            <span className="opacity-60">戳了戳</span>
                            <span className="font-medium opacity-80">{isUser ? char.name : '你'}</span>
                        </div>
                    </div>
                </div>
            );
        }

        if (m.type === 'transfer' || m.type === 'emoji') {
            return (
                <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${marginBottom} px-3`}>
                    {!isUser && isLastInGroup && <img src={char.avatar} className="w-9 h-9 rounded-[10px] object-cover mr-3 self-end mb-1 shadow-sm" />}
                    {!isUser && !isLastInGroup && <div className="w-9 mr-3"></div>}
                    {m.type === 'transfer' ? (
                        <div className="w-64 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-20"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12"><path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 0 1-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.324.152-.691.546-1.004ZM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 0 1-.921.42Z" /><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v.816a3.836 3.836 0 0 0-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 0 1-.921-.421l-.879-.66a.75.75 0 0 0-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 0 0 1.5 0v-.81a4.124 4.124 0 0 0 1.821-.749c.745-.559 1.179-1.344 1.179-2.191 0-.847-.434-1.632-1.179-2.191a4.122 4.122 0 0 0-1.821-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 0 0 .933-1.175l-.415-.33a3.836 3.836 0 0 0-1.719-.755V6Z" clipRule="evenodd" /></svg></div>
                             <div className="flex items-center gap-3 mb-2">
                                 <div className="p-2 bg-white/20 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 7.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" /><path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 14.625v-9.75ZM8.25 9.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM18.75 9a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V9.75a.75.75 0 0 0-.75-.75h-.008ZM4.5 9.75A.75.75 0 0 1 5.25 9h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75V9.75Z" clipRule="evenodd" /><path d="M2.25 18a.75.75 0 0 0 0 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 0 0-.75-.75H2.25Z" /></svg></div>
                                 <span className="font-medium text-white/90">Aether Pay</span>
                             </div>
                             <div className="text-2xl font-bold tracking-tight mb-1">₩ {m.metadata?.amount}</div>
                             <div className="text-[10px] text-white/70">转账给{isUser ? char.name : '你'}</div>
                        </div>
                    ) : (
                        <img src={m.content} className="max-w-[160px] max-h-[160px] rounded-2xl hover:scale-105 transition-transform shadow-md" />
                    )}
                    {isUser && isLastInGroup && <img src={USER_AVATAR} className="w-9 h-9 rounded-[10px] object-cover ml-3 self-end mb-1 shadow-sm" />}
                    {isUser && !isLastInGroup && <div className="w-9 ml-3"></div>}
                </div>
            );
        }

        const bubbleStyle = getBubbleCSS(m.role as 'user' | 'assistant', isFirstInGroup, isLastInGroup);
        const decoImage = isUser ? activeTheme.user.decoration : activeTheme.ai.decoration;

        return (
            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${marginBottom} px-3 group`}>
                {!isUser && (
                    <div className="w-9 h-9 shrink-0 mr-3 self-end mb-[2px]">
                        {isLastInGroup && <img src={char.avatar} className="w-full h-full rounded-[10px] object-cover shadow-sm ring-1 ring-black/5" alt="avatar" />}
                    </div>
                )}

                <div className="relative max-w-[88%] shadow-sm text-[15px] leading-relaxed break-words px-5 py-3 animate-fade-in border border-black/5" style={bubbleStyle}>
                    {decoImage && (
                        <img 
                            src={decoImage} 
                            className={`absolute w-8 h-8 object-contain drop-shadow-sm -top-3 ${isUser ? '-right-2' : '-left-2'}`} 
                            style={{ transform: isUser ? 'rotate(15deg)' : 'rotate(-15deg)' }}
                            alt=""
                        />
                    )}
                    {m.content}
                </div>

                {isUser && (
                    <div className="w-9 h-9 shrink-0 ml-3 self-end mb-[2px]">
                         {isLastInGroup && <img src={USER_AVATAR} className="w-full h-full rounded-[10px] object-cover shadow-sm ring-1 ring-black/5" alt="avatar" />}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#f1f5f9] overflow-hidden relative font-sans">
            {/* Modal Logic ... (Same as before) */}
             <Modal 
                isOpen={modalType === 'transfer'} title="Credits 转账" onClose={() => setModalType('none')}
                footer={<><button onClick={() => setModalType('none')} className="flex-1 py-3 bg-slate-100 rounded-2xl">取消</button><button onClick={() => { if(transferAmt) handleSendText(`[转账]`, 'transfer', { amount: transferAmt }); setModalType('none'); }} className="flex-1 py-3 bg-orange-500 text-white rounded-2xl">确认</button></>}
            ><input type="number" value={transferAmt} onChange={e => setTransferAmt(e.target.value)} className="w-full bg-slate-100 rounded-2xl px-5 py-4 text-lg font-bold" autoFocus /></Modal>

            <Modal 
                isOpen={modalType === 'emoji-import'} title="表情注入" onClose={() => setModalType('none')}
                footer={<button onClick={async () => { const lines = emojiImportText.split('\n'); for (const line of lines) { const [n, u] = line.split('--'); if (n && u) await DB.saveEmoji(n.trim(), u.trim()); } setEmojis(await DB.getEmojis()); setModalType('none'); }} className="w-full py-4 bg-primary text-white font-bold rounded-2xl">注入</button>}
            ><textarea value={emojiImportText} onChange={e => setEmojiImportText(e.target.value)} placeholder="Name--URL" className="w-full h-40 bg-slate-100 rounded-2xl p-4 resize-none" /></Modal>

            {/* Header */}
            <div className="h-24 bg-white/80 backdrop-blur-xl px-5 flex items-end pb-4 border-b border-slate-200/60 shrink-0 z-30 sticky top-0 shadow-sm">
                <div className="flex items-center gap-3 w-full">
                    <button onClick={closeApp} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
</svg></button>
                    <div onClick={() => setShowPanel('chars')} className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer">
                        <img src={char.avatar} className="w-10 h-10 rounded-xl object-cover shadow-sm" alt="a" />
                        <div><div className="font-bold text-slate-800">{char.name}</div><div className="text-[10px] text-slate-400 uppercase">Online</div></div>
                    </div>
                    <button onClick={() => triggerAI(messages)} disabled={isTyping} className={`p-2 rounded-full ${isTyping ? 'bg-slate-100' : 'bg-primary/10 text-primary'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg></button>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto pt-6 pb-6 no-scrollbar" style={{ backgroundImage: activeTheme.type === 'custom' && activeTheme.user.backgroundImage ? 'none' : undefined }}>
                {messages.map((m, i) => <div key={i}>{renderMessage(m, i)}</div>)}
                
                {/* Typing & Recall Indicators */}
                {(isTyping || recallStatus) && (
                    <div className="flex items-end gap-3 px-3 mb-6 animate-fade-in">
                        <img src={char.avatar} className="w-9 h-9 rounded-[10px] object-cover" />
                        <div className="bg-white px-4 py-3 rounded-2xl shadow-sm">
                            {recallStatus ? (
                                <div className="flex items-center gap-2 text-xs text-indigo-500 font-medium">
                                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    {recallStatus}
                                </div>
                            ) : (
                                <div className="flex gap-1"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div></div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="bg-white/90 backdrop-blur-2xl border-t border-slate-200/50 pb-safe shrink-0 z-40">
                <div className="p-3 px-4 flex gap-3 items-end">
                    <button onClick={() => setShowPanel(showPanel === 'actions' ? 'none' : 'actions')} className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg></button>
                    <div className="flex-1 bg-slate-100 rounded-[24px] flex items-center px-1 border border-transparent focus-within:bg-white focus-within:border-primary/30 transition-all">
                        <textarea rows={1} value={input} onChange={handleInputChange} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); }}} className="flex-1 bg-transparent px-4 py-3 text-[15px] resize-none max-h-24" placeholder="Message..." style={{ height: 'auto' }} />
                        <button onClick={() => setShowPanel(showPanel === 'emojis' ? 'none' : 'emojis')} className="p-2 text-slate-400 hover:text-primary"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg></button>
                    </div>
                    <button onClick={() => handleSendText()} disabled={!input.trim()} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${input.trim() ? 'bg-primary text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" /></svg></button>
                </div>

                {showPanel !== 'none' && (
                    <div className="bg-slate-50 h-72 border-t border-slate-200/60 overflow-y-auto no-scrollbar relative z-0">
                         {showPanel === 'actions' && (
                             <div className="p-6 grid grid-cols-4 gap-8">
                                <button onClick={() => setModalType('transfer')} className="flex flex-col items-center gap-2 text-slate-600"><div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-orange-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 7.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" /><path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 14.625v-9.75ZM8.25 9.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM18.75 9a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V9.75a.75.75 0 0 0-.75-.75h-.008ZM4.5 9.75A.75.75 0 0 1 5.25 9h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75V9.75Z" clipRule="evenodd" /><path d="M2.25 18a.75.75 0 0 0 0 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 0 0-.75-.75H2.25Z" /></svg></div><span className="text-xs font-bold">转账</span></button>
                                <button onClick={() => handleSendText('[戳一戳]', 'interaction')} className="flex flex-col items-center gap-2 text-slate-600"><div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-2xl">👉</div><span className="text-xs font-bold">戳一戳</span></button>
                             </div>
                         )}
                         {showPanel === 'emojis' && (
                            <div className="p-4 grid grid-cols-4 gap-3">
                                <button onClick={() => setModalType('emoji-import')} className="aspect-square bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center text-2xl text-slate-400">+</button>
                                {emojis.map((e, i) => <button key={i} onClick={() => handleSendText(e.url, 'emoji')} className="aspect-square bg-white rounded-2xl p-2 shadow-sm"><img src={e.url} className="w-full h-full object-contain" /></button>)}
                            </div>
                        )}
                        {showPanel === 'chars' && (
                            <div className="p-5 space-y-6">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 px-1 tracking-wider uppercase mb-3">气泡样式</h3>
                                    <div className="flex gap-3 px-1 overflow-x-auto no-scrollbar pb-2">
                                        {/* Presets */}
                                        {Object.values(PRESET_THEMES).map(t => (
                                            <button key={t.id} onClick={() => updateCharacter(char.id, { bubbleStyle: t.id })} className={`px-6 py-3 rounded-2xl text-xs font-bold border shrink-0 transition-all ${char.bubbleStyle === t.id ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600'}`}>{t.name}</button>
                                        ))}
                                        {/* Custom */}
                                        {customThemes.map(t => (
                                            <div key={t.id} className="relative group shrink-0">
                                                <button onClick={() => updateCharacter(char.id, { bubbleStyle: t.id })} className={`px-6 py-3 rounded-2xl text-xs font-bold border transition-all ${char.bubbleStyle === t.id ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                                                    {t.name} (DIY)
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); removeCustomTheme(t.id); }} className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 px-1 tracking-wider uppercase mb-3">切换会话</h3>
                                    <div className="space-y-3">
                                        {characters.map(c => (
                                            <div key={c.id} onClick={() => { setActiveCharacterId(c.id); setShowPanel('none'); }} className={`flex items-center gap-4 p-3 rounded-[20px] border cursor-pointer ${c.id === activeCharacterId ? 'bg-white border-primary/30 shadow-md' : 'bg-white/50 border-transparent'}`}>
                                                <img src={c.avatar} className="w-12 h-12 rounded-2xl object-cover" />
                                                <div className="flex-1"><div className="font-bold text-sm text-slate-700">{c.name}</div><div className="text-xs text-slate-400 truncate">{c.description}</div></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;
