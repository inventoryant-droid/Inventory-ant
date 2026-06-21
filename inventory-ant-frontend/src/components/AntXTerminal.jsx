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
    <div style={{ 
      padding: '2rem', 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      overflow: 'hidden',
      backgroundColor: 'var(--bg-dark)',
      backgroundImage: 'radial-gradient(circle at 10% 10%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
      color: 'var(--text-main)',
      position: 'relative'
    }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', zIndex: 10 }}>
        <div>
           <h1 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--text-main)' }}>Ant X <span style={{ color: 'var(--neon-accent)' }}>Terminal</span></h1>
           <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0', fontWeight: '500' }}>Direct access to the Neural Inventory Engine</p>
        </div>
        
        <div className="glass-panel" style={{ display: 'flex', gap: '5px', padding: '5px', borderRadius: '50px' }}>
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

        <div className="glass-panel" style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
           <div style={{ width: 8, height: 8, background: 'var(--neon-accent)', borderRadius: '50%', boxShadow: '0 0 100px var(--neon-glow)' }}></div>
           <span style={{ fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--text-main)' }}>CORE_LINK_STABLE</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden', zIndex: 10 }}>
        {interactionMode === 'text' ? (
          <div className="glass-panel" style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', padding: '2rem' }}>
             <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '10px' }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ 
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%', padding: '1rem 1.5rem', borderRadius: '16px',
                    background: m.role === 'user' ? 'var(--neon-accent)' : 'var(--bg-card)',
                    color: m.role === 'user' ? 'var(--bg-dark)' : 'var(--text-main)',
                    border: m.role === 'ai' ? '1px solid var(--glass-border)' : 'none',
                    animation: 'slideUp 0.3s ease'
                  }}>{m.text}</div>
                ))}
                {isThinking && <div style={{ color: 'var(--neon-accent)', fontStyle: 'italic' }}>Ant X is processing...</div>}
             </div>

             <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a neural command..."
                  style={{ flex: 1, padding: '1.2rem 1.5rem', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: '16px', color: 'var(--text-main)' }}
                />
                <button onClick={() => setIsVoiceActive(!isVoiceActive)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: isVoiceActive ? '#ef4444' : 'var(--neon-accent)', border: 'none', cursor: 'pointer' }}>
                   {isVoiceActive ? '🛑' : '🎙️'}
                </button>
                <button onClick={() => handleSend()} className="btn-primary" style={{ height: '60px', padding: '0 2rem', background: 'var(--neon-accent)', color: 'var(--bg-dark)', border: 'none' }}>Send 🚀</button>
             </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '3rem' }}>
             <div style={{ position: 'relative' }}>
                <div style={{ 
                  width: '300px', height: '300px', borderRadius: '50%',
                  background: 'radial-gradient(circle, var(--neon-accent) 0%, transparent 70%)',
                  boxShadow: isVoiceActive ? '0 0 100px var(--neon-accent)' : '0 0 40px var(--neon-glow)',
                  animation: isVoiceActive ? 'orb-pulse 1s infinite alternate ease-in-out' : 'orb-float 3s infinite ease-in-out',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.5s'
                }}>
                   <div style={{ fontSize: '10rem', animation: isThinking ? 'spin 2s linear infinite' : 'none' }}>🐜</div>
                </div>
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '120%', border: '1px solid var(--neon-glow)', borderRadius: '50%', animation: 'spin 10s linear infinite' }}></div>
             </div>

             <div style={{ maxWidth: '600px' }}>
                <h2 style={{ fontSize: '2rem', color: isVoiceActive ? 'var(--neon-accent)' : 'var(--text-main)' }}>
                   {isVoiceActive ? 'Ant X Neural Link Active...' : 'Neural Core Standby'}
                </h2>
                <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '20px', minHeight: '80px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '1.2rem' }}>
                   {globalTranscript ? `"${globalTranscript}"` : (isVoiceActive ? 'Listening...' : 'Mode initialized.')}
                </div>
                {messages[messages.length-1].role === 'ai' && !isVoiceActive && (
                   <div style={{ marginTop: '2rem', color: 'var(--neon-accent)', fontWeight: '600' }}>
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
