"use client";
import { ShieldCheck, BadgeCheck, IndianRupee, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * 3D trust medallions (LA-337).
 *
 * Copy is limited to claims confirmed as factually true for the platform:
 * RERA verification, identity checks, zero commission, encrypted payments.
 * Do not add "escrow", "guaranteed transactions" or fraud-tolerance wording —
 * NxtSft.com does not hold funds, and the footer disclaims broker status.
 */
type Badge = { id: string; Icon: LucideIcon; top: string; bottom: string };

const BADGES: Badge[] = [
  { id: "rera", Icon: ShieldCheck, top: "RERA Verified", bottom: "Every Listing Checked" },
  { id: "owner", Icon: BadgeCheck, top: "Verified Owners", bottom: "Identity Confirmed" },
  { id: "commission", Icon: IndianRupee, top: "Zero Commission", bottom: "No Brokerage Fees" },
  { id: "payments", Icon: Lock, top: "Secure Payments", bottom: "Encrypted Checkout" },
];

/**
 * Ring text arcs. Both run left→right so glyphs read normally; the top arc
 * sweeps through the top (sweep-flag 1) and the bottom through the bottom
 * (sweep-flag 0), which keeps the bottom lettering upright rather than
 * inverted. Coordinates are in the coin-face frame centred on (70,70).
 */
const ARC_TOP = "M 20,70 a 50,50 0 0,1 100,0";
const ARC_BOTTOM = "M 23,70 a 47,47 0 0,0 94,0";

/** Four-point lozenge separating the top and bottom inscriptions. */
const pip = (x: number) => `M ${x},66 L ${x + 2.4},70 L ${x},74 L ${x - 2.4},70 Z`;

function TrustMedallion({ id, Icon, top, bottom }: Badge) {
  const u = (part: string) => `${id}-${part}`;

  return (
    <li className="coin-scene group flex flex-col items-center">
      <div className="coin-tilt">
        <svg
          viewBox="0 0 140 140"
          className="h-32 w-[7.4rem] shrink-0 sm:h-36 sm:w-[8.3rem]"
          role="img"
          aria-label={`${top} — ${bottom}`}
        >
          <defs>
            {/* Struck metal: alternating specular and shadowed stops around a
                raked light axis. A single-hue gradient reads as plastic. */}
            <linearGradient id={u("metal")} gradientTransform="rotate(115 0.5 0.5)">
              <stop offset="0%" stopColor="#7A5A1B" />
              <stop offset="18%" stopColor="#E3C169" />
              <stop offset="34%" stopColor="#FFF6D8" />
              <stop offset="50%" stopColor="#C79A32" />
              <stop offset="68%" stopColor="#8A6620" />
              <stop offset="84%" stopColor="#EBCE7C" />
              <stop offset="100%" stopColor="#6E5117" />
            </linearGradient>

            {/* Rim bevel — light from upper-left, shadow lower-right. */}
            <linearGradient id={u("bevel")} x1="0.18" y1="0" x2="0.82" y2="1">
              <stop offset="0%" stopColor="#FFF3CE" />
              <stop offset="45%" stopColor="#B98E2C" />
              <stop offset="100%" stopColor="#5F4614" />
            </linearGradient>

            {/* Coin side wall: darkest at the bottom of the barrel. */}
            <linearGradient id={u("side")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A87F26" />
              <stop offset="55%" stopColor="#6B4E15" />
              <stop offset="100%" stopColor="#3E2D0B" />
            </linearGradient>

            {/* Field: domed, vignetted navy. */}
            <radialGradient id={u("field")} cx="0.36" cy="0.3" r="0.85">
              <stop offset="0%" stopColor="#1B2A4A" />
              <stop offset="62%" stopColor="#101B33" />
              <stop offset="100%" stopColor="#070D1C" />
            </radialGradient>

            {/* Specular sheen across the upper-left quadrant. */}
            <radialGradient id={u("sheen")} cx="0.3" cy="0.24" r="0.6">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>

            {/* Warm halo behind the coin so it lifts off any background. */}
            <radialGradient id={u("halo")}>
              <stop offset="0%" stopColor="#E3C169" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#E3C169" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#E3C169" stopOpacity="0" />
            </radialGradient>

            {/* Soft-edged contact shadow — a hard ellipse reads as a sticker. */}
            <radialGradient id={u("floor")}>
              <stop offset="0%" stopColor="#04070F" stopOpacity="0.38" />
              <stop offset="60%" stopColor="#04070F" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#04070F" stopOpacity="0" />
            </radialGradient>

            {/* Travelling light bar for the periodic sweep. */}
            <linearGradient id={u("sweep")} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <clipPath id={u("face-clip")}>
              <circle cx="70" cy="70" r="61" />
            </clipPath>

            <path id={u("arc-top")} d={ARC_TOP} fill="none" />
            <path id={u("arc-bottom")} d={ARC_BOTTOM} fill="none" />
          </defs>

          {/* Gold ambience behind the coin */}
          <circle cx="70" cy="70" r="69" fill={`url(#${u("halo")})`} />

          {/* ── Coin face ── */}
          <g>
            {/* Reeded (milled) edge — the coin tell. */}
            <circle
              cx="70"
              cy="70"
              r="66"
              fill="none"
              stroke={`url(#${u("metal")})`}
              strokeWidth="6"
              strokeDasharray="1.5 2.4"
            />
            {/* Beveled rim */}
            <circle cx="70" cy="70" r="63.5" fill="none" stroke={`url(#${u("bevel")})`} strokeWidth="3" />
            <circle cx="70" cy="70" r="61.6" fill="none" stroke="#050A16" strokeOpacity="0.55" />

            {/* Field */}
            <circle cx="70" cy="70" r="61" fill={`url(#${u("field")})`} />

            {/* Guilloché — engine-turned engraving, barely there. */}
            <circle cx="70" cy="70" r="55" fill="none" stroke="#E3C169" strokeOpacity="0.09" strokeDasharray="0.6 2" />
            <circle cx="70" cy="70" r="43" fill="none" stroke="#E3C169" strokeOpacity="0.07" strokeDasharray="0.6 3" />

            {/* Inscription. Shadow copy sits 0.6 below to sink the letters in. */}
            <g style={{ textTransform: "uppercase" }}>
              <text fontSize="9" fontWeight="700" letterSpacing="1.15" fill="#050A16" fillOpacity="0.6">
                <textPath href={`#${u("arc-top")}`} startOffset="50%" textAnchor="middle" dy="0.7">
                  {top}
                </textPath>
              </text>
              <text fontSize="9" fontWeight="700" letterSpacing="1.15" fill={`url(#${u("metal")})`}>
                <textPath href={`#${u("arc-top")}`} startOffset="50%" textAnchor="middle">
                  {top}
                </textPath>
              </text>

              <text fontSize="6.6" fontWeight="600" letterSpacing="0.8" fill="#050A16" fillOpacity="0.5">
                <textPath href={`#${u("arc-bottom")}`} startOffset="50%" textAnchor="middle" dy="0.6">
                  {bottom}
                </textPath>
              </text>
              <text fontSize="6.6" fontWeight="600" letterSpacing="0.8" fill="#E8D6A0" fillOpacity="0.78">
                <textPath href={`#${u("arc-bottom")}`} startOffset="50%" textAnchor="middle">
                  {bottom}
                </textPath>
              </text>
            </g>

            {/* Pips close the inscription band at 9 and 3 o'clock. */}
            <path d={pip(20.5)} fill={`url(#${u("metal")})`} />
            <path d={pip(119.5)} fill={`url(#${u("metal")})`} />

            {/* Raised inner boss */}
            <circle cx="70" cy="70" r="38" fill="none" stroke={`url(#${u("bevel")})`} strokeWidth="1.6" />
            <circle cx="70" cy="70" r="36.6" fill="none" stroke="#050A16" strokeOpacity="0.5" />

            <Icon x={53} y={53} width={34} height={34} stroke="#F4E2A8" strokeWidth={1.4} />

            {/* Static sheen + travelling sweep, clipped to the face. */}
            <circle cx="70" cy="70" r="66" fill={`url(#${u("sheen")})`} pointerEvents="none" />
            <g clipPath={`url(#${u("face-clip")})`} pointerEvents="none">
              <rect
                className="coin-sweep"
                x="-40"
                y="-10"
                width="52"
                height="150"
                fill={`url(#${u("sweep")})`}
                transform="skewX(-18)"
              />
            </g>
          </g>
        </svg>
      </div>

      <style jsx>{`
        .coin-scene {
          perspective: 700px;
        }
        .coin-tilt {
          transform-style: preserve-3d;
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (hover: hover) and (prefers-reduced-motion: no-preference) {
          .coin-scene:hover .coin-tilt {
            transform: rotateX(14deg) rotateY(-10deg) translateY(-4px) scale(1.05);
          }
        }
        .coin-sweep {
          animation: coin-sweep 4.6s ease-in-out infinite;
        }
        @keyframes coin-sweep {
          0%,
          62% {
            transform: skewX(-18deg) translateX(-70px);
          }
          82%,
          100% {
            transform: skewX(-18deg) translateX(210px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .coin-sweep {
            animation: none;
          }
        }
      `}</style>
    </li>
  );
}

export function TrustBadges({ className = "" }: { className?: string }) {
  return (
    <ul
      className={`flex flex-wrap items-start justify-center gap-x-7 gap-y-6 sm:gap-x-12 ${className}`}
      aria-label="Trust and safety"
    >
      {BADGES.map((badge) => (
        <TrustMedallion key={badge.id} {...badge} />
      ))}
    </ul>
  );
}

/** Full-width band — used between the hero and the press marquee. */
export function TrustBand() {
  return (
    <section className="border-y border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6">
        <TrustBadges />
      </div>
    </section>
  );
}
