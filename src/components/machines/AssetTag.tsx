import { useState } from "react";

export function AssetTagSVG({ scale = 1, suffix = "" }: { scale?: number; suffix?: string }) {
  const w = 220 * scale;
  const h = 76 * scale;
  const r = 8 * scale;
  const fs = scale;

  // Simplified barcode: alternating bar widths
  const bars = [2,1,3,1,2,1,1,2,1,3,1,2,1,1,2,1,2,1,3,1,1,2,1,2,1,1,3,1,2,1];
  let bx = 0;
  const totalBW = bars.reduce((a, b) => a + b, 0);

  return (
    <svg width={w} height={h} viewBox={`0 0 220 76`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tag body */}
      <rect x="1" y="1" width="218" height="74" rx={r / scale} ry={r / scale} fill="#f0eeeb" stroke="#c8c4bc" strokeWidth="1.5" />
      {/* Left screw */}
      <circle cx="14" cy="38" r="5" fill="#d0cdc8" stroke="#b0ada8" strokeWidth="1" />
      <circle cx="14" cy="38" r="2" fill="#b8b4b0" />
      <line x1="12" y1="38" x2="16" y2="38" stroke="#909090" strokeWidth="0.8" />
      <line x1="14" y1="36" x2="14" y2="40" stroke="#909090" strokeWidth="0.8" />
      {/* Right screw */}
      <circle cx="206" cy="38" r="5" fill="#d0cdc8" stroke="#b0ada8" strokeWidth="1" />
      <circle cx="206" cy="38" r="2" fill="#b8b4b0" />
      <line x1="204" y1="38" x2="208" y2="38" stroke="#909090" strokeWidth="0.8" />
      <line x1="206" y1="36" x2="206" y2="40" stroke="#909090" strokeWidth="0.8" />
      {/* Header text */}
      <text x="110" y="15" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7" fill="#1a1a1a" letterSpacing="0.5">PEPSI-COLA BOTTLING CO. OF N.Y.</text>
      {/* Barcode */}
      {(() => {
        const barX = 28;
        const barY = 19;
        const barH = 22;
        const totalW = 164;
        let cx = barX;
        return bars.map((bw, i) => {
          const scaled = (bw / totalBW) * totalW;
          const el = i % 2 === 0 ? (
            <rect key={i} x={cx} y={barY} width={scaled} height={barH} fill="#1a1a1a" />
          ) : null;
          cx += scaled;
          return el;
        });
      })()}
      {/* Number line */}
      <text x="110" y="56" textAnchor="middle" fontFamily="'Courier New', monospace" fontWeight="700" fontSize="11" fill="#1a1a1a" letterSpacing="1">
        <tspan fill="#555">0700</tspan>
        <tspan fill={suffix ? "var(--color-primary)" : "#aaa"}>{suffix ? suffix.padEnd(6, "X") : "XXXXXX"}</tspan>
      </text>
      {/* Arrow annotation — only shown in modal */}
    </svg>
  );
}


export function AssetTagDiagram({ suffix }: { suffix: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Thumbnail */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="View asset tag location"
        className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all flex-shrink-0 group"
      >
        <div className="pointer-events-none" style={{ transform: "scale(0.44)", transformOrigin: "top left", width: 97, height: 33 }}>
          <AssetTagSVG suffix={suffix} />
        </div>
        <span className="text-[9px] text-gray-500 group-hover:text-gray-600 transition-colors font-medium leading-tight text-center">
          Click to<br />enlarge
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <div className="font-semibold text-[var(--color-secondary)]" style={{ fontFamily: "var(--font-display)" }}>
                  Where to find the Asset Number
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Look for the PCNY tag affixed to the machine body
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg text-gray-500 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xl leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <div className="px-8 py-8 space-y-4">
              {/* Large tag illustration */}
              <div className="rounded-2xl border-2 border-gray-200 bg-[#d8d5d0] p-6 flex items-center justify-center">
                <div className="relative">
                  <AssetTagSVG scale={1.35} suffix={suffix || "173240"} />
                  {/* Callout arrow pointing at the suffix */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-px h-6 bg-[var(--color-primary)]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] -mt-0.5" />
                  </div>
                </div>
              </div>

              {/* Callout label */}
              <div className="text-center pt-4">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                  <span className="font-mono font-bold text-sm text-[var(--color-primary)]">0700</span>
                  <span className="text-xs text-gray-500">then the</span>
                  <span className="font-mono font-bold text-sm text-[var(--color-primary)]">6-digit number</span>
                  <span className="text-xs text-gray-500">after it</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Enter only the last 6 digits — the <span className="font-mono font-semibold text-gray-500">0700</span> prefix is added automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Machine Type Selector ─────────────────────────────────────────────────────

