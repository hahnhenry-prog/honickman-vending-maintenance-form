import { useState } from "react";
import { MACHINE_TYPES } from "../../data";

export const CATEGORY_STYLES = {
  Stack: { pill: "bg-blue-50 text-blue-700" },
  "Glass Front": { pill: "bg-blue-50 text-blue-700" },
  "Smart Cooler": { pill: "bg-blue-50 text-blue-700" },
};


export function MachineTypeSelector({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedType = MACHINE_TYPES.find((t) => t.id === selected);
  const categories = ["Stack", "Glass Front", "Smart Cooler"] as const;

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  // Collapsed state — shows selected machine or a prompt
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all w-full max-w-sm ${
          selectedType
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] hover:border-[var(--color-primary-dark)]"
            : "border-gray-300 bg-white hover:border-gray-400"
        }`}
      >
        {selectedType ? (
          <>
            <div className="flex-1">
              <div className="font-semibold text-sm text-white">{selectedType.label}</div>
              <div className="text-xs mt-0.5 text-white/60">
                {selectedType.shortLabel} ·{" "}
                {selectedType.rows
                  ? `${selectedType.columns} col × ${selectedType.rows} rows`
                  : `${selectedType.columns} columns`}
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs text-white/50 flex-shrink-0">
              Change
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-500 flex-1">Select machine type…</span>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>
    );
  }

  // Expanded state — inline card grid
  return (
    <div className="rounded-xl border border-gray-200 bg-[#f8f7f5] p-5 space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Select Machine Type
        </span>
        {selectedType && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-gray-500 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
      {categories.map((cat) => {
        const types = MACHINE_TYPES.filter((t) => t.category === cat);
        const style = CATEGORY_STYLES[cat];
        return (
          <div key={cat}>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
              {cat}
            </div>
            <div className="flex gap-3 flex-wrap">
              {types.map((type) => {
                const isSelected = selected === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleSelect(type.id)}
                    className={`relative flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                        : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <span className={`font-semibold text-sm leading-tight ${isSelected ? "text-white" : "text-[var(--color-secondary)]"}`}>
                      {type.label}
                    </span>
                    <span className={`text-xs ${isSelected ? "text-white/60" : "text-gray-500"}`}>
                      {type.shortLabel}
                    </span>
                    <span className={`text-[11px] mt-1.5 px-2 py-0.5 rounded-full font-medium ${isSelected ? "bg-white/20 text-white" : style.pill}`}>
                      {type.rows
                        ? `${type.columns} col × ${type.rows} rows`
                        : `${type.columns} columns`}
                    </span>
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Machines Section ──────────────────────────────────────────────────────────

