import { API_BASE_URL } from '../utils/config';
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, MessageSquare, History, X, Menu } from 'lucide-react';

function sanitizeTextForSpeech(text) {
  if (!text) return "";
  let clean = text.replace(/[*#_\[\]{}]/g, ''); 
  clean = clean.replace(/([A-Z]{2,})/g, (match) => match.toLowerCase());
  return clean.trim().substring(0, 200);
}

export default function AntXTerminal({ userId, token, onUpdate, onNavigate, onLogin, currentView, voiceState }) {
  const { isVoiceActive, setIsVoiceActive, globalTranscript, globalAiResponse, globalStatus } = voiceState;

  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [interactionMode, setInteractionMode] = useState('text'); // 'text' or 'talk'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar drawer state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop sidebar collapse state
  
  const scrollRef = useRef(null);
  const containerRef = useRef(null);

  // Sync active thread ID to LocalStorage
  useEffect(() => {
    if (activeThreadId) {
      localStorage.setItem(`antx_active_thread_${userId}`, activeThreadId);
    }
  }, [activeThreadId, userId]);

  // Load threads from database on mount (guarded against unauthenticated state)
  useEffect(() => {
    if (!token || !userId || userId === 'guest_node') return;

    const fetchThreads = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/user/products/chat-threads`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setThreads(data);
          if (data.length > 0) {
            const savedActiveId = localStorage.getItem(`antx_active_thread_${userId}`);
            const exists = data.some(t => t.id === savedActiveId);
            setActiveThreadId(exists ? savedActiveId : data[0].id);
          } else {
            setActiveThreadId(null);
          }
        }
      } catch (err) {
        console.error('Error loading chat threads from DB:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchThreads();
  }, [userId, token]);

  const activeThread = threads.find(t => t.id === activeThreadId) || { messages: [] };
  const currentMessages = activeThread.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages, isThinking]);

  const startVoice = () => {
    setInteractionMode('talk');
    setIsVoiceActive(true);
    window.dispatchEvent(new CustomEvent('ANT_X_ACTIVATE'));
  };

  const handleNewChat = async () => {
    setIsThinking(true);
    try {
      const createRes = await fetch(`${API_BASE_URL}/api/user/products/chat-threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'New Session' })
      });
      const newThread = await createRes.json();
      if (newThread && newThread.id) {
        setThreads(prev => {
          const list = [newThread, ...prev];
          return list.slice(0, 10); // Restrict UI to exactly 10 threads
        });
        setActiveThreadId(newThread.id);
      }
    } catch (e) {
      console.error('Failed to create new chat session in DB:', e);
    } finally {
      setIsThinking(false);
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteThread = async (idToDelete, e) => {
    e.stopPropagation();
    const newThreads = threads.filter(t => t.id !== idToDelete);
    if (activeThreadId === idToDelete) {
      if (newThreads.length > 0) {
        setActiveThreadId(newThreads[0].id);
      } else {
        setActiveThreadId(null);
      }
    }
    setThreads(newThreads);

    try {
      await fetch(`${API_BASE_URL}/api/user/products/chat-threads/${idToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (e) {
      console.error('Failed to delete chat thread from DB:', e);
    }
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    setIsThinking(true);

    let currentThreadId = activeThreadId;
    let updatedThreads = [...threads];

    // If no active thread exists, create one first in the database
    if (!currentThreadId) {
      try {
        const createRes = await fetch(`${API_BASE_URL}/api/user/products/chat-threads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: text.substring(0, 24) + (text.length > 24 ? '...' : '') })
        });
        const newThread = await createRes.json();
        if (newThread && newThread.id) {
          currentThreadId = newThread.id;
          updatedThreads = [newThread, ...updatedThreads].slice(0, 10);
          setThreads(updatedThreads);
          setActiveThreadId(currentThreadId);
        } else {
          setIsThinking(false);
          return;
        }
      } catch (e) {
        console.error('Error auto-creating thread:', e);
        setIsThinking(false);
        return;
      }
    }

    const userMessage = { role: 'user', text };
    
    // Add user message locally
    setThreads(prev => prev.map(t => {
      if (t.id === currentThreadId) {
        let newTitle = t.title;
        if (t.title === 'Neural Core Linked' || t.title === 'New Session') {
          newTitle = text.substring(0, 24) + (text.length > 24 ? '...' : '');
        }
        return {
          ...t,
          title: newTitle,
          messages: [...(t.messages || []), userMessage],
          timestamp: Date.now()
        };
      }
      return t;
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/user/products/agent-command-v2`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, currentView: 'ant_x_terminal', isVoice: false, threadId: currentThreadId })
      });
      const data = await res.json();
      if (data.success) {
        const speech = data.speechText || data.message;
        const aiMessage = { role: 'ai', text: speech };

        setThreads(prev => prev.map(t => {
          if (t.id === currentThreadId) {
            let newTitle = t.title;
            if (t.title === 'Neural Core Linked' || t.title === 'New Session') {
              newTitle = text.substring(0, 24) + (text.length > 24 ? '...' : '');
            }
            return {
              ...t,
              title: newTitle,
              messages: [...(t.messages || []), aiMessage],
              timestamp: Date.now()
            };
          }
          return t;
        }));

        if (onUpdate && data.shouldUpdateUI) onUpdate();
        if (onNavigate && data.action === 'NAVIGATE' && data.page) onNavigate(data.page);
        if (onLogin && data.action === 'LOGIN' && data.loginId) onLogin(data.loginId);
      } else {
        const errorMsg = data.message || "Unknown error occurred.";
        const aiErrorMessage = { role: 'ai', text: `Error: ${errorMsg}` };
        setThreads(prev => prev.map(t => {
          if (t.id === currentThreadId) {
            return {
              ...t,
              messages: [...(t.messages || []), aiErrorMessage]
            };
          }
          return t;
        }));
      }
    } catch (e) {
      const aiErrorMessage = { role: 'ai', text: "Error: Could not establish secure link to neural node." };
      setThreads(prev => prev.map(t => {
        if (t.id === currentThreadId) {
          return {
            ...t,
            messages: [...(t.messages || []), aiErrorMessage]
          };
        }
        return t;
      }));
    }
    setIsThinking(false);
  };

  // Wire Web Speech Voice Actions with active thread context
  useEffect(() => {
    const handleVoiceCommand = (e) => {
      const text = e.detail.text;
      setThreads(prev => prev.map(t => {
        if (t.id === activeThreadId) {
          let newTitle = t.title;
          if (t.title === 'Neural Core Linked' || t.title === 'New Session') {
            newTitle = text.substring(0, 24) + (text.length > 24 ? '...' : '');
          }
          return {
            ...t,
            title: newTitle,
            messages: [...t.messages, { role: 'user', text }],
            timestamp: Date.now()
          };
        }
        return t;
      }));
    };

    const handleVoiceResponse = (e) => {
      const text = e.detail.text;
      setThreads(prev => prev.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: [...t.messages, { role: 'ai', text }],
            timestamp: Date.now()
          };
        }
        return t;
      }));
    };

    const handleThinking = (e) => {
      setIsThinking(e.detail.value);
    };

    window.addEventListener('ANT_X_VOICE_COMMAND', handleVoiceCommand);
    window.addEventListener('ANT_X_VOICE_RESPONSE', handleVoiceResponse);
    window.addEventListener('ANT_X_THINKING', handleThinking);

    return () => {
      window.removeEventListener('ANT_X_VOICE_COMMAND', handleVoiceCommand);
      window.removeEventListener('ANT_X_VOICE_RESPONSE', handleVoiceResponse);
      window.removeEventListener('ANT_X_THINKING', handleThinking);
    };
  }, [activeThreadId]);

  return (
    <div ref={containerRef} className="antx-terminal-container bg-[#F8FAFC]" style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      overflow: 'hidden',
      backgroundImage: 'radial-gradient(circle at 10% 10%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
      color: 'var(--text-main)',
      position: 'relative'
    }}>
      <style>{`
        .antx-terminal-container {
          padding: 2rem;
          box-sizing: border-box;
        }
        .antx-header {
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 2rem; 
          z-index: 10;
          gap: 1rem;
        }
        .antx-title {
          margin: 0; 
          font-size: 2.5rem; 
          color: var(--text-main);
          font-weight: 800;
          line-height: 1.1;
        }
        .antx-title-sub {
          color: var(--text-muted); 
          margin: 5px 0 0 0; 
          font-weight: 500;
          font-size: 0.9rem;
          text-align: left;
        }
        .antx-mode-selector {
          display: flex; 
          gap: 5px; 
          padding: 5px; 
          border-radius: 50px;
          flex-shrink: 0;
        }
        .antx-status-badge {
          padding: 0.8rem 1.5rem; 
          display: flex; 
          align-items: center; 
          gap: 10px;
          flex-shrink: 0;
        }
        .antx-chat-panel {
          width: 100%; 
          display: flex; 
          flex-direction: row; 
          padding: 0 !important;
          flex: 1;
          min-height: 0;
          box-sizing: border-box;
          overflow: hidden;
        }
        .antx-chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 2rem;
          min-width: 0;
          height: 100%;
          box-sizing: border-box;
        }
        .antx-input-bar {
          margin-top: 1.5rem; 
          display: flex; 
          gap: 1rem; 
          align-items: center;
          width: 100%;
        }
        .antx-orb {
          width: 300px; 
          height: 300px; 
          border-radius: 50%;
          display: flex; 
          align-items: center; 
          justify-content: center; 
          transition: 0.5s;
        }
        .antx-orb-emoji {
          font-size: 10rem;
        }

        /* Sidebar styles unified with dynamic variables to support dark/light modes */
        .antx-sidebar {
          width: 260px;
          background: transparent;
          border-right: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          height: 100%;
          box-sizing: border-box;
          padding: 1.5rem 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          z-index: 45;
          opacity: 1;
          overflow: hidden;
        }
        .antx-sidebar.collapsed {
          width: 0px;
          padding-left: 0px;
          padding-right: 0px;
          opacity: 0;
          pointer-events: none;
          border-right-width: 0px;
        }
        .antx-new-chat-btn {
          width: 100%;
          padding: 0.8rem 1rem;
          border-radius: 12px;
          border: 1px dashed var(--neon-accent);
          background: transparent;
          color: var(--neon-accent);
          font-weight: bold;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 1.2rem;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .antx-new-chat-btn:hover {
          background: rgba(15, 157, 99, 0.08);
          box-shadow: 0 0 10px rgba(15, 157, 99, 0.1);
        }
        .antx-threads-scroll {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-right: 4px;
        }
        .antx-thread-item {
          width: 100%;
          padding: 0.75rem 0.9rem;
          border-radius: 12px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          text-align: left;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .antx-thread-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-main);
        }
        .antx-thread-item.active {
          background: rgba(15, 157, 99, 0.08);
          border-color: rgba(15, 157, 99, 0.2);
          color: var(--neon-accent);
          font-weight: 700;
        }
        .antx-thread-title {
          font-size: 0.8rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .antx-delete-thread-btn {
          background: transparent;
          border: none;
          color: rgba(239, 68, 68, 0.6);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .antx-delete-thread-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        
        @media (max-width: 1024px) {
          .antx-header {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 768px) {
          .antx-terminal-container {
            padding: 1rem;
            height: 100% !important;
            box-sizing: border-box;
          }
          .antx-header {
            flex-direction: column;
            align-items: stretch;
            margin-bottom: 1rem;
            gap: 0.75rem;
          }
          .antx-title {
            font-size: 1.8rem;
            text-align: left;
          }
          .antx-title-sub {
            text-align: left;
            font-size: 0.8rem;
          }
          .antx-mode-selector {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
          .antx-mode-selector button {
            flex: 1;
            padding: 0.6rem 0.8rem !important;
            font-size: 0.75rem !important;
            text-align: center;
          }
          .antx-status-badge {
            display: none !important;
          }
          .antx-chat-panel {
            min-height: 0;
            box-sizing: border-box;
          }
          .antx-chat-main {
            padding: 1rem !important;
          }
          .antx-input-bar {
            margin-top: 1rem;
            gap: 0.5rem;
          }
          .antx-input-bar input {
            padding: 0.8rem 1rem !important;
            font-size: 0.85rem !important;
          }
          .antx-input-bar button {
            height: 50px !important;
            padding: 0 1rem !important;      
          }
          .antx-input-bar button:nth-of-type(1) {
            width: 50px !important;
          }
          .antx-orb {
            width: 180px;
            height: 180px;
          }
          .antx-orb-emoji {
            font-size: 6rem;
          }

          /* Mobile Sidebar slide drawer absolute positioning */
          .antx-sidebar {
            position: absolute;
            left: -280px;
            top: 0;
            bottom: 0;
            width: 260px;
            background: var(--bg-card) !important;
            border-right: 1px solid var(--glass-border);
            box-shadow: 10px 0 30px rgba(0, 0, 0, 0.15);
            padding: 1.5rem 1rem;
          }
          .antx-sidebar.open {
            left: 0;
            width: 260px;
            opacity: 1;
          }
        }
      `}</style>
      
      {/* Header */}
      <div className="antx-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'left' }}>
             <h1 className="antx-title">Ant X <span style={{ color: '#0f9d63' }}>Terminal</span></h1>
             <p className="antx-title-sub">Direct access to the Neural Inventory Engine</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="glass-panel antx-mode-selector">
             <button 
               onClick={() => { setInteractionMode('text'); setIsVoiceActive(false); }} 
               style={{ 
                 padding: '0.8rem 1.5rem', borderRadius: '50px', border: 'none', cursor: 'pointer',
                 background: interactionMode === 'text' ? '#0f9d63' : 'transparent',
                 color: interactionMode === 'text' ? '#ffffff' : '#64748b',
                 fontWeight: 'bold', fontSize: '0.8rem', transition: '0.3s'
               }}
             >⌨️ TEXT MODE</button>
             <button 
               onClick={() => startVoice()} 
               style={{ 
                 padding: '0.8rem 1.5rem', borderRadius: '50px', border: 'none', cursor: 'pointer',
                 background: interactionMode === 'talk' ? '#0f9d63' : 'transparent',
                 color: interactionMode === 'talk' ? '#ffffff' : '#64748b',
                 fontWeight: 'bold', fontSize: '0.8rem', transition: '0.3s'
               }}
             >🎙️ TALK MODE</button>
          </div>
          
          <div className="glass-panel antx-status-badge">
             <div style={{ width: 8, height: 8, background: '#0f9d63', borderRadius: '50%', boxShadow: '0 0 10px rgba(15, 157, 99, 0.5)' }}></div>
             <span style={{ fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', color: '#64748b' }}>CORE_LINK_ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden', zIndex: 10 }}>
        {interactionMode === 'text' ? (
          <div className="glass-panel antx-chat-panel">
            
            {/* Sidebar is now nested INSIDE the white card chat-panel */}
            <div className={`antx-sidebar ${isSidebarOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
              <button onClick={handleNewChat} className="antx-new-chat-btn">
                <Plus size={16} /> New Chat
              </button>
              <div className="antx-threads-scroll hide-scrollbar">
                {isLoading ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1.5rem 1rem', textAlign: 'center' }}>
                    Linking Core...
                  </div>
                ) : (
                  threads.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => { setActiveThreadId(t.id); setIsSidebarOpen(false); }}
                      className={`antx-thread-item ${t.id === activeThreadId ? 'active' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <MessageSquare size={14} style={{ flexShrink: 0 }} />
                        <span className="antx-thread-title">{t.title}</span>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteThread(t.id, e)} 
                        className="antx-delete-thread-btn"
                        title="Delete Chat"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Overlay Backdrop for Mobile sidebar drawer */}
            {isSidebarOpen && (
              <div 
                onClick={() => setIsSidebarOpen(false)} 
                style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', zIndex: 40 }}
                className="md:hidden"
              ></div>
            )}

            {/* Main Chat Conversation Container inside the card */}
            <div className="antx-chat-main">
               {/* Clean top-bar inside the container card */}
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', textAlign: 'left' }}>
                 <button 
                   onClick={toggleSidebar}
                   className="glass-panel text-slate-500 hover:text-emerald-600 cursor-pointer border-none"
                   style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
                   title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                 >
                   <Menu size={18} />
                 </button>
               </div>

               <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '10px' }} className="hide-scrollbar">
                  {currentMessages.map((m, i) => (
                    <div key={i} style={{ 
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%', padding: '1rem 1.5rem', borderRadius: '16px',
                      background: m.role === 'user' ? 'var(--neon-accent)' : 'var(--bg-card)',
                      color: m.role === 'user' ? 'var(--bg-dark)' : 'var(--text-main)',
                      border: m.role === 'ai' ? '1px solid var(--glass-border)' : 'none',
                      boxShadow: m.role === 'ai' ? '0 2px 8px rgba(0,0,0,0.02)' : 'none',
                      animation: 'slideUp 0.3s ease',
                      textAlign: 'left'
                    }}>{m.text}</div>
                  ))}
                  {isThinking && <div style={{ color: 'var(--neon-accent)', fontStyle: 'italic', textAlign: 'left', fontSize: '0.85rem' }}>Ant X is processing...</div>}
               </div>

               <div className="antx-input-bar">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a neural command..."
                    style={{ flex: 1, minWidth: 0, padding: '1.2rem 1.5rem', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: '16px', color: 'var(--text-main)', outline: 'none', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                  />
                  <button onClick={() => setIsVoiceActive(!isVoiceActive)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: isVoiceActive ? '#ef4444' : 'var(--neon-accent)', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     {isVoiceActive ? '🛑' : '🎙️'}
                  </button>
                  <button onClick={() => handleSend()} className="btn-primary" style={{ height: '60px', padding: '0 2rem', background: 'var(--neon-accent)', color: 'var(--bg-dark)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0 }}>Send 🚀</button>
               </div>
            </div>

          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '2rem', padding: '1rem', height: '100%', boxSizing: 'border-box' }}>
             <div style={{ position: 'relative' }}>
                <div 
                  className="antx-orb"
                  style={{ 
                    background: 'radial-gradient(circle, var(--neon-accent) 0%, transparent 70%)',
                    boxShadow: isVoiceActive ? '0 0 100px var(--neon-accent)' : '0 0 40px rgba(15, 157, 99, 0.2)',
                    animation: isVoiceActive ? 'orb-pulse 1s infinite alternate ease-in-out' : 'orb-float 3s infinite ease-in-out',
                  }}
                >
                   <div className="antx-orb-emoji" style={{ animation: isThinking ? 'spin 2s linear infinite' : 'none' }}>🐜</div>
                </div>
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '120%', border: '1px solid rgba(15, 157, 99, 0.2)', borderRadius: '50%', animation: 'spin 10s linear infinite' }}></div>
             </div>

             <div style={{ maxWidth: '600px', width: '100%' }}>
                <h2 style={{ fontSize: '1.75rem', color: isVoiceActive ? 'var(--neon-accent)' : 'var(--text-main)', margin: '0 0 1rem 0' }}>
                   {isVoiceActive ? 'Ant X Neural Link Active...' : 'Neural Core Standby'}
                </h2>
                <div style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '20px', minHeight: '80px', color: 'var(--text-muted)', fontSize: '1.1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                   {globalTranscript ? `"${globalTranscript}"` : (isVoiceActive ? 'Listening...' : 'Mode initialized.')}
                </div>
                {currentMessages.length > 0 && currentMessages[currentMessages.length-1].role === 'ai' && !isVoiceActive && (
                   <div style={{ marginTop: '1.5rem', color: 'var(--neon-accent)', fontWeight: '600' }}>
                      {currentMessages[currentMessages.length-1].text}
                   </div>
                )}
             </div>
          </div>
        )}
      </div>

      <div className="neural-wave"></div>
      <div className="neural-wave neural-wave-2"></div>
    </div>
  );
}
