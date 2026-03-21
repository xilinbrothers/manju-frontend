import React from 'react';

const variants = {
  primary: 'bg-[var(--app-primary)] hover:bg-[var(--app-primary-hover)] text-white',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
  neutral: 'bg-slate-900 hover:bg-slate-800 text-white',
  danger: 'bg-[var(--app-danger)] hover:bg-[var(--app-danger-hover)] text-white',
  ghost: 'bg-transparent hover:bg-black/5 text-[color:var(--app-fg)] border border-[color:var(--app-border)]',
};

const sizes = {
  sm: 'h-9 px-3 rounded-xl text-sm',
  md: 'h-10 px-4 rounded-xl text-sm',
  lg: 'h-11 px-4 rounded-xl text-sm',
};

const Button = ({ variant = 'primary', size = 'md', className = '', disabled, onClick, children, type = 'button' }) => {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${v} ${s} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;

