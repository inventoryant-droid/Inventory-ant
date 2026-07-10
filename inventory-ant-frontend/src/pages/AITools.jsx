import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AIService } from '../services/aiService';
import { SubscriptionService } from '../services/subscriptionService';
import { 
  MessageSquare, Mic, Scan, History, PieChart as UsageIcon, 
  Send, Trash2, Plus, Search, Loader2, Sparkles, UploadCloud, 
  Camera, Check, AlertTriangle, RefreshCw, X, Play, Volume2,
  Layers, Package
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

export default function AITools({ userId, token, onScanResult, onOpenScanner }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('scanner'); // 'chat' | 'voice' | 'scanner' | 'history' | 'usage'

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
            Smart Scanner Module
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1 m-0">
            Autonomous invoice scanning & stock sync using Gemini AI.
          </p>
        </div>
      </div>

      {/* ─── TAB CONTENTS ─── */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col">
        
        {/* ==========================================
            TAB 3: SMART SCANNER FLOW
           ========================================== */}
        {activeTab === 'scanner' && (
          <div className="p-6 md:p-8 space-y-6 text-left flex-1 bg-slate-50/10 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Inbound Scanner Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center space-y-6 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0f9d63] flex items-center justify-center">
                  <Layers size={28} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider m-0">Inbound Scanner</h3>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed m-0">
                    Upload purchase bills or supplier invoices. The system extracts quantities and adds to inventory automatically.
                  </p>
                </div>
                <button 
                  onClick={() => onOpenScanner('IN')}
                  className="py-3.5 w-full bg-[#0f9d63] hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <UploadCloud size={16} /> Select Supplier Invoice
                </button>
              </div>

              {/* Outbound Scanner Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center space-y-6 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Package size={28} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider m-0">Outbound Scanner</h3>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed m-0">
                    Upload sales slips, delivery challans or receipts. The system deducts quantities from inventory.
                  </p>
                </div>
                <button 
                  onClick={() => onOpenScanner('OUT')}
                  className="py-3.5 w-full bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <UploadCloud size={16} /> Select Delivery Slip
                </button>
              </div>

            </div>
          </div>
        )}



      </div>

    </div>
  );
}
