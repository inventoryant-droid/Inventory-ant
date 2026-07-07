import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * PasswordInput - a drop-in replacement for any <input type="password" />
 *
 * Props (mirrors a standard input):
 *   value, onChange, placeholder, required, className, id, name, autoComplete
 *   iconLeft  – optional JSX icon to show on the left side
 *   dark      – if true, uses dark-background colour palette
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  required = false,
  className = '',
  id,
  name,
  autoComplete,
  iconLeft,
  dark = false,
}) {
  const [visible, setVisible] = useState(false);

  const baseBg   = dark ? 'bg-[#0b0f19] text-white border-[#1e293b] placeholder-slate-600'
                        : 'bg-white text-slate-800 border-slate-200 placeholder-slate-400';
  const focusCls = dark ? 'focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]'
                        : 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200';
  const eyeColor = dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600';

  return (
    <div className="relative flex items-center">
      {iconLeft && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          {iconLeft}
        </span>
      )}
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={[
          'w-full border rounded-xl outline-none transition-all duration-200',
          baseBg,
          focusCls,
          iconLeft ? 'pl-11' : 'pl-4',
          'pr-11 py-3.5 text-sm',
          className,
        ].join(' ')}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible(v => !v)}
        className={[
          'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg',
          'border-none bg-transparent cursor-pointer transition-all duration-200',
          'hover:bg-slate-100/80 active:scale-90',
          eyeColor,
          'focus:outline-none focus:ring-2 focus:ring-emerald-300',
        ].join(' ')}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible
          ? <EyeOff size={16} className="transition-all duration-200 opacity-80 hover:opacity-100" />
          : <Eye    size={16} className="transition-all duration-200 opacity-80 hover:opacity-100" />
        }
      </button>
    </div>
  );
}
