import React from 'react';

export default function Spinner({ size = 'medium', color = 'currentColor', text = '' }) {
  const sizeMap = {
    small: 16,
    medium: 22,
    large: 36
  };

  const dim = sizeMap[size] || 22;

  return (
    <div className={`spinner-container ${size}`}>
      <svg
        className="spinner-svg"
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.25"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {text && <span className="spinner-text">{text}</span>}
    </div>
  );
}
