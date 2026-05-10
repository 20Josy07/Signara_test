import { useState } from 'react'

/**
 * Logo
 * Renders the Signara mark.
 *
 * Loading order:
 *   1. /logo.png  (drop your real logo file there - preferred)
 *   2. /logo.svg  (vector version in /public)
 *   3. Inline SVG fallback (always works, no network required)
 */
export default function Logo({ size = 96, className = '', src = '/logo.png' }) {
  const [failed, setFailed] = useState(false)

  if (!failed && src) {
    return (
      <img
        src={src}
        alt="Signara"
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={"object-contain " + className}
        style={{ width: size, height: size }}
        draggable={false}
      />
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Signara logo"
    >
      <defs>
        <linearGradient id="signara-left" x1="0" y1="0.2" x2="1" y2="1">
          <stop offset="0%" stopColor="#1F40C2" />
          <stop offset="100%" stopColor="#3A4FE0" />
        </linearGradient>
        <linearGradient id="signara-right" x1="0" y1="0.2" x2="1" y2="1">
          <stop offset="0%" stopColor="#7B3FBF" />
          <stop offset="100%" stopColor="#5B3FA8" />
        </linearGradient>
        <linearGradient id="signara-base" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1F40C2" />
          <stop offset="100%" stopColor="#7060A8" />
        </linearGradient>
      </defs>
      <path d="M55 205 C 25 190, 15 140, 38 105 C 60 75, 100 70, 135 95 L 150 130 C 140 145, 100 150, 80 145 Z" fill="url(#signara-left)" />
      <path d="M245 205 C 275 190, 285 140, 262 105 C 240 75, 200 70, 165 95 L 150 130 C 160 145, 200 150, 220 145 Z" fill="url(#signara-right)" />
      <rect x="135" y="138" width="9"  height="34" rx="2" fill="#1F2675" />
      <rect x="148" y="125" width="9"  height="47" rx="2" fill="#1F2675" />
      <rect x="161" y="148" width="9"  height="24" rx="2" fill="#1F2675" />
      <path d="M55 205 C 110 230, 190 230, 245 205" stroke="url(#signara-base)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M30 120 q -10 18 0 36" stroke="#1F40C2" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M16 105 q -16 30 0 66" stroke="#1F40C2" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M270 120 q 10 18 0 36" stroke="#7060A8" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M284 105 q 16 30 0 66" stroke="#7060A8" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  )
}
