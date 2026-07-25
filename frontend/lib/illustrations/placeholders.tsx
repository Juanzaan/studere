/**
 * Placeholder SVG illustrations for the IllustrationScene component.
 * Each layer is a <g data-layer-name="..."> so GSAP can target them individually.
 *
 * When you get your Blush SVGs, replace these. Keep the data-layer-name convention.
 */

export function PlaceholderStudy({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background circle */}
      <g data-layer-name="bg-circle">
        <circle cx="100" cy="90" r="80" className="fill-c-blue-soft" opacity="0.4" />
      </g>

      {/* Book / document shape */}
      <g data-layer-name="book">
        <rect x="70" y="55" width="60" height="75" rx="4" className="fill-c-surface-2 stroke-c-border" strokeWidth="1.5" />
        <line x1="82" y1="72" x2="118" y2="72" className="stroke-c-muted" strokeWidth="2" strokeLinecap="round" />
        <line x1="82" y1="82" x2="118" y2="82" className="stroke-c-muted" strokeWidth="2" strokeLinecap="round" />
        <line x1="82" y1="92" x2="108" y2="92" className="stroke-c-muted" strokeWidth="2" strokeLinecap="round" />
        <line x1="82" y1="102" x2="112" y2="102" className="stroke-c-muted" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Lightbulb / idea icon */}
      <g data-layer-name="lightbulb">
        <path
          d="M130 45c-3-3-8-5-14-5-6 0-11 2-14 5m14 12v10m-4 5h8"
          className="stroke-c-amber"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M116 40a14 14 0 1 1 0 20 14 14 0 0 1 0-20z"
          className="fill-c-amber-soft stroke-c-amber"
          strokeWidth="1.5"
        />
      </g>

      {/* Sparkle dots */}
      <g data-layer-name="sparkles">
        <circle cx="64" cy="46" r="3" className="fill-c-violet" opacity="0.6" />
        <circle cx="140" cy="38" r="2" className="fill-c-violet" opacity="0.4" />
        <circle cx="58" cy="126" r="2.5" className="fill-c-teal" opacity="0.5" />
        <circle cx="145" cy="128" r="2" className="fill-c-teal" opacity="0.4" />
      </g>

      {/* Floating abstract shape */}
      <g data-layer-name="abstract-1">
        <path
          d="M158 70q4-6 10-2t-2 10-10 2q-4-6 2-10z"
          className="fill-c-blue"
          opacity="0.15"
        />
      </g>
    </svg>
  );
}

export function PlaceholderEmptyState({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background */}
      <g data-layer-name="bg">
        <rect x="20" y="20" width="160" height="120" rx="12" className="fill-c-surface-2 stroke-c-border" strokeWidth="1" strokeDasharray="4 3" />
      </g>

      {/* Folder / box */}
      <g data-layer-name="box">
        <rect x="60" y="50" width="80" height="60" rx="6" className="fill-c-surface stroke-c-border" strokeWidth="1.5" />
        <path d="M60 56h80v12H60z" className="fill-c-blue-soft stroke-c-blue-border" strokeWidth="1" rx="3" />
      </g>

      {/* Magnifying glass */}
      <g data-layer-name="magnifier">
        <circle cx="118" cy="82" r="16" className="stroke-c-violet" strokeWidth="2" fill="none" />
        <line x1="130" y1="94" x2="140" y2="104" className="stroke-c-violet" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Small decorative dots */}
      <g data-layer-name="dots">
        <circle cx="48" cy="40" r="2" className="fill-c-muted" opacity="0.3" />
        <circle cx="152" cy="38" r="2.5" className="fill-c-muted" opacity="0.25" />
        <circle cx="44" cy="134" r="2" className="fill-c-muted" opacity="0.2" />
        <circle cx="156" cy="132" r="3" className="fill-c-muted" opacity="0.15" />
      </g>
    </svg>
  );
}

export function PlaceholderCelebration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background glow */}
      <g data-layer-name="glow">
        <circle cx="100" cy="85" r="70" className="fill-c-amber-soft" opacity="0.3" />
      </g>

      {/* Star (main) */}
      <g data-layer-name="star-main">
        <path
          d="M100 40l8 24h26l-21 15 8 25-21-16-21 16 8-25-21-15h26z"
          className="fill-c-amber stroke-c-amber"
          strokeWidth="1"
        />
      </g>

      {/* Small stars */}
      <g data-layer-name="stars-small">
        <path
          d="M52 52l3 9h11l-7 5 3 10-8-6-8 6 3-10-7-5h11z"
          className="fill-c-violet"
          opacity="0.6"
        />
        <path
          d="M148 45l2 6h8l-5 4 2 7-6-5-6 5 2-7-5-4h8z"
          className="fill-c-teal"
          opacity="0.5"
        />
      </g>

      {/* Confetti / decorative lines */}
      <g data-layer-name="confetti">
        <line x1="46" y1="100" x2="54" y2="96" className="stroke-c-blue" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <line x1="154" y1="108" x2="162" y2="104" className="stroke-c-teal" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <line x1="40" y1="130" x2="48" y2="126" className="stroke-c-violet" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        <line x1="150" y1="132" x2="158" y2="128" className="stroke-c-amber" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        <circle cx="38" cy="115" r="2" className="fill-c-blue" opacity="0.4" />
        <circle cx="162" cy="118" r="2.5" className="fill-c-violet" opacity="0.35" />
      </g>

      {/* Pulse rings */}
      <g data-layer-name="rings">
        <circle cx="100" cy="85" r="50" className="stroke-c-amber" strokeWidth="1" opacity="0.15" strokeDasharray="3 3" />
      </g>
    </svg>
  );
}

export const PLACEHOLDER_MAP = {
  "placeholder-study": PlaceholderStudy,
  "placeholder-empty": PlaceholderEmptyState,
  "placeholder-celebration": PlaceholderCelebration,
} as const;
