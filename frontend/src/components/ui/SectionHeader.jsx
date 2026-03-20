import React from 'react';

const SectionHeader = ({ title, subtitle }) => {
  return (
    <div className="space-y-1">
      <div className="text-[20px] font-black">{title}</div>
      {subtitle ? <div className="text-[12px] text-[color:var(--app-muted)]">{subtitle}</div> : null}
    </div>
  );
};

export default SectionHeader;

