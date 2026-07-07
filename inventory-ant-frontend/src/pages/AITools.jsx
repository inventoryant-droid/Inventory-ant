import React from 'react';
import { Layers, Package, UploadCloud } from 'lucide-react';
import '../App.css';

function AITools({ onOpenScanner }) {
  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 text-left">
        <div>
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-emerald-600 mb-1">
            Smart Scanner Module
          </h1>
          <p className="text-slate-500 text-sm font-medium m-0">
            Autonomous invoice scanning & stock sync using Gemini AI.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        {/* Inbound Scanner Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6">
            <Layers size={32} strokeWidth={2} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-3 tracking-tight">INBOUND SCANNER</h2>
          <p className="text-slate-500 text-sm mb-8 max-w-sm leading-relaxed">
            Upload purchase bills or supplier invoices. The system extracts quantities and adds to inventory automatically.
          </p>
          <button 
            className="w-full py-4 bg-[#0f9d63] hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors border-none cursor-pointer" 
            onClick={() => onOpenScanner('IN')}
          >
            <UploadCloud size={18} /> SELECT SUPPLIER INVOICE
          </button>
        </div>

        {/* Outbound Scanner Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-6">
            <Package size={32} strokeWidth={2} />
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
    </div>
  );
}

export default AITools;
