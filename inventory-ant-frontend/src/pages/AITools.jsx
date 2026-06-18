import React from 'react';
import '../App.css';

function AITools({ userId, onScanResult, onOpenScanner }) {
  return (
    <div className="p-6 md:p-10 flex-1 overflow-y-auto">
      <h1 className="mt-0 text-3xl md:text-5xl font-black mb-2">
        Neural <span className="glow-text">Lab</span>
      </h1>
      <p className="text-[var(--text-muted)] text-base md:text-lg">Advanced autonomous protocols for zero-touch inventory.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          <div className="ai-card text-center p-8 rounded-2xl flex flex-col items-center">
            <div className="text-6xl mb-4">🧬</div>
            <h2 className="text-2xl font-bold text-[var(--primary)] mb-2">Inbound Sync</h2>
            <p className="text-[var(--text-muted)] text-sm mb-6">Automated purchase mapping via Gemini AI.</p>
            <button className="btn-primary w-full py-4 text-base font-semibold" onClick={() => onOpenScanner('IN')}>Scan Bill</button>
         </div>

         <div className="ai-card text-center p-8 rounded-2xl flex flex-col items-center">
            <div className="text-6xl mb-4">🩸</div>
            <h2 className="text-2xl font-bold text-[var(--danger)] mb-2">Outbound Sync</h2>
            <p className="text-[var(--text-muted)] text-sm mb-6">Real-time stock deduction from receipts.</p>
            <button className="btn-danger w-full py-4 text-base font-semibold" onClick={() => onOpenScanner('OUT')}>Scan Receipt</button>
         </div>
      </div>
    </div>
  );
}

export default AITools;
