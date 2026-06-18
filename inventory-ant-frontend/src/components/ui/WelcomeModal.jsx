import React from 'react';

function WelcomeModal({ isOpen, onClose, onUploadCSV, onAddManually }) {
  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-[fadeIn_0.4s_ease]"
    >
      <div className="glass-panel w-full max-w-[750px] p-6 md:p-14 rounded-3xl border border-[color:rgba(6,182,212,0.3)] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.15)] relative text-center bg-gradient-to-br from-slate-900/95 to-slate-950/98 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-transparent border-none text-[var(--text-muted)] text-4xl cursor-pointer transition-colors hover:text-[var(--danger)] p-2 leading-[0.8]"
        >
          &times;
        </button>

        {/* Header */}
        <div className="text-6xl mb-4 animate-[bounce_4s_infinite]">🚀</div>
        <h2 className="text-3xl md:text-5xl font-black mb-4 text-[var(--text-main)] tracking-tight">
          Welcome to <span className="text-[var(--neon-accent)]">Inventory Ant</span>
        </h2>
        <p className="text-[var(--text-muted)] text-base md:text-lg leading-relaxed max-w-[550px] mx-auto mb-10">
          Your intelligent warehouse is ready. To unlock the full power of the Neural AI, please populate your initial inventory.
        </p>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Option 1 */}
          <div 
            onClick={onUploadCSV}
            className="ai-card p-8 cursor-pointer border border-[color:rgba(6,182,212,0.3)] bg-[color:rgba(6,182,212,0.05)] transition-all duration-300 flex flex-col items-center rounded-2xl hover:scale-105"
          >
            <div className="text-5xl mb-4">📄</div>
            <h3 className="text-[var(--neon-accent)] font-semibold mb-2 text-lg md:text-xl">Upload Master CSV</h3>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              Instantly sync your entire catalog. Headers map automatically.
            </p>
          </div>

          {/* Option 2 */}
          <div 
            onClick={onAddManually}
            className="ai-card p-8 cursor-pointer border border-[color:rgba(139,92,246,0.3)] bg-[color:rgba(139,92,246,0.05)] transition-all duration-300 flex flex-col items-center rounded-2xl hover:scale-105"
          >
            <div className="text-5xl mb-4">✍️</div>
            <h3 className="text-[#8B5CF6] font-semibold mb-2 text-lg md:text-xl">Add Manually</h3>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              Start fresh and add items one by one into the registry.
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

export default WelcomeModal;
