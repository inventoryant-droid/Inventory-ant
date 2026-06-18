import React, { useState } from 'react';
import '../App.css';
import { CloudUpload, FileText, Clock, Layers, Flame, UploadCloud } from 'lucide-react';

function AITools({ userId, onScanResult, onOpenScanner }) {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-indigo-600 mb-1">
            Smart Scanner Module
          </h1>
          <p className="text-slate-500 text-sm font-medium m-0">
            Autonomous invoice scanning & stock sync using Gemini AI.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto w-full md:w-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer border-none whitespace-nowrap ${activeTab === 'upload' ? 'bg-indigo-50 text-indigo-600' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
          >
             <CloudUpload size={16} /> Upload
          </button>
          <button 
             onClick={() => setActiveTab('review')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer border-none whitespace-nowrap ${activeTab === 'review' ? 'bg-indigo-50 text-indigo-600' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
          >
             <FileText size={16} /> Review & Align
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer border-none whitespace-nowrap ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-600' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
          >
             <Clock size={16} /> History logs
          </button>
        </div>
      </div>

      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            {/* Inbound Scanner Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-6">
                 <Layers size={32} strokeWidth={2} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 mb-3 tracking-tight">INBOUND SCANNER</h2>
              <p className="text-slate-500 text-sm mb-8 max-w-sm leading-relaxed">
                Upload purchase bills or supplier invoices. The system extracts quantities and adds to inventory automatically.
              </p>
              <button 
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors border-none cursor-pointer" 
                onClick={() => onOpenScanner('IN')}
              >
                <UploadCloud size={18} /> SELECT SUPPLIER INVOICE
              </button>
           </div>

           {/* Outbound Scanner Card */}
           <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-6">
                 <Flame size={32} strokeWidth={2} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 mb-3 tracking-tight">OUTBOUND SCANNER</h2>
              <p className="text-slate-500 text-sm mb-8 max-w-sm leading-relaxed">
                Upload sales slips, delivery challans or receipts. The system deducts quantities from inventory.
              </p>
              <button 
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors border-none cursor-pointer" 
                onClick={() => onOpenScanner('OUT')}
              >
                <UploadCloud size={18} /> SELECT DELIVERY SLIP
              </button>
            </div>
        </div>
      )}

      {activeTab !== 'upload' && (
         <div className="mt-12 text-center text-slate-400 text-sm">
            This module is currently empty or under construction.
         </div>
      )}
    </div>
  );
}

export default AITools;
