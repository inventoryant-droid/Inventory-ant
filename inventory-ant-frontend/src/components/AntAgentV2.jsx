import React, { useState, useRef, useEffect } from 'react';

// A helper to clean text so TTS engines don't spell out weird characters or JSON
function sanitizeTextForSpeech(text) {
  if (!text) return "";
  // Remove markdown, JSON, and special symbols
  let clean = text.replace(/[*#_\[\]{}]/g, ''); 
  // Convert all-caps acronyms to lowercase for smoother TTS
  clean = clean.replace(/([A-Z]{2,})/g, (match) => match.toLowerCase());
  // Limit length for Google TTS stability
  return clean.trim().substring(0, 200);
}

export default function AntAgentV2({ userId, token, onUpdate, onNavigate, onLogin, currentView, isTerminalView, sharedState }) {
  const { isVoiceActive, setIsVoiceActive, setGlobalTranscript, setGlobalAiResponse, setGlobalStatus } = sharedState;

  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('');
  const [transcript, setTranscript] = useState('');
  const [aiResponseText, setAiResponseText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [manualText, setManualText] = useState('');
  
  const recognitionRef = useRef(null);
  const continuousRef = useRef(isVoiceActive);
  const audioRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isStartingRef = useRef(false);
  const isThinkingRef = useRef(false);

  // Sync internal continuous ref with global state
  // Sync local states to global shared states for Terminal visibility
  useEffect(() => {
    setGlobalTranscript(transcript);
    setGlobalAiResponse(aiResponseText);
    setGlobalStatus(status);
  }, [transcript, aiResponseText, status]);

  // Sync internal continuous ref with global state
  useEffect(() => {
    continuousRef.current = isVoiceActive;
    if (isVoiceActive) {
      if (!isListening && !isSpeakingRef.current && !isStartingRef.current && !isThinkingRef.current) {
        startListening(false);
      }
    } else {
      setIsListening(false);
      setStatus('');
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
    }
  }, [isVoiceActive]);

  // Handle Global Activation Event (User Gesture)
  useEffect(() => {
    const handleGlobalActivate = () => {
      console.log("👆 Global Trigger: Starting Ant X Link...");
      startListening(false);
    };
    window.addEventListener('ANT_X_ACTIVATE', handleGlobalActivate);
    return () => window.removeEventListener('ANT_X_ACTIVATE', handleGlobalActivate);
  }, []);

  // Voice Watchdog: Keep-alive for continuous mode
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (isVoiceActive && !isListening && !isSpeakingRef.current && !isStartingRef.current && !isThinkingRef.current) {
        console.log("🛠️ Watchdog: Resuming Link...");
        startListening(true); // Auto restart
      }
    }, 2000);
    return () => clearInterval(watchdog);
  }, [isVoiceActive, isListening]);

  // Voice core logic

  const speak = (text) => {
    if (!audioRef.current) return;
    
    const cleanText = sanitizeTextForSpeech(text);
    if (!cleanText) return;

    console.log("🔊 Ant X Speaking:", cleanText);

    // Stop any current playback
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    // Use Backend Proxy for Google TTS
    const url = `http://localhost:3000/api/user/products/tts?text=${encodeURIComponent(cleanText)}&t=${Date.now()}`;
    
    audioRef.current.src = url;
    audioRef.current.load(); // Explicitly load the new source

    audioRef.current.onended = () => {
      console.log("🔇 Ant X Finished Speaking");
      isSpeakingRef.current = false;
      if (continuousRef.current) {
        // Short delay to avoid feedback
        setTimeout(() => startListening(true), 500);
      }
    };

    setTimeout(() => {
      isSpeakingRef.current = true;
      audioRef.current.play()
        .then(() => console.log("▶️ Audio playing successfully"))
        .catch(e => {
          console.error("❌ Audio play failed:", e);
          isSpeakingRef.current = false;
          setStatus("Click screen to enable voice! 🔊");
          if (continuousRef.current) setTimeout(() => startListening(true), 1000);
        });
    }, 50);
  };

  const handleCommand = async (text) => {
    if (!text || text.trim() === '') return;
    try {
      isThinkingRef.current = true;
      setStatus('Ant X is Thinking... 🤔');
      window.dispatchEvent(new CustomEvent('ANT_X_THINKING', { detail: { value: true } }));
      window.dispatchEvent(new CustomEvent('ANT_X_VOICE_COMMAND', { detail: { text } }));

      const res = await fetch('http://localhost:3000/api/user/products/agent-command-v2', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, currentView })
      });
      
      const data = await res.json();
      
      if (data.success) {
        const speech = data.speechText || data.message;
        setAiResponseText(speech);
        window.dispatchEvent(new CustomEvent('ANT_X_VOICE_RESPONSE', { detail: { text: speech } }));
        speak(speech);
        if (onUpdate && data.shouldUpdateUI) onUpdate();
        if (onNavigate && data.action === 'NAVIGATE' && data.page) {
          console.log("🚀 Ant X: Preparing to navigate to", data.page);
          // Small delay to ensure speech starts properly
          setTimeout(() => {
            console.log("✈️ Ant X: Navigating now!");
            onNavigate(data.page);
          }, 600);
        }
        if (data.action === 'LOGIN' && data.loginId) {
          if (onLogin) onLogin(data.loginId);
        }
      } else {
        const errorSpeech = data.message || "Kuch error aa gaya.";
        setAiResponseText(errorSpeech);
        window.dispatchEvent(new CustomEvent('ANT_X_VOICE_RESPONSE', { detail: { text: errorSpeech } }));
        continuousRef.current = false;
        speak(errorSpeech);
      }
    } catch (err) {
      const connErr = "Server se connect nahi ho paya.";
      setAiResponseText(connErr);
      window.dispatchEvent(new CustomEvent('ANT_X_VOICE_RESPONSE', { detail: { text: connErr } }));
      continuousRef.current = false;
      speak(connErr);
    }
    isThinkingRef.current = false;
    window.dispatchEvent(new CustomEvent('ANT_X_THINKING', { detail: { value: false } }));
    setTimeout(() => {
      setStatus('');
      setManualText('');
    }, 800);
  };

  const toggleListening = () => {
    if (audioRef.current) {
        audioRef.current.play().then(() => audioRef.current.pause()).catch(() => {});
    }

    if (isVoiceActive) {
      continuousRef.current = false;
      setIsVoiceActive(false);
      setIsListening(false);
      setStatus('');
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
    } else {
      setIsVoiceActive(true);
      continuousRef.current = true;
      startListening(false);
    }
  };

  const startListening = (isAuto = false) => {
    if (!isAuto && audioRef.current) {
      audioRef.current.play().catch(e=>{});
      audioRef.current.pause();
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Aapka browser voice recognition support nahi karta. Kripya type karein.");
      setShowInput(true);
      return;
    }

    if (!isAuto) {
      continuousRef.current = true;
    }

    if (isListening || isStartingRef.current) return;
    if (isAuto && !continuousRef.current) return;

    isStartingRef.current = true;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN'; 
    recognition.continuous = false;
    recognition.interimResults = true; // Real-time feedback

    recognition.onstart = () => { 
      isStartingRef.current = false;
      setIsListening(true); 
      setStatus('Listening... 🎙️'); 
      setTranscript('');
      setAiResponseText(''); 
    };

    let finalHandled = false;
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      
      setTranscript(final || interim);

      if (final && !finalHandled) {
        finalHandled = true;
        setStatus('Processing... 🐜');
        recognition.stop();
        handleCommand(final);
      }
    };

    recognition.onerror = (e) => { 
      console.error("Mic Error:", e.error);
      isStartingRef.current = false;
      setIsListening(false);
      if (e.error === 'not-allowed') {
          setStatus('Mic permission denied.');
          setIsVoiceActive(false);
      }
      // Removed duplicate restart here because onend ALWAYS fires after onerror.
    };

    recognition.onend = () => {
      isStartingRef.current = false;
      setIsListening(false);
      // If we finished because of silence and still in voice mode, restart
      // DO NOT restart if we are speaking OR thinking (waiting for AI response)
      if (continuousRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
          setTimeout(() => startListening(true), 300);
      }
    };

    try { recognition.start(); } catch(e) {
        isStartingRef.current = false;
        console.error("Recognition Start Fail:", e);
    }
  };

  // Hide floating UI if in Terminal View (since Terminal has its own orb)
  if (isTerminalView && !showInput) return (
    <audio ref={audioRef} style={{ display: 'none' }} preload="auto" crossOrigin="anonymous" />
  );

  return (
    <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
      <audio ref={audioRef} style={{ display: 'none' }} preload="auto" crossOrigin="anonymous" />
      
      {(status || aiResponseText || transcript || showInput) && (
        <div className="glass-panel" style={{ 
          background: 'rgba(15, 23, 42, 0.95)', 
          backdropFilter: 'blur(20px)',
          padding: '1.2rem', 
          borderRadius: '24px', 
          width: '320px', 
          boxShadow: isListening ? '0 0 30px rgba(16, 185, 129, 0.2)' : '0 20px 40px rgba(0,0,0,0.5)',
          borderBottomRightRadius: '4px',
          border: isListening ? '1px solid #10B981' : '1px solid var(--glass-border)',
          animation: 'slideUp 0.3s ease'
        }}>
          {isVoiceActive && (
            <div style={{ fontSize: '0.65rem', color: isListening ? '#10B981' : 'var(--neon-accent)', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 6, height: 6, background: isListening ? '#10B981' : 'var(--neon-accent)', borderRadius: '50%', boxShadow: '0 0 10px ' + (isListening ? '#10B981' : 'var(--neon-accent)') }}></span> 
              ANT X NEURAL LINK ACTIVE
            </div>
          )}

          {transcript && <div style={{ fontSize: '0.75rem', color: isListening ? '#10B981' : 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', fontStyle: 'italic' }}>" {transcript} "</div>}
          
          <div style={{ fontWeight: '600', color: isListening ? '#10B981' : (status ? 'var(--neon-accent)' : 'white'), fontSize: '1.05rem', lineHeight: '1.4' }}>
            {status || aiResponseText || "Namaste, Main Ant X hoon!"}
          </div>

          {showInput && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={manualText} 
                onChange={e => setManualText(e.target.value)}
                placeholder="Type command..."
                onKeyDown={e => e.key === 'Enter' && handleCommand(manualText)}
                style={{ flex: 1, padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '12px', border: '1px solid var(--glass-border)', fontSize: '0.85rem', outline: 'none' }}
              />
              <button onClick={() => handleCommand(manualText)} className="btn-primary" style={{ padding: '0.6rem' }}>🚀</button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
         <button 
          onClick={() => setShowInput(!showInput)}
          style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', cursor: 'pointer', color: 'white' }}
         >⌨️</button>

         <div style={{ position: 'relative' }}>
            {isListening && <div className="green-wave"></div>}
            <button 
              onClick={toggleListening}
              style={{
                width: '75px', height: '75px', borderRadius: '50%',
                background: isListening ? '#10B981' : 'var(--neon-accent)', 
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem', boxShadow: isListening ? '0 0 40px rgba(16, 185, 129, 0.6)' : '0 10px 25px var(--neon-accent)',
                transition: '0.3s', position: 'relative', zIndex: 10
              }}
            >
              {isListening ? '🟢' : '🐜'}
            </button>
         </div>
      </div>

      <style>{`
        @keyframes wave-expand {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .green-wave {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border: 4px solid #10B981;
          border-radius: 50%;
          animation: wave-expand 1.5s infinite;
          z-index: 1;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
