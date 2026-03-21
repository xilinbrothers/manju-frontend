import React from 'react';

const PageHeader = ({ title, subtitle, right }) => {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1 min-w-0">
        <div className="text-xl font-black text-slate-900 truncate">{title}</div>
        {subtitle ? <div className="text-sm text-slate-500 font-medium">{subtitle}</div> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
};

export default PageHeader;

