import React from 'react';

const styles = {
  info: 'bg-sky-50 border-sky-200 text-sky-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-rose-50 border-rose-200 text-rose-800',
};

const AlertBar = ({ type = 'info', message, onClose }) => {
  if (!message) return null;
  const cls = styles[type] || styles.info;
  return (
    <div className={`w-full rounded-2xl border p-4 text-sm font-semibold ${cls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="leading-relaxed">{message}</div>
        {onClose ? (
          <button
            onClick={onClose}
            className="text-xs font-black opacity-80 hover:opacity-100 transition-opacity"
          >
            关闭
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default AlertBar;

