import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Play, UserPlus, MessageSquare, Mic, 
  Scan, BarChart3, Plus, Minus, Loader2, Sparkles, Send
} from 'lucide-react';

const FEATURE_DATA = {
  INVENTORY: {
    title: 'Inventory Management',
    icon: BarChart3,
    color: 'text-emerald-500 bg-emerald-50',
    hinglish: {
      desc: 'Is feature se aap apne store ka saara inventory stock manage kar sakte hain.',
      steps: [
        'Dashboard ke "Master Inventory" section mein jayein.',
        'Wahan aap manually "Add Product" button se naya product details, pricing aur SKU code ke sath register kar sakte hain.',
        'Aap kisi bhi item ke quantity ko directly change ya click karke edit kar sakte hain.',
        'Low stock limits set karein taki jab product khatam hone wala ho toh automatic warning alerts mil sakein.'
      ]
    },
    hindi: {
      desc: 'इस फीचर से आप अपने स्टोर का सारा इन्वेंटरी स्टॉक आसानी से मैनेज कर सकते हैं।',
      steps: [
        'डैशबोर्ड के "Master Inventory" सेक्शन में जाएं।',
        'वहां आप नया प्रोडक्ट उसका नाम, कीमत और मात्रा डालकर रजिस्टर कर सकते हैं।',
        'आप किसी भी आइटम की मात्रा को मैन्युअली बढ़ा या घटा सकते हैं।',
        'लो-स्टॉक चेतावनी सेट करें ताकि सामान खत्म होने पर आपको ऑटोमैटिक सूचना मिल जाए।'
      ]
    }
  },
  STAFF: {
    title: 'Staff & Role Controls',
    icon: UserPlus,
    color: 'text-sky-500 bg-sky-50',
    hinglish: {
      desc: 'Apni shop ke helpers, billers ya managers ko alag permissions ke sath access dein.',
      steps: [
        'Sidebar se "Staff Management" menu mein jayein.',
        '"Add Staff" par click karke unka naam, email aur unique password enter karein.',
        'Unhe role assign karein (jaise Operator ya Billing Agent).',
        'Staff members aapke products add/remove kar payenge par unhe dashboard settings ya billing panel ka access nahi hoga.'
      ]
    },
    hindi: {
      desc: 'अपनी दुकान के हेल्परों, बिलर्स या मैनेजरों को सीमित अधिकारों के साथ अलग एक्सेस प्रदान करें।',
      steps: [
        'साइडबार से "Staff Management" मेनू में जाएं।',
        '"Add Staff" पर क्लिक करके उनका नाम, ईमेल और पासवर्ड दर्ज करें।',
        'उन्हें उपयुक्त रोल (जैसे ऑपरेटर या बिलिंग एजेंट) सौंपें।',
        'स्टाफ सदस्य प्रोडक्ट लिस्ट देख व एडिट कर सकेंगे पर आपके मुख्य अकाउंट सेटिंग्स को नहीं छू पाएंगे।'
      ]
    }
  },
  AI_CHAT: {
    title: 'Ant X Conversational Terminal',
    icon: MessageSquare,
    color: 'text-indigo-500 bg-indigo-50',
    hinglish: {
      desc: 'Ant X AI Terminal se chat karke inventory query aur calculations seconds mein karein.',
      steps: [
        'Dashboard mein sidebar se "Ant X Terminal" par click karein.',
        'Ek aam chat ki tarah question likhein, jaise: "low stock items kaunse hain?"',
        'Ant X automatic analysis karke inventory tables se live data nikal kar list show kar dega.',
        'Aap complex sawaal bhi puch sakte hain, jaise: "is mahine ka total sales estimate kya hai?".'
      ]
    },
    hindi: {
      desc: 'एंट एक्स एआई टर्मिनल से सीधे चैट करके इन्वेंटरी और सेल्स की जानकारी सेकंडों में हासिल करें।',
      steps: [
        'डैशबोर्ड के साइडबार में "Ant X Terminal" पर क्लिक करें।',
        'एक साधारण चैट की तरह सवाल पूछें, जैसे: "लो स्टॉक सामान कौन से हैं?"',
        'एंट एक्स लाइव डेटाबेस से जानकारी निकालकर तुरंत आपकी स्क्रीन पर दिखा देगा।',
        'आप जटिल सवाल भी पूछ सकते हैं, जैसे: "इस महीने का कुल अनुमानित मुनाफा कितना है?"।'
      ]
    }
  },
  VOICE_ASSISTANT: {
    title: 'Hinglish Voice Assistant',
    icon: Mic,
    color: 'text-rose-500 bg-rose-50',
    hinglish: {
      desc: 'Dukaan ke busy shor-sharabe mein bina type kiye bolkar stock aur billing update karein.',
      steps: [
        'Screen ke bottom-right mein green color ka floating Mic icon dikhega.',
        'Mic button par click karein aur directly bolein (jaise: "A4 Notebook 20 piece add karo").',
        'Assistant voice command ko samajh kar directly live inventory updates kar dega.',
        'Command successfully run hone ke baad system aapse bolega: "Haan ji, Notebook me 20 quantity add kar di hai!"'
      ]
    },
    hindi: {
      desc: 'दुकान की व्यस्तता में बिना टाइप किए, सीधे बोलकर स्टॉक और बिलिंग अपडेट करें।',
      steps: [
        'स्क्रीन के निचले दाएं कोने में हरे रंग का फ्लोटिंग माइक आइकन दिखाई देगा।',
        'माइक पर क्लिक करें और सीधे बोलें (जैसे: "A4 Notebook 20 पीस जोड़ो")।',
        'वॉयस असिस्टेंट आपकी हिंदी आवाज को डिकोड करके लाइव स्टॉक बढ़ा देगा।',
        'अपडेट होने पर वॉयस रिप्लाई आएगा: "हां जी, नोटबुक में 20 मात्रा जोड़ दी गई है!"'
      ]
    }
  },
  SMART_SCAN: {
    title: 'Gemini Invoice Scanner',
    icon: Scan,
    color: 'text-amber-500 bg-amber-50',
    hinglish: {
      desc: 'Kisi bhi supplier ke printed bill ya invoice photo ko scan karke automatic stock update karein.',
      steps: [
        'Sidebar se "Smart Scanner" option par jayein.',
        'Supplier bill ki photo kheenche ya PDF/Image file upload karein.',
        'Scanner billing table mein se product names aur purchase quantity extract karega.',
        'Confirm dabate hi ye matched catalog items ke current stock ko upgrade kar dega.'
      ]
    },
    hindi: {
      desc: 'किसी भी सप्लायर के बिल या इनवॉइस पर्चे की फोटो खींचकर सीधे स्टॉक में एंट्री करें।',
      steps: [
        'साइडबार से "Smart Scanner" ऑप्शन पर जाएं।',
        'सप्लायर बिल की फोटो खींचें या पीडीएफ/इमेज फाइल अपलोड करें।',
        'स्कैनर बिल में से सभी प्रोडक्ट्स के नाम और खरीदी गई मात्रा को खुद पढ़ लेगा।',
        'कन्फर्म दबाते ही यह आपके मौजूदा प्रोडक्ट्स के स्टॉक को बढ़ा देगा।'
      ]
    }
  },
  ANALYTICS: {
    title: 'Business Analytics & Logs',
    icon: BarChart3,
    color: 'text-purple-500 bg-purple-50',
    hinglish: {
      desc: 'Shop ki sales performance, stock valuation aur auditing logs ko ek sath track karein.',
      steps: [
        'Dashboard par overview panels aur graphs check karein.',
        'History Logs tab par jaakar dekhein ki kis staff member ne kab aur kya inventory change ki hai.',
        'Total inventory value aur category distribution graphs se dead stock (jo sell nahi ho raha) ko pehchanein.'
      ]
    },
    hindi: {
      desc: 'दुकान की बिक्री प्रदर्शन, स्टॉक वैल्यूएशन और ऑडिटिंग रिकॉर्ड्स को एक साथ ट्रैक करें।',
      steps: [
        'डैशबोर्ड पर सेल्स ट्रेंड और ग्राफ्स का जायजा लें।',
        'हिस्ट्री लॉग्स में जाकर देखें कि किस स्टाफ ने कब और कौन सा स्टॉक अपडेट किया है।',
        'टोटल स्टॉक वैल्यू और चार्ट्स की मदद से धीमे बिकने वाले सामानों (डेड स्टॉक) को पहचानें।'
      ]
    }
  }
};

