import React from 'react';

interface TomatoIconProps {
  status?: 'certified-fresh' | 'fresh' | 'rotten';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const TomatoIcon: React.FC<TomatoIconProps> = ({
  status = 'certified-fresh',
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  if (status === 'rotten') {
    return (
      <svg
        viewBox="0 0 40 40"
        className={`${sizeMap[size]} ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Rotten green splat */}
        <path
          d="M18.5 6C14 8 8 13 8 18C8 23 4 25 5 29C6 33 11 36 17 36C22 36 28 35 32 31C36 27 36 21 34 16C32 11 27 6 23 5C20.5 4.5 19.5 5.5 18.5 6Z"
          fill="#4CAF50"
        />
        <path
          d="M16 12C14 14 11 18 12 21C13 24 16 26 19 25"
          stroke="#388E3C"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Certified Fresh / Fresh
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${sizeMap[size]} ${className} drop-shadow-[0_4px_12px_rgba(250,50,10,0.5)]`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Tomato body */}
      <defs>
        <radialGradient id="tomatoGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FF5233" />
          <stop offset="60%" stopColor="#FA320A" />
          <stop offset="100%" stopColor="#BF1200" />
        </radialGradient>
        <linearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#48BB78" />
          <stop offset="100%" stopColor="#2F855A" />
        </linearGradient>
      </defs>
      {/* Tomato round shape */}
      <circle cx="24" cy="27" r="17" fill="url(#tomatoGrad)" />
      {/* Specular sheen */}
      <ellipse cx="19" cy="19" rx="5" ry="2.5" transform="rotate(-30 19 19)" fill="white" fillOpacity="0.35" />
      {/* Tomato leaves / calyx */}
      <path
        d="M24 12C24 8 26 4 29 3C27 6 26 9 25 11C28 10 32 9 34 10C31 12 28 13 26 14C29 16 33 18 34 20C30 18 27 16 25 15C25 18 25 22 24 24C23 22 23 18 23 15C21 16 18 18 14 20C15 18 19 16 22 14C20 13 17 12 14 10C16 9 20 10 23 11C22 9 21 6 19 3C22 4 24 8 24 12Z"
        fill="url(#leafGrad)"
      />
      {status === 'certified-fresh' && (
        <circle cx="34" cy="14" r="3" fill="#FFD700" stroke="#B7791F" strokeWidth="1" />
      )}
    </svg>
  );
};

interface PopcornIconProps {
  status?: 'fresh' | 'spilled';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const PopcornIcon: React.FC<PopcornIconProps> = ({
  status = 'fresh',
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  if (status === 'spilled') {
    return (
      <svg
        viewBox="0 0 48 48"
        className={`${sizeMap[size]} ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 32L34 38L38 18L14 12L10 32Z"
          fill="#4A5568"
        />
        <circle cx="38" cy="38" r="3" fill="#CBD5E0" />
        <circle cx="42" cy="32" r="2.5" fill="#CBD5E0" />
      </svg>
    );
  }

  // Full Popcorn bucket
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${sizeMap[size]} ${className} drop-shadow-[0_4px_12px_rgba(255,100,50,0.35)]`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bucketGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF4136" />
          <stop offset="100%" stopColor="#B31B1B" />
        </linearGradient>
      </defs>
      {/* Popcorn fluffy top */}
      <g fill="#FFE082">
        <circle cx="17" cy="16" r="6" />
        <circle cx="24" cy="13" r="6.5" />
        <circle cx="31" cy="16" r="6" />
        <circle cx="20" cy="19" r="5" />
        <circle cx="28" cy="19" r="5" />
      </g>
      {/* Bucket */}
      <path
        d="M13 21L17 42H31L35 21H13Z"
        fill="url(#bucketGrad)"
      />
      {/* Bucket stripes */}
      <path d="M19 21L21 42H23L21 21H19Z" fill="#FFFFFF" fillOpacity="0.85" />
      <path d="M27 21L27 42H29L29 21H27Z" fill="#FFFFFF" fillOpacity="0.85" />
    </svg>
  );
};

export const ImdbBadge: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'h-4 px-1 text-[9px]',
    md: 'h-5 px-1.5 text-[11px]',
    lg: 'h-6 px-2 text-[13px]',
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-black rounded tracking-tight bg-[#F5C518] text-neutral-950 font-sans shadow-sm ${sizeMap[size]} ${className}`}
    >
      IMDb
    </span>
  );
};
