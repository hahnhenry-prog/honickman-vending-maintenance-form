import { useState } from "react";
import { PhysicalLayout, PhysicalButton } from "../data";

interface Props {
  layout: PhysicalLayout;
  machineLabel: string;
}

// ── Shared button renderer ────────────────────────────────────────────────────

function DiagramButton({
  btn,
  size,
}: {
  btn: PhysicalButton;
  size: "sm" | "lg";
}) {
  const sm = size === "sm";
  const colLabel = btn.columns.length > 0
    ? btn.columns.map((c) => `Col ${c + 1}`).join(" & ")
    : null;
  const isLinked = btn.columns.length > 1;

  if (btn.inactive) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 ${
          sm ? "w-7 h-7" : "w-14 h-14"
        }`}
      >
        {!sm && (
          <span className="text-[8px] text-gray-400 font-medium text-center leading-tight px-1">
            Card Reader
          </span>
        )}
        {sm && <span className="text-[8px] text-gray-400">—</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`flex items-center justify-center rounded border-2 border-gray-700 bg-white font-bold text-gray-800 ${
          sm ? "w-7 h-7 text-[10px]" : "w-14 h-14 text-base"
        }`}
      >
        {btn.number}
      </div>
      {!sm && colLabel && (
        <span className="text-[9px] text-gray-400 text-center leading-tight">
          {colLabel}
        </span>
      )}
    </div>
  );
}

// ── Panel renderer ────────────────────────────────────────────────────────────

function DiagramPanel({
  rows,
  size,
}: {
  rows: PhysicalButton[][];
  size: "sm" | "lg";
}) {
  const gap = size === "sm" ? "gap-1" : "gap-2";
  return (
    <div className={`flex flex-col ${gap}`}>
      {rows.map((row, ri) => (
        <div key={ri} className={`flex ${gap}`}>
          {row.map((btn) => (
            <DiagramButton key={btn.number} btn={btn} size={size} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Center payment column ─────────────────────────────────────────────────────

function PaymentColumn({ size }: { size: "sm" | "lg" }) {
  return (
    <div className={size === "sm" ? "w-2" : "w-4"} />
  );
}

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function MiniButton({ btn }: { btn: PhysicalButton }) {
  if (btn.inactive) {
    return <div className="w-3 h-3 rounded border border-dashed border-gray-300 bg-gray-100" />;
  }
  return (
    <div className="w-3 h-3 rounded border border-gray-500 bg-white flex items-center justify-center">
      <span className="text-[6px] font-bold text-gray-700 leading-none">{btn.number}</span>
    </div>
  );
}

function Thumbnail({ layout, onClick }: { layout: PhysicalLayout; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="View button map"
      className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all flex-shrink-0 group"
    >
      {/* Mini grid */}
      <div className="flex items-center gap-0.5">
        <div className="flex flex-col gap-0.5">
          {layout.leftPanel.map((row, ri) => (
            <div key={ri} className="flex gap-0.5">
              {row.map((btn) => <MiniButton key={btn.number} btn={btn} />)}
            </div>
          ))}
        </div>
        <div className="w-0.5" />
        <div className="flex flex-col gap-0.5">
          {layout.rightPanel.map((row, ri) => (
            <div key={ri} className="flex gap-0.5">
              {row.map((btn) => <MiniButton key={btn.number} btn={btn} />)}
            </div>
          ))}
        </div>
      </div>
      <span className="text-[9px] text-gray-400 group-hover:text-gray-600 transition-colors font-medium leading-tight text-center">
        Button Map
      </span>
      <span className="text-[8px] text-gray-400 group-hover:text-gray-600 transition-colors leading-tight text-center">
        Click to enlarge
      </span>
    </button>
  );
}

// ── Full diagram modal ────────────────────────────────────────────────────────

function DiagramModal({
  layout,
  machineLabel,
  onClose,
}: {
  layout: PhysicalLayout;
  machineLabel: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="font-semibold text-[var(--color-secondary)]" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Button Layout — {machineLabel}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Physical button positions on the machine door
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Diagram */}
        <div className="px-8 py-8">
          {/* Machine outline */}
          <div className="rounded-2xl border-2 border-gray-200 bg-[#f0eeeb] p-5">
            <div className="flex items-center justify-center gap-4">
              <DiagramPanel rows={layout.leftPanel} size="lg" />
              <PaymentColumn size="lg" />
              <DiagramPanel rows={layout.rightPanel} size="lg" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export default function MachineLayoutDiagram({ layout, machineLabel }: Props) {
  const [open, setOpen] = useState(false);
  if (!layout?.leftPanel) return null;
  return (
    <>
      <Thumbnail layout={layout} onClick={() => setOpen(true)} />
      {open && (
        <DiagramModal
          layout={layout}
          machineLabel={machineLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
