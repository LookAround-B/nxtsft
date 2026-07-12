export function PropertyIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none relative select-none ${className}`} aria-hidden>
      <div className="animate-float">
        <svg width="280" height="260" viewBox="0 0 280 260" fill="none">
          {/* shadow */}
          <ellipse cx="140" cy="250" rx="90" ry="8" fill="oklch(0.20 0.07 258)" opacity="0.06" />
          {/* body */}
          <rect
            x="50"
            y="110"
            width="180"
            height="132"
            rx="10"
            fill="oklch(0.20 0.07 258)"
            opacity="0.05"
          />
          <rect
            x="50"
            y="110"
            width="180"
            height="132"
            rx="10"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="1.2"
            opacity="0.18"
          />
          {/* roof */}
          <path d="M140 28 L242 110 L38 110 Z" fill="oklch(0.20 0.07 258)" opacity="0.08" />
          <path
            d="M140 28 L242 110 L38 110 Z"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity="0.3"
          />
          {/* chimney */}
          <rect
            x="188"
            y="54"
            width="14"
            height="38"
            rx="3"
            fill="oklch(0.20 0.07 258)"
            opacity="0.1"
          />
          <rect
            x="186"
            y="50"
            width="18"
            height="8"
            rx="2"
            fill="oklch(0.20 0.07 258)"
            opacity="0.12"
          />
          {/* left window */}
          <rect
            x="72"
            y="130"
            width="48"
            height="42"
            rx="5"
            fill="oklch(0.72 0.12 186)"
            opacity="0.12"
          />
          <rect
            x="72"
            y="130"
            width="48"
            height="42"
            rx="5"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="1"
            opacity="0.3"
          />
          <line
            x1="96"
            y1="130"
            x2="96"
            y2="172"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="0.8"
            opacity="0.5"
          />
          <line
            x1="72"
            y1="151"
            x2="120"
            y2="151"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="0.8"
            opacity="0.5"
          />
          {/* right window */}
          <rect
            x="160"
            y="130"
            width="48"
            height="42"
            rx="5"
            fill="oklch(0.72 0.12 186)"
            opacity="0.12"
          />
          <rect
            x="160"
            y="130"
            width="48"
            height="42"
            rx="5"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="1"
            opacity="0.3"
          />
          <line
            x1="184"
            y1="130"
            x2="184"
            y2="172"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="0.8"
            opacity="0.5"
          />
          <line
            x1="160"
            y1="151"
            x2="208"
            y2="151"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="0.8"
            opacity="0.5"
          />
          {/* door */}
          <rect
            x="112"
            y="182"
            width="56"
            height="60"
            rx="5"
            fill="oklch(0.20 0.07 258)"
            opacity="0.07"
          />
          <rect
            x="112"
            y="182"
            width="56"
            height="60"
            rx="5"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="1"
            opacity="0.2"
          />
          <path
            d="M112 186 Q140 163 168 186"
            fill="none"
            stroke="oklch(0.72 0.12 186)"
            strokeWidth="1.2"
            opacity="0.3"
          />
          <circle cx="162" cy="212" r="3.5" fill="oklch(0.76 0.14 76)" opacity="0.7" />
          {/* trees */}
          <ellipse cx="28" cy="204" rx="16" ry="18" fill="oklch(0.72 0.12 186)" opacity="0.1" />
          <rect
            x="25"
            y="220"
            width="6"
            height="22"
            rx="3"
            fill="oklch(0.20 0.07 258)"
            opacity="0.08"
          />
          <ellipse cx="252" cy="200" rx="16" ry="18" fill="oklch(0.72 0.12 186)" opacity="0.1" />
          <rect
            x="249"
            y="216"
            width="6"
            height="26"
            rx="3"
            fill="oklch(0.20 0.07 258)"
            opacity="0.08"
          />
          {/* ground */}
          <rect
            x="38"
            y="241"
            width="204"
            height="3"
            rx="1.5"
            fill="oklch(0.20 0.07 258)"
            opacity="0.07"
          />
          {/* decorative dots */}
          <circle cx="18" cy="95" r="5.5" fill="oklch(0.76 0.14 76)" opacity="0.45" />
          <circle cx="262" cy="72" r="4.5" fill="oklch(0.72 0.12 186)" opacity="0.4" />
          <circle cx="258" cy="200" r="4" fill="oklch(0.76 0.14 76)" opacity="0.3" />
          <circle cx="20" cy="175" r="3" fill="oklch(0.72 0.12 186)" opacity="0.3" />
        </svg>
      </div>
      {/* floating badges */}
      <div className="absolute -top-3 right-4 animate-float-slow rounded-xl border border-border bg-white px-3 py-1.5 shadow-lg">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-emerald-500">✓</span>
          <span className="font-semibold text-navy">RERA Verified</span>
        </div>
      </div>
      <div className="absolute bottom-14 -left-5 animate-float-r rounded-xl border border-border bg-white px-3 py-1.5 shadow-lg">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-amber-400">★</span>
          <span className="font-semibold text-navy">4.8 Rating</span>
        </div>
      </div>
      <div
        className="absolute bottom-28 right-0 animate-float rounded-xl border border-border bg-white px-3 py-1.5 shadow-lg"
        style={{ animationDelay: "1.2s" }}
      >
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-accent">₹0</span>
          <span className="font-semibold text-navy">Commission</span>
        </div>
      </div>
    </div>
  );
}
