import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
    >
      {/* Outer Hexagon with glowing fill effect */}
      <path 
        d="M30 15 L70 15 L90 50 L70 85 L30 85 L10 50 Z" 
        strokeWidth="8" 
        strokeLinejoin="round" 
        fill="currentColor" 
        fillOpacity="0.15"
      />
      {/* Inner connected nodes (like a batch workflow) */}
      <path 
        d="M30 50 L70 50 M50 25 L50 75" 
        strokeWidth="8" 
        strokeLinecap="round" 
      />
      <circle cx="50" cy="50" r="14" fill="currentColor" stroke="none" />
      <circle cx="30" cy="50" r="6" fill="currentColor" stroke="none" />
      <circle cx="70" cy="50" r="6" fill="currentColor" stroke="none" />
      <circle cx="50" cy="25" r="6" fill="currentColor" stroke="none" />
      <circle cx="50" cy="75" r="6" fill="currentColor" stroke="none" />
    </svg>
  );
};
