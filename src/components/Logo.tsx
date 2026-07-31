/**
 * Premium SVG logo for OnChainAuction.
 * Renders a gavel inside a hexagonal blockchain motif.
 * Props: size (px), className, showText (show wordmark beside icon).
 */
interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export function Logo({ size = 32, className = '', showText = true, textClassName = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Hexagonal background */}
        <path
          d="M24 2L43.0526 13V35L24 46L4.94744 35V13L24 2Z"
          fill="url(#hex-gradient)"
          stroke="url(#hex-stroke)"
          strokeWidth="1.5"
        />
        {/* Inner glow ring */}
        <path
          d="M24 7L38.5 15.5V32.5L24 41L9.5 32.5V15.5L24 7Z"
          fill="none"
          stroke="url(#inner-ring)"
          strokeWidth="0.75"
          opacity="0.4"
        />
        {/* Gavel head */}
        <rect x="14" y="16" width="20" height="7" rx="2" fill="url(#gavel-gradient)" />
        {/* Gavel handle */}
        <rect x="22" y="22" width="4" height="14" rx="1.5" fill="url(#handle-gradient)" />
        {/* Strike block */}
        <rect x="17" y="35" width="14" height="3" rx="1" fill="#D4A853" opacity="0.7" />
        {/* Chain links */}
        <circle cx="11" cy="19.5" r="2" fill="none" stroke="#D4A853" strokeWidth="1.2" opacity="0.5" />
        <circle cx="37" cy="19.5" r="2" fill="none" stroke="#D4A853" strokeWidth="1.2" opacity="0.5" />
        {/* Sparkle dots */}
        <circle cx="24" cy="12" r="1" fill="#D4A853" opacity="0.8" />
        <circle cx="18" cy="14" r="0.6" fill="#D4A853" opacity="0.4" />
        <circle cx="30" cy="14" r="0.6" fill="#D4A853" opacity="0.4" />

        <defs>
          <linearGradient id="hex-gradient" x1="4" y1="2" x2="43" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0C1E3A" />
            <stop offset="1" stopColor="#0A1628" />
          </linearGradient>
          <linearGradient id="hex-stroke" x1="4" y1="2" x2="43" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#D4A853" stopOpacity="0.6" />
            <stop offset="1" stopColor="#D4A853" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="inner-ring" x1="9.5" y1="7" x2="38.5" y2="41" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#D4A853" />
            <stop offset="1" stopColor="#D4A853" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="gavel-gradient" x1="14" y1="16" x2="34" y2="23" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#E8C06A" />
            <stop offset="1" stopColor="#C49338" />
          </linearGradient>
          <linearGradient id="handle-gradient" x1="22" y1="22" x2="26" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#C49338" />
            <stop offset="0.5" stopColor="#A87A2E" />
            <stop offset="1" stopColor="#8B6424" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <span className={`font-black tracking-tight leading-none ${textClassName}`}>
          <span className="text-secondary-container">OnChain</span>
          <span className="text-on-primary">Auction</span>
        </span>
      )}
    </div>
  );
}
