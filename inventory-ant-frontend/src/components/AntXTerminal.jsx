import { API_BASE_URL } from '../utils/config';
import React, { useState, useRef, useEffect } from 'react';

function sanitizeTextForSpeech(text) {
  if (!text) return "";
  let clean = text.replace(/[*#_\[\]{}]/g, ''); 
  clean = clean.replace(/([A-Z]{2,})/g, (match) => match.toLowerCase());
  return clean.trim().substring(0, 200);
}

export default function AntXTerminal({ userId, token, onUpdate, onNavigate, onLogin, currentView, voiceState }) {
  const { isVoiceActive, setIsVoiceActive, globalTranscript, globalAiResponse, globalStatus } = voiceState;

  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Neural Core Linked. Ant X is ready for your commands.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [interactionMode, setInteractionMode] = useState('text'); // 'text' or 'talk'
  
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startVoice = () => {
    setInteractionMode('talk');
    setIsVoiceActive(true);
    // Dispatch custom event to trigger manual start in the global agent
    window.dispatchEvent(new CustomEvent('ANT_X_ACTIVATE'));
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    const newMsgs = [...messages, { role: 'user', text }];
    setMessages(newMsgs);
    setInputText('');
    setIsThinking(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/user/products/agent-command-v2`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, currentView: 'ant_x_terminal' })
      });
      const data = await res.json();
      if (data.success) {
        const speech = data.speechText || data.message;
        setMessages([...newMsgs, { role: 'ai', text: speech }]);
        if (onUpdate && data.shouldUpdateUI) onUpdate();
        if (onNavigate && data.action === 'NAVIGATE' && data.page) onNavigate(data.page);
        if (onLogin && data.action === 'LOGIN' && data.loginId) onLogin(data.loginId);
      }
    } catch (e) {}
    setIsThinking(false);
  };

  useEffect(() => {
    const handleVoiceCommand = (e) => {
      setMessages(prev => [...prev, { role: 'user', text: e.detail.text }]);
    };
    const handleVoiceResponse = (e) => {
      setMessages(prev => [...prev, { role: 'ai', text: e.detail.text }]);
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
  }, []);

  return (
    <div className="antx-terminal-container bg-[#F8FAFC]" style={{ 
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
          max-width: 1000px; 
          display: flex; 
          flex-direction: column; 
          padding: 2rem;
          flex: 1;
          min-height: 0;
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
            text-align: center;
          }
          .antx-title-sub {
            text-align: center;
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
            padding: 1rem;
            flex: 1;
            min-height: 0;
            box-sizing: border-box;
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
        }
      `}</style>
      
      {/* Header */}
      <div className="antx-header">
        <div>
           <h1 className="antx-title">Ant X <span style={{ color: 'var(--neon-accent)' }}>Terminal</span></h1>
           <p className="antx-title-sub">Direct access to the Neural Inventory Engine</p>
        </div>
        
        <div className="glass-panel antx-mode-selector">
           <button 
             onClick={() => { setInteractionMode('text'); setIsVoiceActive(false); }} 
             style={{ 
               padding: '0.8rem 1.5rem', borderRadius: '50px', border: 'none', cursor: 'pointer',
               background: interactionMode === 'text' ? 'var(--neon-accent)' : 'transparent',
               color: interactionMode === 'text' ? 'var(--bg-dark)' : 'var(--text-main)',
               fontWeight: 'bold', fontSize: '0.8rem', transition: '0.3s'
             }}
           >⌨️ TEXT MODE</button>
           <button 
             onClick={() => startVoice()} 
             style={{ 
               padding: '0.8rem 1.5rem', borderRadius: '50px', border: 'none', cursor: 'pointer',
               background: interactionMode === 'talk' ? 'var(--neon-accent)' : 'transparent',
               color: interactionMode === 'talk' ? 'var(--bg-dark)' : 'var(--text-main)',
               fontWeight: 'bold', fontSize: '0.8rem', transition: '0.3s'
             }}
           >🎙️ TALK MODE</button>
        </div>
        
        <div className="glass-panel antx-status-badge">
           <div style={{ width: 8, height: 8, background: 'var(--neon-accent)', borderRadius: '50%', boxShadow: '0 0 100px var(--neon-glow)' }}></div>
           <span style={{ fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--text-main)' }}>CORE_LINK_STABLE</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden', zIndex: 10 }}>
        {interactionMode === 'text' ? (
          <div className="glass-panel antx-chat-panel">
             <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '10px' }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ 
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%', padding: '1rem 1.5rem', borderRadius: '16px',
                    background: m.role === 'user' ? 'var(--neon-accent)' : 'var(--bg-card)',
                    color: m.role === 'user' ? 'var(--bg-dark)' : 'var(--text-main)',
                    border: m.role === 'ai' ? '1px solid var(--glass-border)' : 'none',
                    animation: 'slideUp 0.3s ease'
                  }}>{m.text}</div>
                ))}
                {isThinking && <div style={{ color: 'var(--neon-accent)', fontStyle: 'italic' }}>Ant X is processing...</div>}
             </div>

             <div className="antx-input-bar">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a neural command..."
                  style={{ flex: 1, minWidth: 0, padding: '1.2rem 1.5rem', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: '16px', color: 'var(--text-main)', outline: 'none' }}
                />
                <button onClick={() => setIsVoiceActive(!isVoiceActive)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: isVoiceActive ? '#ef4444' : 'var(--neon-accent)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                   {isVoiceActive ? '🛑' : '🎙️'}
                </button>
                <button onClick={() => handleSend()} className="btn-primary" style={{ height: '60px', padding: '0 2rem', background: 'var(--neon-accent)', color: 'var(--bg-dark)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0 }}>Send 🚀</button>
             </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '2rem', padding: '1rem' }}>
             <div style={{ position: 'relative' }}>
                <div 
                  className="antx-orb"
                  style={{ 
                    background: 'radial-gradient(circle, var(--neon-accent) 0%, transparent 70%)',
                    boxShadow: isVoiceActive ? '0 0 100px var(--neon-accent)' : '0 0 40px var(--neon-glow)',
                    animation: isVoiceActive ? 'orb-pulse 1s infinite alternate ease-in-out' : 'orb-float 3s infinite ease-in-out',
                  }}
                >
                   <div className="antx-orb-emoji" style={{ animation: isThinking ? 'spin 2s linear infinite' : 'none' }}>🐜</div>
                </div>
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '120%', border: '1px solid var(--neon-glow)', borderRadius: '50%', animation: 'spin 10s linear infinite' }}></div>
             </div>

             <div style={{ maxWidth: '600px', width: '100%' }}>
                <h2 style={{ fontSize: '1.75rem', color: isVoiceActive ? 'var(--neon-accent)' : 'var(--text-main)', margin: '0 0 1rem 0' }}>
                   {isVoiceActive ? 'Ant X Neural Link Active...' : 'Neural Core Standby'}
                </h2>
                <div style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '20px', minHeight: '80px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                   {globalTranscript ? `"${globalTranscript}"` : (isVoiceActive ? 'Listening...' : 'Mode initialized.')}
                </div>
                {messages[messages.length-1].role === 'ai' && !isVoiceActive && (
                   <div style={{ marginTop: '1.5rem', color: 'var(--neon-accent)', fontWeight: '600' }}>
                      {messages[messages.length-1].text}
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
