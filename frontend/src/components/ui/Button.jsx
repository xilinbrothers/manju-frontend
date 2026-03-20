import React from 'react';

const variants = {
  primary:
    'bg-[var(--app-primary)] hover:bg-[var(--app-primary-hover)] text-white shadow-[0_18px_40px_rgba(59,130,246,0.15)]',
  ghost: 'bg-transparent hover:bg-white/5 text-[color:var(--app-fg)] border border-[color:var(--app-border)]',
};

const Button = ({ variant = 'primary', className = '', disabled, onClick, children, type = 'button' }) => {
  const v = variants[variant] || variants.primary;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`w-full py-3 rounded-[var(--app-radius-md)] font-bold text-[14px] transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${v} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;

