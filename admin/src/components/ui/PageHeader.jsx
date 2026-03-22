import React from 'react';

const SIZE_STYLES = {
  sm: { title: 'text-lg', subtitle: 'text-xs' },
  md: { title: 'text-xl', subtitle: 'text-sm' },
};

const PageHeader = ({ title, subtitle, right, size = 'md', className = '' }) => {
  const styles = SIZE_STYLES[size] || SIZE_STYLES.md;
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="space-y-1 min-w-0">
        <div className={`${styles.title} font-black text-slate-900 truncate`}>{title}</div>
        {subtitle ? <div className={`${styles.subtitle} text-slate-500 font-medium`}>{subtitle}</div> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
};

export default PageHeader;
