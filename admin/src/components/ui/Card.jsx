import React from 'react';

const Card = ({ className = '', children }) => {
  return (
    <div
      className={`bg-[var(--app-card)] border border-[color:var(--app-border)] rounded-[var(--app-radius-lg)] shadow-[var(--app-shadow)] ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;

