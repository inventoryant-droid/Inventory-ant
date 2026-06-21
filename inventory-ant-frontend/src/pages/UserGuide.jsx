import React, { useState } from 'react';
import '../App.css';
import { 
  User, 
  Users, 
  Receipt, 
  Scan, 
  Mic, 
  BookOpen, 
  ChevronRight, 
  HelpCircle, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  Printer, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';

function UserGuide() {
  const [activeChapter, setActiveChapter] = useState('profile');

  const chapters = [
    {
      id: 'profile',
      title: 'Profile Setup',
      hindiTitle: 'प्रोफाइल सेटअप',
      icon: <User size={20} />,
      color: 'text-indigo-500 bg-indigo-50 border-indigo-100',
      description: 'Business onboarding details aur billing configurations configure karein.'
    },
    {
      id: 'staff',
      title: 'Staff Management',
      hindiTitle: 'स्टाफ मैनेजर',
      icon: <Users size={20} />,
      color: 'text-purple-500 bg-purple-50 border-purple-100',
      description: 'Kam karne wale loaders ya billing operators add karein aur control karein.'
    },
    {
      id: 'billing',
      title: 'POS Terminal & Bills',
      hindiTitle: 'सेल्स और बिलिंग',
      icon: <Receipt size={20} />,
      color: 'text-emerald-500 bg-emerald-50 border-emerald-100',
      description: 'Dukaan par grahako ko products bech kar tax invoices generate karein.'
    },
    {
      id: 'scanner',
      title: 'Smart AI Scanner',
      hindiTitle: 'स्मार्ट स्कैनर',
      icon: <Scan size={20} />,
      color: 'text-amber-500 bg-amber-50 border-amber-100',
      description: 'Gemini Vision AI se purchase bills aur delivery slips read karein.'
    },
    {
      id: 'antx',
      title: 'Ant X Voice Agent',
      hindiTitle: 'वॉयस कमांड्स',
      icon: <Mic size={20} />,
      color: 'text-rose-500 bg-rose-50 border-rose-100',
      description: 'Hinglish voice agent se bin chhue stock add/deduct aur query karein.'
    }
  ];

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 text-left">
        <div>
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-indigo-600 mb-1 flex items-center gap-2">
            <BookOpen size={28} /> Interactive User Guide
          </h1>
          <p className="text-slate-500 text-sm font-medium m-0">
            Inventory Ant ko use karne ke sabhi steps aur tools ki guides yahan padhein.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
          {chapters.map((ch) => {
            const isActive = activeChapter === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChapter(ch.id)}
                className={`p-4 rounded-2xl border text-left flex items-start gap-4 transition-all duration-300 cursor-pointer ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 text-slate-700'}`}
              >
                <div className={`p-2.5 rounded-xl border shrink-0 ${isActive ? 'bg-indigo-500 border-indigo-400 text-white' : ch.color}`}>
                  {ch.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-extrabold text-sm ${isActive ? 'text-white' : 'text-slate-800'}`}>
                    {ch.title}
                  </div>
                  <div className={`text-[10px] uppercase font-black tracking-wider ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {ch.hindiTitle}
                  </div>
                  <p className={`text-[11px] mt-1 leading-normal line-clamp-2 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {ch.description}
                  </p>
                </div>
                <ChevronRight size={16} className={`shrink-0 self-center transition-transform ${isActive ? 'translate-x-1 text-white' : 'text-slate-300'}`} />
              </button>
            );
          })}
        </div>

        {/* Dynamic Chapter Guide Panel */}
        <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-left w-full min-h-[500px]">
          {activeChapter === 'profile' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                  <User size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest block">Chapter 01</span>
                  <h2 className="m-0 text-xl font-black text-slate-800">Business Profile & Onboarding</h2>
                </div>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed m-0">
                Inventory Ant ka full access pane ke liye owner accounts ko onboarding pura karna jaruri hai. Isse aapke billing aur GST records valid bante hain.
              </p>

              {/* Vertical Step Timeline */}
              <div className="flex flex-col gap-6 mt-2">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-sm flex items-center justify-center shrink-0">1</div>
                    <div className="w-0.5 flex-1 bg-slate-100 mt-2"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">Onboarding screen par details dalein</h4>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      Pehli baar login karne par aapse onboarding details mangi jayegi. Apna **Business Name**, **Complete Address**, aur **GSTIN (GST Number)** register karein.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-sm flex items-center justify-center shrink-0">2</div>
                    <div className="w-0.5 flex-1 bg-slate-100 mt-2"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">Dukaan/Warehouse ka Logo upload karein</h4>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      Ek clean resolution ka business logo (PNG or JPEG) upload karein. Yeh logo aapke POS terminal dwara generate kiye gaye har tax invoice par dynamically print kiya jata hai.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-sm flex items-center justify-center shrink-0">3</div>
                  </div>
                  <div className="flex-1">
                    <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">Invoice options set karein</h4>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      **Settings** page ke profile editor me jakar choose karein ki kya aap bills par apna personal phone number aur business email print karna chahte hain. toggle configurations check karein.
                    </p>
                  </div>
                </div>
              </div>

              {/* Informative Tip Box */}
              <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 flex gap-3 text-slate-700 mt-4">
                <Sparkles className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <div className="text-xs">
                  <strong className="block text-amber-800 mb-0.5">Quick Pro-Tip:</strong>
                  Agar aapka profile incomplete hai, to app automatically onboarding page par redirect karega. Profile validation settings checkout calculation me madad karti hain.
                </div>
              </div>
            </div>
          )}

          {activeChapter === 'staff' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                  <Users size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-500 tracking-widest block">Chapter 02</span>
                  <h2 className="m-0 text-xl font-black text-slate-800">Staff Account Management</h2>
                </div>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed m-0">
                Business owners apne warehouse me loaders ya billing operator ko add kar sakte hain. Staff members ke paas owner ke products ka synchronized access hota hai.
              </p>

              {/* Vertical Step Timeline */}
              <div className="flex flex-col gap-6 mt-2">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 text-purple-600 font-bold text-sm flex items-center justify-center shrink-0">1</div>
                    <div className="w-0.5 flex-1 bg-slate-100 mt-2"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">Staff details aur custom passwords fill karein</h4>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      **Staff Management** dashboard par click karein. Staff member ka real Name, Phone, avatar picture upload karein aur unka login password set karein.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 text-purple-600 font-bold text-sm flex items-center justify-center shrink-0">2</div>
                    <div className="w-0.5 flex-1 bg-slate-100 mt-2"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">Auto-generated Business Logins</h4>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      Add button dabane par, system owner ke **Business Name** ke aadhar par ek business email format login ID auto-generate karega, jaise: <code className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-mono text-[10px]">raj@gyantraders.ant</code>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 text-purple-600 font-bold text-sm flex items-center justify-center shrink-0">3</div>
                  </div>
                  <div className="flex-1">
                    <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">Access Limits aur Suspension Control</h4>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      Staff accounts ko secure access diya jata hai. Woh products bech sakte hain, checkouts, scans, aur voice commands chala sakte hain, par profile change nahi kar sakte aur **na hi database delete** kar sakte hain. Owner kisi bhi samay unka account active/deactive ya remove kar sakte hain.
                    </p>
                  </div>
                </div>
              </div>

              {/* Informative Security Box */}
              <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 flex gap-3 text-slate-700 mt-4">
                <Lock className="text-purple-500 shrink-0 mt-0.5" size={18} />
                <div className="text-xs">
                  <strong className="block text-purple-800 mb-0.5">Access Control Shield:</strong>
                  Staff members settings reset nahi kar sakte. Agar koi staff delete API hit karne ki koshish karega, to system `403 Forbidden` return karega.
                </div>
              </div>
            </div>
          )}

          {activeChapter === 'billing' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                  <Receipt size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest block">Chapter 03</span>
                  <h2 className="m-0 text-xl font-black text-slate-800">Sales POS & Billing Receipt</h2>
                </div>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed m-0">
                POS Sales terminal se stock ko retail/wholesale checkout karna aur invoices generate karna bahut simple hai.
              </p>

              {/* Vertical Step Timeline */}
              <div className="flex flex-col gap-6 mt-2">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold text-sm flex items-center justify-center shrink-0">1</div>
                    <div className="w-0.5 flex-1 bg-slate-100 mt-2"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">Products search aur cart mapping</h4>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      Dukaan ka terminal kholein. input box me product ka Naam, SKU Code ya Barcode search karein aur ek click me use cart me add karein. Cart me quantity and custom limits modify ki ja sakti hain.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold text-sm flex items-center justify-center shrink-0">2</div>
                    <div className="w-0.5 flex-1 bg-slate-100 mt-2"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">Confirm Terminal Sync checkout</h4>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      Grahak ka Name, Phone, and Address optional format fill karein. Checkouts confirm karte hi backend automatically Master Inventory list se stock quantity deduct (minus) kar dega.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold text-sm flex items-center justify-center shrink-0">3</div>
                  </div>
                  <div className="flex-1">
                    <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">Automatic GST Calculation & Sharing</h4>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      Agar aapke profile me GSTIN configured hai, to invoice standard formatting calculator GST (18%) charge add kar dega. Bill ko standard portrait print karein ya one-click WhatsApp text format share shortcut chalayein.
                    </p>
                  </div>
                </div>
              </div>

              {/* Informative Tip Box */}
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex gap-3 text-slate-700 mt-4">
                <Printer className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                <div className="text-xs">
                  <strong className="block text-emerald-800 mb-0.5">Billing Audit logs:</strong>
                  Billing history records me har transaction log kiya jata hai. Wahan **Generated By** columns me owner ka login 'Owner' ya staff member ka active name render hota hai.
                </div>
              </div>
            </div>
          )}

          {activeChapter === 'scanner' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                  <Scan size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest block">Chapter 04</span>
                  <h2 className="m-0 text-xl font-black text-slate-800">Smart Scanner: Inbound / Outbound</h2>
                </div>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed m-0">
                Purchase invoices ya delivery challans ko upload karke smart scanner automates stock syncing mechanisms directly with Gemini AI.
              </p>

              {/* Vertical Step Timeline */}
              <div className="flex flex-col gap-6 mt-2">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100 text-amber-600 font-bold text-sm flex items-center justify-center shrink-0">1</div>
                    <div className="w-0.5 flex-1 bg-slate-100 mt-2"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">Inbound vs Outbound Action Mode select karein</h4>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      - **Inbound Scanner**: Supplier invoices select karein. Isse read kiya gaya products data stock me **plus (add)** hota hai.<br />
                      - **Outbound Scanner**: Delivery slips or sales challan select karein. Isse stocks **minus (deduct)** hota hai.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100 text-amber-600 font-bold text-sm flex items-center justify-center shrink-0">2</div>
                    <div className="w-0.5 flex-1 bg-slate-100 mt-2"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">PDF/Invoice image upload karein</h4>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      Upload button dabakar bill ki clear image choose karein. Gemini Vision AI table parse karega, items list filter karega, aur confirmation page par quantities match karne ko push karega.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100 text-amber-600 font-bold text-sm flex items-center justify-center shrink-0">3</div>
                  </div>
                  <div className="flex-1">
                    <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">Scanner History Logs tracker</h4>
                    <p className="text-xs text-slate-500 leading-relaxed m-0">
                      Smart Scanner module ke **History logs** tab me har image scan ko save kiya jata hai. Click logs table me Scan ID, Action Type badge, parsed entries date, aur operators name display hote hain. **View Details** click karte hi optimized invoice card open hota hai.
                    </p>
                  </div>
                </div>
              </div>

              {/* Informative Tip Box */}
              <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 flex gap-3 text-slate-700 mt-4">
                <Info className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <div className="text-xs">
                  <strong className="block text-amber-800 mb-0.5">Optimized Modal view theme-matching:</strong>
                  Scans details modal has dynamic light & dark colors adjustments. window printer options are embedded inside portrait templates layout structure.
                </div>
              </div>
            </div>
          )}

          {activeChapter === 'antx' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                  <Mic size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-rose-500 tracking-widest block">Chapter 05</span>
                  <h2 className="m-0 text-xl font-black text-slate-800">Ant X V2 Hinglish Voice Core</h2>
                </div>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed m-0">
                Ant X Hinglish voice processor se dukaan par hand-free inventory mapping kar sakte hain. Mike press karke speech transcripts register karein.
              </p>

              {/* Step checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-800 block">Stock Inward / Outward commands:</span>
                  <div className="font-mono text-indigo-600 text-xs italic bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50">
                    "Item Code 123 ke 20 unit add karo"
                  </div>
                  <div className="font-mono text-rose-600 text-xs italic bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50">
                    "laptop me se 5 unit minus karo"
                  </div>
                </div>

                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-800 block">Check stocks status or chat query:</span>
                  <div className="font-mono text-emerald-600 text-xs italic bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
                    "Aata 5kg packet ka kitna stock bacha hai?"
                  </div>
                  <div className="font-mono text-amber-600 text-xs italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50">
                    "Total kitne products hain mere paas?"
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start mt-2">
                <div className="p-2 bg-rose-50 text-rose-500 rounded-xl shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="m-0 text-sm font-bold text-slate-800 mb-1">Safety limits configuration</h4>
                  <p className="text-xs text-slate-500 leading-relaxed m-0">
                    Large modifications quantity (&gt;50 pieces) add/remove karne par, ya full catalog clear (Wipe) commands processor trigger karne par AI systems safety verify alert message push karega aur confirm verbal code validation demand karega.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserGuide;
