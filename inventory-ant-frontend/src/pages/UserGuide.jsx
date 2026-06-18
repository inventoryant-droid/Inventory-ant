import React from 'react';
import '../App.css';

function UserGuide() {
  return (
    <div className="p-6 md:p-10 flex-1 overflow-y-auto pb-40">
      <h1 className="mt-0 text-3xl md:text-5xl font-black mb-4">User <span className="glow-text">Guide</span></h1>
      <p className="text-[var(--text-muted)] text-base md:text-lg mb-8 max-w-2xl">
        Inventory Ant use karna bahut asaan hai. Niche diye gaye simple steps follow karein:
      </p>

      <div className="flex flex-col gap-6 max-w-4xl">
        <div className="ai-card p-6 rounded-2xl border-l-4 border-l-[var(--neon-accent)] border-y border-r border-[var(--glass-border)] transition-all duration-300">
          <h3 className="m-0 mb-3 text-lg md:text-xl font-bold text-[var(--text-main)] flex items-center gap-3">
             <span>🚀</span> 1. Pehla Kadam (CSV Upload)
          </h3>
          <p className="text-[var(--text-muted)] text-sm md:text-base leading-relaxed">
            - Apna pura stock list (inventory) ek Excel/CSV format me banayein.<br/>
            - <strong className="text-[var(--text-main)]">Settings</strong> page me ja kar "Upload CSV File" button par click karein.<br/>
            - System automatically aapke Item Code, Name, aur Expiry ko samajh kar save kar lega.
          </p>
        </div>

        <div className="ai-card p-6 rounded-2xl border-l-4 border-l-purple-500 border-y border-r border-[var(--glass-border)] transition-all duration-300">
          <h3 className="m-0 mb-3 text-lg md:text-xl font-bold text-[var(--text-main)] flex items-center gap-3">
             <span>🎙️</span> 2. Ant X AI (Voice Commands)
          </h3>
          <p className="text-[var(--text-muted)] text-sm md:text-base leading-relaxed">
            - Kisi bhi page par neeche diye gaye Mike button ko dabayein.<br/>
            - Boliye: <em className="text-[var(--neon-accent)]">"Item Code 20 ke 50 piece add karo"</em>.<br/>
            - Agar aap item ka naam bolte hain aur system ko 2 same naam wale items milte hain, toh AI aapse exact details poochega (jaise 80 page ya 100 page).
          </p>
        </div>

        <div className="ai-card p-6 rounded-2xl border-l-4 border-l-emerald-500 border-y border-r border-[var(--glass-border)] transition-all duration-300">
          <h3 className="m-0 mb-3 text-lg md:text-xl font-bold text-[var(--text-main)] flex items-center gap-3">
             <span>📥</span> 3. Inbound (Maal Add Karna)
          </h3>
          <p className="text-[var(--text-muted)] text-sm md:text-base leading-relaxed">
            - Jab dukaan me naya maal aaye, toh <strong className="text-[var(--text-main)]">Smart Scanner</strong> me ja kar apne Purchase Bill ki photo upload karein.<br/>
            - AI automatically items ka naam aur quantity padh kar stock me add kar dega.
          </p>
        </div>

        <div className="ai-card p-6 rounded-2xl border-l-4 border-l-amber-500 border-y border-r border-[var(--glass-border)] transition-all duration-300">
          <h3 className="m-0 mb-3 text-lg md:text-xl font-bold text-[var(--text-main)] flex items-center gap-3">
             <span>🛒</span> 4. Outbound / Billing (Maal Bechna)
          </h3>
          <p className="text-[var(--text-muted)] text-sm md:text-base leading-relaxed">
            - Grahak ko saman dete waqt <strong className="text-[var(--text-main)]">Billing</strong> tab me jayein.<br/>
            - Item search karein ya Ant X ko bol kar cart me add karein.<br/>
            - "Complete Sale" dabate hi stock minus ho jayega.
          </p>
        </div>

        <div className="ai-card p-6 rounded-2xl border-l-4 border-l-[var(--danger)] border-y border-r border-[var(--glass-border)] transition-all duration-300">
          <h3 className="m-0 mb-3 text-lg md:text-xl font-bold text-[var(--text-main)] flex items-center gap-3">
             <span>🗑️</span> 5. Clear Data (Reset)
          </h3>
          <p className="text-[var(--text-muted)] text-sm md:text-base leading-relaxed">
            - Agar aap sab kuch zero se shuru karna chahte hain, toh <strong className="text-[var(--text-main)]">Settings</strong> me jayein.<br/>
            - "Clear Data" dabayein. Dhyan rahe, isse saara stock delete ho jayega.
          </p>
        </div>
      </div>
    </div>
  );
}

export default UserGuide;