export function FeatureDemoModal({ featureId, onClose }) {
  const [lang, setLang] = useState('hinglish'); // 'hinglish' | 'hindi'
  const [simState, setSimState] = useState({});
  const [simRunning, setSimRunning] = useState(false);
  const [staffInputName, setStaffInputName] = useState('');

  useEffect(() => {
    // Reset simulation states when feature changes
    setSimState({});
    setSimRunning(false);
  }, [featureId]);

  if (!featureId || !FEATURE_DATA[featureId]) return null;

  const data = FEATURE_DATA[featureId];
  const Icon = data.icon;
  const content = lang === 'hinglish' ? data.hinglish : data.hindi;

  // ─── INTERACTIVE SIMULATION RENDERERS ───
  const renderSimulation = () => {
    switch (featureId) {
      case 'INVENTORY': {
        const qty = simState.qty !== undefined ? simState.qty : 10;
        const logs = simState.logs || [];
        const handleQtyChange = (val) => {
          const next = Math.max(0, qty + val);
          const time = new Date().toLocaleTimeString();
          const actionText = lang === 'hinglish' 
            ? `Stock updated: Cello Pen quantity set to ${next}`
            : `स्टॉक अपडेट किया गया: सेलो पेन की मात्रा ${next} की गई`;
          setSimState({
            qty: next,
            logs: [`[${time}] ${actionText}`, ...logs.slice(0, 2)]
          });
        };
        return (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm m-0">Cello Maxriter Pen</h5>
                <p className="text-[10px] text-slate-400 m-0 mt-0.5">SKU: PEN-MAX-01 | Price: ₹10</p>
              </div>
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 shadow-sm">
                <button 
                  onClick={() => handleQtyChange(-1)}
                  className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded border-none bg-transparent cursor-pointer text-slate-500"
                >
                  <Minus size={14} />
                </button>
                <span className="font-black text-slate-800 dark:text-slate-100 text-sm w-6 text-center">{qty}</span>
                <button 
                  onClick={() => handleQtyChange(1)}
                  className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded border-none bg-transparent cursor-pointer text-slate-500"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            {logs.length > 0 && (
              <div className="bg-slate-950 rounded-xl p-3 font-mono text-[10px] text-emerald-400 space-y-1">
                {logs.map((log, idx) => <div key={idx}>{log}</div>)}
              </div>
            )}
            <p className="text-[10px] text-slate-400 italic text-center m-0">
              {lang === 'hinglish' 
                ? 'Tip: Real app mein "+" dabane par database mein quantity bina reload ke update ho jati hai!'
                : 'सुझाव: वास्तविक ऐप में "+" दबाने पर डेटाबेस में मात्रा बिना रीलोड के तुरंत अपडेट हो जाती है!'}
            </p>
          </div>
        );
      }

      case 'STAFF': {
        const staffList = simState.list || ['Ramesh (Operator)'];
        const handleAddStaff = (e) => {
          e.preventDefault();
          if (!staffInputName.trim()) return;
          setSimState({
            list: [...staffList, `${staffInputName.trim()} (Loader)`]
          });
          setStaffInputName('');
        };
        return (
          <div className="space-y-4">
            <form onSubmit={handleAddStaff} className="flex gap-2">
              <input 
                type="text" 
                placeholder={lang === 'hinglish' ? 'Type helper name...' : 'हेल्पर का नाम लिखें...'}
                value={staffInputName}
                onChange={(e) => setStaffInputName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-sky-500 text-slate-800 dark:text-slate-200"
              />
              <button 
                type="submit"
                className="bg-sky-600 hover:bg-sky-700 text-white border-none rounded-xl px-3 py-2 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
              >
                <Plus size={14} /> Add
              </button>
            </form>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
              <h6 className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider m-0 mb-2">Registered Staff</h6>
              <div className="space-y-1.5">
                {staffList.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                    <span>{item}</span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 uppercase font-black">Active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'AI_CHAT': {
        const chats = simState.chats || [
          { sender: 'ai', text: lang === 'hinglish' ? 'Hello! Main Ant X AI hoon. Main aapki stock queries aur billing reports nikal sakta hoon. Kuch puchiye!' : 'नमस्ते! मैं एंट एक्स एआई हूँ। मैं आपके स्टॉक और बिलिंग की जानकारी निकाल सकता हूँ। कुछ पूछें!' }
        ];
        const handleQuery = (query, reply) => {
          setSimRunning(true);
          const updatedChats = [...chats, { sender: 'user', text: query }];
          setSimState({ chats: updatedChats });
          
          setTimeout(() => {
            setSimState({
              chats: [...updatedChats, { sender: 'ai', text: reply }]
            });
            setSimRunning(false);
          }, 1500);
        };
        return (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-2xl p-4 h-48 overflow-y-auto flex flex-col gap-3 font-medium text-xs scrollbar-thin">
              {chats.map((chat, idx) => (
                <div key={idx} className={`max-w-[80%] p-2.5 rounded-2xl leading-relaxed ${
                  chat.sender === 'user'
                    ? 'bg-indigo-600 text-white self-end rounded-tr-none'
                    : 'bg-slate-800 text-slate-200 self-start rounded-tl-none border border-slate-700'
                }`}>
                  {chat.text}
                </div>
              ))}
              {simRunning && (
                <div className="bg-slate-800 border border-slate-700 text-slate-400 max-w-[80%] p-2 rounded-xl self-start flex items-center gap-1.5">
                  <Loader2 className="animate-spin" size={12} /> Typing response...
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button 
                onClick={() => handleQuery(
                  lang === 'hinglish' ? 'Kaunse products low stock mein hain?' : 'कौन से सामान लो स्टॉक में हैं?',
                  lang === 'hinglish' ? 'Aapke catalog mein 2 items low stock hain: A4 Notebooks (2 units left) aur Hauser Pens (4 units left).' : 'आपके कैटलॉग में 2 आइटम लो स्टॉक हैं: A4 Notebooks (2 बचे हैं) और Hauser Pens (4 बचे हैं)।'
                )}
                disabled={simRunning}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-lg px-2.5 py-1.5 text-[10px] font-bold cursor-pointer transition-colors"
              >
                ❓ Low Stock List
              </button>
              <button 
                onClick={() => handleQuery(
                  lang === 'hinglish' ? 'A4 Notebook ka current valuation kya hai?' : 'A4 नोटबुक का मूल्य कितना है?',
                  lang === 'hinglish' ? 'A4 Notebooks ka valuation ₹1,200 hai (30 units @ ₹40 each).' : 'A4 नोटबुक का कुल मूल्य ₹1,200 है (30 यूनिट @ ₹40 प्रति यूनिट)।'
                )}
                disabled={simRunning}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-lg px-2.5 py-1.5 text-[10px] font-bold cursor-pointer transition-colors"
              >
                📊 Notebook Valuation
              </button>
            </div>
          </div>
        );
      }

      case 'VOICE_ASSISTANT': {
        const status = simState.status || 'idle'; // 'idle' | 'listening' | 'transcribing' | 'done'
        const handleStartVoiceSim = () => {
          setSimState({ status: 'listening' });
          setTimeout(() => {
            setSimState({ status: 'transcribing' });
            setTimeout(() => {
              setSimState({ status: 'done' });
            }, 1200);
          }, 1500);
        };
        return (
          <div className="space-y-4 text-center">
            <div className="flex justify-center py-4">
              <motion.button 
                onClick={handleStartVoiceSim}
                disabled={status !== 'idle' && status !== 'done'}
                animate={status === 'listening' ? { scale: [1, 1.15, 1] } : {}}
                transition={status === 'listening' ? { repeat: Infinity, duration: 1.2 } : {}}
                className={`w-16 h-16 rounded-full border-none flex items-center justify-center cursor-pointer shadow-md transition-all ${
                  status === 'listening' 
                    ? 'bg-rose-500 text-white ring-4 ring-rose-500/20' 
                    : status === 'transcribing' 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100'
                }`}
              >
                {status === 'transcribing' ? <Loader2 className="animate-spin" size={24} /> : <Mic size={24} />}
              </motion.button>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 min-h-[60px] flex flex-col justify-center items-center">
              {status === 'idle' && (
                <span className="text-slate-400 text-xs font-semibold">
                  {lang === 'hinglish' ? 'Mic button par click karein aur simulate karein!' : 'माइक बटन पर क्लिक करें और सिमुलेट करें!'}
                </span>
              )}
              {status === 'listening' && (
                <span className="text-rose-500 text-xs font-black animate-pulse flex items-center gap-1.5">
                  ● Listening... "Notebook me 20 piece add karo"
                </span>
              )}
              {status === 'transcribing' && (
                <span className="text-amber-600 text-xs font-bold flex items-center gap-1.5">
                  Processing Command...
                </span>
              )}
              {status === 'done' && (
                <div className="space-y-1 text-left w-full">
                  <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Transcribed Query</div>
                  <p className="m-0 text-slate-800 dark:text-slate-200 text-xs font-bold">"Notebook me 20 piece add karo"</p>
                  <div className="text-[10px] text-emerald-500 font-extrabold uppercase tracking-wide mt-2">Ant X Voice Reply</div>
                  <p className="m-0 text-emerald-600 text-xs font-black">
                    {lang === 'hinglish' 
                      ? '"Haan ji, Notebook ke stock mein 20 piece aur add kar diye hain. Naya stock 50 ho gaya hai!"'
                      : '"हां जी, नोटबुक के स्टॉक में 20 पीस और जोड़ दिए गए हैं। नया स्टॉक 50 हो गया है!"'}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'SMART_SCAN': {
        const step = simState.step || 'idle'; // 'idle' | 'scanning' | 'done'
        const handleScan = () => {
          setSimState({ step: 'scanning' });
          setTimeout(() => {
            setSimState({ step: 'done' });
          }, 2000);
        };
        return (
          <div className="space-y-4">
            {step === 'idle' && (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
                <Scan className="text-slate-300 mx-auto mb-2" size={32} />
                <p className="text-xs text-slate-500 m-0">
                  {lang === 'hinglish' ? 'Supplier Bill Image (Invoice.png)' : 'सप्लायर बिल इमेज (Invoice.png)'}
                </p>
                <button 
                  onClick={handleScan}
                  className="mt-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold border-none rounded-xl px-4 py-2 cursor-pointer shadow-sm"
                >
                  Start Mock Scan
                </button>
              </div>
            )}

            {step === 'scanning' && (
              <div className="relative border border-slate-200 dark:border-slate-700 rounded-2xl p-6 bg-slate-50 dark:bg-slate-800 text-center overflow-hidden">
                <Scan className="text-amber-500 mx-auto mb-2 animate-bounce" size={32} />
                <p className="text-xs text-amber-600 font-bold m-0 animate-pulse">Scanning bill matching catalog...</p>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-scan-beam" />
              </div>
            )}

            {step === 'done' && (
              <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 text-xs">
                  <h6 className="font-extrabold text-[10px] uppercase text-emerald-600 tracking-wider m-0 mb-2">Parsed Bill Results</h6>
                  <div className="space-y-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between border-b border-slate-200/50 pb-1">
                      <span>1. Gel Pens</span>
                      <span className="font-bold">+100 Units</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1">
                      <span>2. Eraser Box</span>
                      <span className="font-bold">+50 Units</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSimState({ step: 'idle' })}
                    className="flex-1 bg-slate-100 hover:bg-slate-205 text-slate-600 text-xs font-bold border-none rounded-xl py-2.5 cursor-pointer"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={() => {
                      setSimState({ step: 'idle' });
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold border-none rounded-xl py-2.5 cursor-pointer shadow-sm"
                  >
                    Confirm Stock Update
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'ANALYTICS': {
        const showChart = simState.showChart || false;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Valuation</span>
                <p className="m-0 text-base font-black text-slate-800 dark:text-slate-200 mt-1">₹42,500</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Stock Integrity</span>
                <p className="m-0 text-base font-black text-emerald-600 mt-1">100% OK</p>
              </div>
            </div>
            
            {showChart ? (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-end h-24 gap-3 pt-4">
                  <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="w-full bg-emerald-500 rounded-t-md" style={{ height: '40%' }} />
                    <span className="text-[8px] text-slate-400 uppercase font-bold">Mon</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="w-full bg-emerald-500 rounded-t-md" style={{ height: '75%' }} />
                    <span className="text-[8px] text-slate-400 uppercase font-bold">Tue</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="w-full bg-primary rounded-t-md" style={{ height: '95%' }} />
                    <span className="text-[8px] text-slate-400 uppercase font-bold">Wed</span>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setSimState({ showChart: true })}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold border-none rounded-xl py-2.5 cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <BarChart3 size={14} /> Generate Mock Sales Graph
              </button>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <style>{`
        @keyframes scan-beam {
          0% { top: 0%; opacity: 0.2; }
          50% { top: 100%; opacity: 1; }
          100% { top: 0%; opacity: 0.2; }
        }
        .animate-scan-beam {
          animation: scan-beam 2s infinite ease-in-out;
        }
      `}</style>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 text-left"
        >
          {/* HEADER ROW */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.color} shrink-0`}>
                <Icon size={20} />
              </div>
              <div>
                <h3 className="m-0 text-base font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  {data.title} <Sparkles className="text-amber-500 animate-pulse" size={14} />
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider m-0 mt-0.5">Feature Demo Guide</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* MAIN SCROLLABLE CONTAINER */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* LANGUAGE LANGUAGE SELECTOR */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-fit">
              <button
                onClick={() => setLang('hinglish')}
                className={`py-1.5 px-4 rounded-lg text-xs font-bold border-none transition-all cursor-pointer ${
                  lang === 'hinglish'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 bg-transparent hover:text-slate-700'
                }`}
              >
                Hinglish Guide
              </button>
              <button
                onClick={() => setLang('hindi')}
                className={`py-1.5 px-4 rounded-lg text-xs font-bold border-none transition-all cursor-pointer ${
                  lang === 'hindi'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 bg-transparent hover:text-slate-700'
                }`}
              >
                हिंदी गाइड
              </button>
            </div>

            {/* DESCRIPTION DESCRIPTION */}
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed m-0">
                {content.desc}
              </p>

              {/* LIST STEPS */}
              <div className="space-y-2 pt-2">
                <h4 className="m-0 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {lang === 'hinglish' ? 'How to Use:' : 'कैसे इस्तेमाल करें:'}
                </h4>
                <ol className="p-0 pl-4 m-0 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {content.steps.map((step, idx) => (
                    <li key={idx} className="leading-relaxed pl-1">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* INTERACTIVE WORKSHOP SIMULATOR */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="m-0 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {lang === 'hinglish' ? 'Try Interactive Demo:' : 'डेमो सिमुलेटर चलायें:'}
              </h4>
              <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                {renderSimulation()}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
