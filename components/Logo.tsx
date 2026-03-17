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
    >
      <defs>
        <linearGradient id="metalBladeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="bloodRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
          <stop offset="50%" stopColor="#b91c1c" stopOpacity="1" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity="1" />
        </linearGradient>
        <filter id="slayerGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Extreme Symmetrical Thrash Blades */}
      <path 
        d="M50 0 L25 20 L35 35 L0 50 L35 65 L25 90 L50 70 L75 90 L65 65 L100 50 L65 35 L75 20 Z" 
        fill="url(#metalBladeGrad)" 
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="miter"
        strokeMiterlimit="10"
      />

      {/* Secondary Internal Pentagram/Star overlay */}
      <path 
        d="M50 15 L75 80 L20 40 L80 40 L25 80 Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeOpacity="0.3"
        fill="none"
        strokeLinejoin="miter"
      />

      {/* Aggressive Center Lightning Bolt (Slayer / Metal style) */}
      <path 
        d="M65 5 L35 50 L55 50 L20 100 L50 60 L30 60 L75 5 Z" 
        fill="url(#bloodRedGrad)" 
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinejoin="miter"
        strokeMiterlimit="10"
        filter="url(#slayerGlow)"
        className="drop-shadow-2xl"
      />

      {/* Edge Rivets / Particles */}
      <circle cx="50" cy="12" r="1.5" fill="currentColor" />
      <circle cx="85" cy="50" r="1.5" fill="currentColor" />
      <circle cx="15" cy="50" r="1.5" fill="currentColor" />
      <circle cx="50" cy="85" r="1.5" fill="currentColor" />
    </svg>
  );
};
