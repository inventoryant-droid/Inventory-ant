import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AIService } from '../services/aiService';
import { SubscriptionService } from '../services/subscriptionService';
import { 
  MessageSquare, Mic, Scan, History, PieChart as UsageIcon, 
  Send, Trash2, Plus, Search, Loader2, Sparkles, UploadCloud, 
  Camera, Check, AlertTriangle, RefreshCw, X, Play, Volume2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import '../App.css';

// Basic Markdown / HTML formatting helper
const formatMarkdown = (text) => {
  if (!text) return '';
  let formatted = text;
  // Bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Bullet lists
  formatted = formatted.replace(/^\s*-\s+(.*?)$/gm, '<li class="ml-4 list-disc">$1</li>');
  // Inline Code
  formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-slate-100 text-[#e11d48] px-1 rounded font-mono text-xs">$1</code>');
  // Tables converter (basic markdown table conversion)
  const rows = formatted.split('\n');
  let inTable = false;
  let tableHtml = '';
  
  const processedRows = rows.map(row => {
    if (row.trim().startsWith('|')) {
      const cols = row.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (!inTable) {
        inTable = true;
        tableHtml = '<table class="min-w-full border border-slate-200 text-xs text-left bg-white my-3 rounded-lg overflow-hidden">';
        tableHtml += '<thead class="bg-slate-50 border-b border-slate-200"><tr>' + cols.map(c => `<th class="p-2 font-bold">${c}</th>`).join('') + '</tr></thead><tbody>';
        return '';
      } else {
        if (cols[0]?.includes('---') || cols[0]?.includes('===')) return ''; // separator line
        tableHtml += '<tr class="border-b border-slate-100">' + cols.map(c => `<td class="p-2 font-medium">${c}</td>`).join('') + '</tr>';
        return '';
      }
    } else {
      if (inTable) {
        inTable = false;
        const completeTable = tableHtml + '</tbody></table>';
        tableHtml = '';
        return completeTable + '<br/>' + row;
      }
    }
    return row;
  });
  
  formatted = processedRows.join('\n');
  return formatted;
};

export default function AITools({ userId, token, onScanResult }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'voice' | 'scanner' | 'history' | 'usage'

  // --- QUERY CLIENT SUBSCRIPTION TIER CHECKS ---
  const { data: subData } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: SubscriptionService.getCurrentSubscription,
  });
  const { data: usages } = useQuery({
    queryKey: ['userUsages'],
    queryFn: SubscriptionService.getUserUsages,
  });

  // ==========================================
  // TAB A: AI CONVERSATIONAL CHAT
  // ==========================================
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [chatSearch, setChatSearch] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const { data: threads, isLoading: threadsLoading, refetch: refetchThreads } = useQuery({
    queryKey: ['chatThreads'],
    queryFn: AIService.getChatThreads,
    enabled: activeTab === 'chat',
  });

  const activeThread = threads?.find(t => t.id === activeThreadId) || threads?.[0];

  useEffect(() => {
    if (activeThread && !activeThreadId) {
      setActiveThreadId(activeThread.id);
    }
  }, [activeThread, activeThreadId]);

  // Create chat session mutation
  const createThreadMutation = useMutation({
    mutationFn: () => AIService.createChatThread(`Session ${new Date().toLocaleDateString()}`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] });
      setActiveThreadId(data.id);
      toast.success('New session created');
    }
  });

  // Delete chat session mutation
  const deleteThreadMutation = useMutation({
    mutationFn: (id) => AIService.deleteChatThread(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] });
      setActiveThreadId(null);
      toast.success('Session deleted');
    }
  });

  // Send message mutation
  const messageMutation = useMutation({
    mutationFn: (payload) => AIService.sendAgentCommand(payload),
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] });
      queryClient.invalidateQueries({ queryKey: ['userUsages'] });
      setIsTyping(false);
      setUserPrompt('');
      if (data.products && onScanResult) onScanResult();
    },
    onError: (err) => {
      setIsTyping(false);
      toast.error(err.message || 'AI message command failed');
    }
  });

  const handleSendMessage = () => {
    if (!userPrompt.trim() || !activeThreadId) return;
    messageMutation.mutate({
      text: userPrompt.trim(),
      isVoice: false,
      threadId: activeThreadId,
    });
  };

  // Filtered threads list
  const filteredThreads = threads?.filter(t => t.title.toLowerCase().includes(chatSearch.toLowerCase())) || [];

  // ==========================================
  // TAB B: HINGLISH VOICE ASSISTANT
  // ==========================================
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Standby');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('');
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Check Speech Recognition capability
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'hi-IN'; // Hinglish friendly (Hindi input supports phonetic english blend)

      rec.onstart = () => {
        setIsVoiceActive(true);
        setVoiceStatus('Listening...');
        setVoiceTranscript('');
      };

      rec.onerror = (e) => {
        console.error(e);
        setVoiceStatus('Error recognizing speech');
        setIsVoiceActive(false);
      };

      rec.onend = () => {
        setIsVoiceActive(false);
      };

      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscript(text);
        setVoiceStatus('Processing command...');
        
        // Post command directly to voice channel
        voiceCommandMutation.mutate({
          text,
          isVoice: true,
        });
      };

      setRecognition(rec);
    }
  }, []);

  const voiceCommandMutation = useMutation({
    mutationFn: (payload) => AIService.sendAgentCommand(payload),
    onSuccess: (data) => {
      setVoiceResponse(data.response);
      setVoiceStatus('Completed');
      queryClient.invalidateQueries({ queryKey: ['userUsages'] });
      if (data.products && onScanResult) onScanResult();
      
      // Speak Hinglish response TTS
      if (data.speechText && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(data.speechText);
        // Find a natural local hindi/english voice if present
        const voices = window.speechSynthesis.getVoices();
        const hiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
        if (hiVoice) utter.voice = hiVoice;
        utter.pitch = 1.0;
        utter.rate = 1.05;
        window.speechSynthesis.speak(utter);
      }
    },
    onError: (err) => {
      setVoiceStatus('Failed');
      toast.error(err.message || 'Voice command processing failed');
    }
  });

  const toggleVoiceAssistant = () => {
    if (!recognition) {
      toast.error('Browser Speech API not supported on this client.');
      return;
    }
    if (isVoiceActive) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  // ==========================================
  // TAB C: SMART SCANNER WORKSPACE
  // ==========================================
  const [scanFile, setScanFile] = useState(null);
  const [scanType, setScanType] = useState('IN'); // 'IN' | 'OUT'
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [ocrItems, setOcrItems] = useState([]);
  const [isSavingScan, setIsSavingScan] = useState(false);
  
  // Camera variables
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      toast.error('Unable to access device camera');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64 = canvas.toDataURL('image/jpeg');
      const blobBin = atob(base64.split(',')[1]);
      const arr = [];
      for (let i = 0; i < blobBin.length; i++) arr.push(blobBin.charCodeAt(i));
      const fileBlob = new Blob([new Uint8Array(arr)], { type: 'image/jpeg' });
      const captured = new File([fileBlob], `camera_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      setScanFile(captured);
      stopCamera();
    }
  };

  const handleBillScan = () => {
    if (!scanFile) return;
    setIsScanning(true);
    setScanProgress(20);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Str = e.target.result.split(',')[1];
      try {
        setScanProgress(60);
        const data = await AIService.scanBill({
          fileName: scanFile.name,
          fileType: scanFile.type,
          base64Image: base64Str,
          actionType: scanType,
          parseOnly: true,
        });
        setScanProgress(100);
        if (data.success && data.parsedItems) {
          setOcrItems(data.parsedItems);
        } else {
          toast.error(data.message || 'AI scanner unable to parse details');
        }
      } catch (err) {
        toast.error(err.message || 'Scan connection timeout');
      } finally {
        setIsScanning(false);
        setScanProgress(0);
      }
    };
    reader.readAsDataURL(scanFile);
  };

  const handleConfirmSync = async () => {
    if (ocrItems.length === 0) return;
    setIsSavingScan(true);
    try {
      const res = await AIService.confirmBill({
        actionType: scanType,
        items: ocrItems,
      });
      if (res.success) {
        toast.success('Inventory quantities synced successfully!');
        setOcrItems([]);
        setScanFile(null);
        queryClient.invalidateQueries({ queryKey: ['userUsages'] });
        queryClient.invalidateQueries({ queryKey: ['scanHistory'] });
        if (onScanResult) onScanResult();
      } else {
        toast.error(res.message || 'Sync failed');
      }
    } catch (e) {
      toast.error('Sync failed');
    } finally {
      setIsSavingScan(false);
    }
  };

  // ==========================================
  // TAB D: DISPATCHED SMART SCAN LOGS
  // ==========================================
  const { data: scanHistory } = useQuery({
    queryKey: ['scanHistory'],
    queryFn: AIService.getScanHistory,
    enabled: activeTab === 'history',
  });

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC] flex flex-col space-y-6">
      
      {/* HEADER PANELS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left border-b border-slate-200 pb-5">
        <div>
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-emerald-600">
            Cognitive AI Lab
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1 m-0">
            Integrated smart automation workspace. Autonomously manage stock lines.
          </p>
        </div>

        {/* WORKSPACE TAB SELECTOR */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
          {[
            { id: 'chat', label: 'AI Chat', icon: <MessageSquare size={14} /> },
            { id: 'voice', label: 'Voice Link', icon: <Mic size={14} /> },
            { id: 'scanner', label: 'Smart Scanner', icon: <Scan size={14} /> },
            { id: 'history', label: 'Scan Logs', icon: <History size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 flex-1 md:flex-initial justify-center ${
                activeTab === tab.id 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'bg-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB CONTENTS ─── */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col">
        
        {/* ==========================================
            TAB 1: CHAT CLIENT
           ========================================== */}
        {activeTab === 'chat' && (
          <div className="flex flex-1 divide-x divide-slate-100 min-h-0 h-[600px] overflow-hidden">
            {/* Sidebar Threads List */}
            <div className="w-64 shrink-0 bg-slate-50/50 flex flex-col p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Sessions</span>
                <button 
                  onClick={() => createThreadMutation.mutate()}
                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg border-none cursor-pointer"
                  title="New Session"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Thread Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search sessions..." 
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none"
                />
              </div>

              {/* Threads Scrolling container */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {threadsLoading ? (
                  <div className="text-slate-400 text-xs py-4 flex items-center justify-center gap-1.5">
                    <Loader2 className="animate-spin" size={14} /> Loading...
                  </div>
                ) : filteredThreads.map(thread => (
                  <div 
                    key={thread.id}
                    onClick={() => setActiveThreadId(thread.id)}
                    className={`p-3 rounded-xl flex items-center justify-between text-left cursor-pointer transition-all ${
                      activeThreadId === thread.id 
                        ? 'bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold' 
                        : 'bg-white hover:bg-slate-50 border border-slate-100 text-slate-600'
                    }`}
                  >
                    <span className="truncate text-xs flex-1">{thread.title}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteThreadMutation.mutate(thread.id);
                      }}
                      className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded border-none bg-transparent cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#FBFDFB]">
              {/* Message scroll container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeThread?.messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm text-left shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-tr-none'
                        : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none leading-relaxed'
                    }`}>
                      <div 
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }}
                        className="prose prose-sm max-w-none prose-slate"
                      />
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-1.5 shadow-sm text-slate-400 text-xs">
                      <Loader2 className="animate-spin" size={14} /> Ant Agent is writing...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input form */}
              <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ask Ant: e.g. Show me out of stock products / stock in 10 items"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={messageMutation.isPending}
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl outline-none text-xs sm:text-sm"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={messageMutation.isPending || !userPrompt.trim()}
                  className="py-3 px-5 bg-[#0f9d63] hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-2xl border-none cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: VOICE ASSISTANT
           ========================================== */}
        {activeTab === 'voice' && (
          <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[450px] space-y-8 bg-slate-50/30 flex-1">
            <div className="text-center space-y-2 max-w-md">
              <h3 className="m-0 text-lg font-black text-slate-800 flex items-center justify-center gap-1.5">
                <Sparkles size={18} className="text-emerald-500 animate-pulse" /> Hinglish Voice Link
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed m-0">
                Tap the microphone to speak a command. Mixer of Hindi & English is supported. E.g. "Low stock items report dikhao."
              </p>
            </div>

            {/* Glowing Microphone Button */}
            <div className="relative">
              {isVoiceActive && (
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping scale-150" />
              )}
              <button 
                onClick={toggleVoiceAssistant}
                className={`w-28 h-28 rounded-full border-none cursor-pointer transition-all duration-300 flex items-center justify-center shadow-lg relative z-10 ${
                  isVoiceActive 
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-300/40' 
                    : 'bg-[#0f9d63] hover:bg-emerald-700 text-white shadow-emerald-200/50'
                }`}
              >
                <Mic size={40} className={isVoiceActive ? 'animate-pulse' : ''} />
              </button>
            </div>

            {/* Transcript & Logs */}
            <div className="w-full max-w-lg space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center min-h-[50px] flex items-center justify-center text-xs sm:text-sm font-semibold text-slate-700 font-mono shadow-sm">
                Status: {voiceStatus}
              </div>
              
              {voiceTranscript && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Speech:</span>
                  <p className="m-0 text-sm font-medium text-slate-800 mt-1">"{voiceTranscript}"</p>
                </div>
              )}

              {voiceResponse && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-left flex items-start gap-2.5">
                  <Volume2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Ant Response:</span>
                    <p className="m-0 text-sm font-bold text-slate-800 mt-1">{voiceResponse}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: SMART SCANNER FLOW
           ========================================== */}
        {activeTab === 'scanner' && (
          <div className="p-6 md:p-8 space-y-6 text-left flex-1 bg-slate-50/10 overflow-y-auto">
            
            {/* Upload Area & Camera split */}
            {ocrItems.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Drag and Drop box */}
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-emerald-500 transition-colors">
                  <UploadCloud size={48} className="text-slate-400" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 m-0">Upload Supplier Invoices / Bills</h4>
                    <p className="text-slate-400 text-xs mt-1 m-0">Supports JPG, PNG images</p>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => setScanType('IN')}
                      className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        scanType === 'IN' ? 'bg-[#0f9d63] border-[#0f9d63] text-white shadow' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Stock Inbound
                    </button>
                    <button 
                      onClick={() => setScanType('OUT')}
                      className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        scanType === 'OUT' ? 'bg-red-500 border-red-500 text-white shadow' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Stock Outbound
                    </button>
                  </div>

                  <input 
                    type="file" 
                    id="scan_file_selector"
                    accept="image/*"
                    onChange={(e) => setScanFile(e.target.files[0])}
                    className="hidden"
                  />
                  <button 
                    onClick={() => document.getElementById('scan_file_selector').click()}
                    className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border-none cursor-pointer transition-colors"
                  >
                    Choose Image File
                  </button>

                  {scanFile && (
                    <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl w-full flex items-center justify-between text-xs font-medium">
                      <span className="truncate max-w-[80%]">{scanFile.name}</span>
                      <button 
                        onClick={() => handleBillScan()}
                        disabled={isScanning}
                        className="py-1.5 px-3 bg-[#0f9d63] hover:bg-emerald-700 text-white border-none rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                      >
                        {isScanning ? <Loader2 className="animate-spin" size={10} /> : <Play size={10} />} Run OCR Scan
                      </button>
                    </div>
                  )}
                </div>

                {/* Device Camera interface */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                  {cameraActive ? (
                    <div className="w-full relative rounded-2xl overflow-hidden aspect-video bg-slate-950 border">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                        <button 
                          onClick={capturePhoto}
                          className="py-2 px-5 bg-white text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-1 shadow-md"
                        >
                          <Camera size={14} /> Snap Photo
                        </button>
                        <button 
                          onClick={stopCamera}
                          className="py-2 px-5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-bold border-none cursor-pointer shadow-md"
                        >
                          Close Stream
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Camera size={48} className="text-slate-400" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-700 m-0">Use Device Camera</h4>
                        <p className="text-slate-400 text-xs mt-1 m-0">Snap invoice directly from scanner</p>
                      </div>
                      <button 
                        onClick={startCamera}
                        className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border-none cursor-pointer transition-colors"
                      >
                        Start Camera Stream
                      </button>
                    </>
                  )}
                </div>

              </div>
            ) : (
              // Review parsed OCR products list
              <div className="space-y-4 bg-white border border-slate-200 p-6 rounded-3xl">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="m-0 text-base font-extrabold text-slate-800">Verify OCR Parsing Results</h3>
                    <p className="text-slate-400 text-xs mt-0.5 m-0">Adjust parsed quantities before committing sync to database.</p>
                  </div>
                  <button 
                    onClick={() => { setOcrItems([]); setScanFile(null); }}
                    className="p-1 hover:bg-slate-100 rounded border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {ocrItems.map((item, idx) => (
                    <div key={idx} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block text-sm">{item.name}</span>
                        <span className="text-slate-400 text-[10px] uppercase tracking-wide">ID: {item.productId || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="space-y-1 text-left">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Quantity</label>
                          <input 
                            type="number"
                            value={item.quantity || 0}
                            onChange={(e) => {
                              const updated = [...ocrItems];
                              updated[idx].quantity = parseInt(e.target.value, 10) || 0;
                              setOcrItems(updated);
                            }}
                            className="w-20 p-2 bg-slate-50 border rounded-lg text-center outline-none font-bold"
                          />
                        </div>
                        <div className="space-y-1 text-left">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Unit Price (MRP)</label>
                          <input 
                            type="text"
                            value={item.mrp || '0'}
                            onChange={(e) => {
                              const updated = [...ocrItems];
                              updated[idx].mrp = e.target.value;
                              setOcrItems(updated);
                            }}
                            className="w-24 p-2 bg-slate-50 border rounded-lg text-center outline-none font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button 
                    onClick={() => { setOcrItems([]); setScanFile(null); }}
                    className="py-2.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl border-none cursor-pointer transition-colors"
                  >
                    Discard Scan
                  </button>
                  <button 
                    onClick={() => handleConfirmSync()}
                    disabled={isSavingScan}
                    className="py-2.5 px-6 bg-[#0f9d63] hover:bg-emerald-700 text-white font-bold text-xs rounded-xl border-none cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    {isSavingScan && <Loader2 className="animate-spin" size={12} />}
                    Sync to Inventory
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 4: SCAN ACTION LOGS LIST
           ========================================== */}
        {activeTab === 'history' && (
          <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6 text-left">
            <h3 className="m-0 text-base font-extrabold text-slate-800">Dispatched Scan Actions</h3>
            
            <div className="space-y-3">
              {scanHistory && scanHistory.map((history) => (
                <div key={history.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block">{new Date(history.timestamp).toLocaleString()}</span>
                    <span className="font-bold text-slate-800 block text-sm mt-0.5">Bill: {history.id}</span>
                    <span className="text-slate-500 mt-1 block">Direction: <strong>{history.actionType}</strong> • Operator: {history.operatorName}</span>
                  </div>
                  <div className="bg-white p-3 border rounded-xl w-full md:w-64 max-h-24 overflow-y-auto">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Parsed Items</span>
                    {Array.isArray(history.items) ? history.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-slate-600 font-medium">
                        <span className="truncate max-w-[80%]">{item.name}</span>
                        <span className="font-bold">x{item.qty || item.quantity}</span>
                      </div>
                    )) : null}
                  </div>
                </div>
              ))}

              {(!scanHistory || scanHistory.length === 0) && (
                <div className="text-slate-400 text-center py-12">No scan history records logged.</div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
