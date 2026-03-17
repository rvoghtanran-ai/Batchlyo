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
        <linearGradient id="thunderPrimaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="thunderSecondaryGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
        <filter id="thunderGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Cyber-shield Base */}
      <path 
        d="M50 4 L92 26 L92 74 L50 96 L8 74 L8 26 Z" 
        fill="url(#thunderSecondaryGrad)" 
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.2"
        strokeLinejoin="round"
      />

      {/* Dimensional Edge Accents */}
      <path d="M50 4 L92 26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.8" />
      <path d="M8 74 L50 96" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.8" />
      
      {/* Fierce, Asymmetric Lightning Strike breaking out of the shield */}
      <path 
        d="M62 6 L25 50 L52 50 L38 98 L82 42 L55 42 Z" 
        fill="url(#thunderPrimaryGrad)" 
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="miter"
        strokeMiterlimit="2"
        filter="url(#thunderGlow)"
        className="drop-shadow-2xl"
      />
      
      {/* Dynamic Energy Particles */}
      <circle cx="80" cy="22" r="3" fill="currentColor" fillOpacity="0.9" filter="url(#thunderGlow)" />
      <circle cx="20" cy="80" r="2.5" fill="currentColor" fillOpacity="0.7" />
      <circle cx="85" cy="65" r="1.5" fill="currentColor" fillOpacity="0.4" />
      <circle cx="25" cy="30" r="2" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
};
