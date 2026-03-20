import React from 'react';

const Card = ({ className = '', children }) => {
  return (
    <div
      className={`bg-[var(--app-card)] border border-[color:var(--app-border)] rounded-[var(--app-radius-lg)] shadow-[0_24px_60px_rgba(0,0,0,0.25)] ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;

