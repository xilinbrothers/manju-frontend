import React from 'react';

const styles = {
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-200',
  success: 'bg-green-500/10 border-green-500/20 text-green-200',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-200',
  error: 'bg-red-500/10 border-red-500/20 text-red-200',
};

const AlertBar = ({ type = 'info', message, onClose }) => {
  if (!message) return null;
  const cls = styles[type] || styles.info;
  return (
    <div className={`w-full rounded-2xl border p-4 text-[13px] ${cls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="leading-relaxed">{message}</div>
        {onClose ? (
          <button
            onClick={onClose}
            className="text-[12px] font-black opacity-80 hover:opacity-100 transition-opacity"
          >
            关闭
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default AlertBar;

