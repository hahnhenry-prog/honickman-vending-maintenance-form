import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MachineEntry, SlotAssignment } from "../types";
import { MACHINE_TYPES, MachineType, ButtonGroup } from "../data";
import MachineLayoutDiagram from "./MachineLayoutDiagram";
import { searchProducts, DbProduct } from "../lib/supabase";
import { getFilterForCategory, MachineCategory } from "../lib/filterConfig";

const uid = () => Math.random().toString(36).slice(2, 9);
const colLabel = (i: number) => String.fromCharCode(65 + i);

// Returns which columns to fill when placing a product in a grid machine.
// Rules are defined per machine type and units-per-case.
// rowSlots: map of col -> assignment for the row being edited (used for template detection)
function getGridFanOut(
  machineId: string,
  col: number,
  unitsPerCase: string,
  rowSlots: Record<number, SlotAssignment> = {}
): number[] {
  if (machineId === "pico") {
    if (unitsPerCase === "24") return col <= 3 ? [0, 1, 2, 3] : [4, 5, 6, 7];
    if (unitsPerCase === "12") {
      if (col <= 1) return [0, 1];
      if (col <= 3) return [2, 3];
      if (col <= 5) return [4, 5];
      return [6, 7];
    }
  }

  if (machineId === "dn3800") {
    // 7 cols (A-G). Templates: 4/3, 3/2/2, or full row (7).
    const anchorUnits = rowSlots[0]?.unitsPerCase ?? "";
    const template = anchorUnits === "24" ? "4x" : anchorUnits === "12" ? "3x" : null;

    if (unitsPerCase === "24") {
      // Left side (or first placement): fill A-D
      if (col <= 3) return [0, 1, 2, 3];
      // Right side on a 4/3 row: handled by savePicker (same-product → full row, else blocked)
      return [0, 1, 2, 3, 4, 5, 6];
    }

    if (unitsPerCase === "12") {
      if (template === "4x") {
        // Right side of 4/3 — fill E-G
        return [4, 5, 6];
      }
      // 3/2/2 template
      if (col <= 2) return [0, 1, 2];
      if (col <= 4) return [3, 4];
      return [5, 6];
    }
  }

  if (machineId === "dn5800") {
    // Detect active template from col 0's existing assignment
    const anchorUnits = rowSlots[0]?.unitsPerCase ?? "";
    const template = anchorUnits === "24" ? "5x" : anchorUnits === "12" ? "3x" : null;

    if (unitsPerCase === "24") {
      // Left group always 5, right group always 4
      return col <= 4 ? [0, 1, 2, 3, 4] : [5, 6, 7, 8];
    }

    if (unitsPerCase === "12") {
      // 5/2/2 template (right side of a 24pk row, or standalone)
      if (template === "5x" || col >= 5) {
        return col <= 6 ? [5, 6] : [7, 8];
      }
      // 3/2/2/2 template
      if (col <= 2) return [0, 1, 2];
      if (col <= 4) return [3, 4];
      if (col <= 6) return [5, 6];
      return [7, 8];
    }
  }

  return [col];
}

function getLinkedGroup(colIndex: number, machineType: MachineType): number[] {
  const group = machineType.linkedGroups?.find((g) => g.includes(colIndex));
  return group ?? [colIndex];
}

function slotDisplayLabel(key: string, type: MachineType): string {
  if (!type.rows) return `Column ${parseInt(key) + 1}`;
  const [c, r] = key.split("-").map(Number);
  return `${colLabel(c)}${r + 1}`;
}

// ── Product Picker Modal ──────────────────────────────────────────────────────

function ProductPickerModal({
  current,
  slotLabel,
  machineCategory,
  lockedPrice,
  onSave,
  onClose,
}: {
  current: SlotAssignment | null;
  slotLabel: string;
  machineCategory: MachineCategory;
  lockedPrice: string | null;
  onSave: (a: SlotAssignment | null) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<DbProduct | null>(null);
  const [price, setPrice] = useState(lockedPrice ?? current?.price ?? "");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const machineCategoryRef = useRef(machineCategory);
  const currentProductIdRef = useRef(current?.productId);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const allowedIds = getFilterForCategory(machineCategoryRef.current);
      const data = await searchProducts(q, allowedIds);
      setResults(data);
      if (currentProductIdRef.current) {
        const found = data.find((p) => p.id === currentProductIdRef.current);
        if (found) setSelected((prev) => prev ?? found);
      }
    } catch {
      setError("Could not load products. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    doSearch("");
  }, []);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) return;
    const t = setTimeout(() => doSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (!val.trim()) doSearch("");
  };

  const pick = (p: DbProduct) => setSelected(p);

  const displayName = (p: DbProduct) =>
    [p.brand, p.flavor, p.size, p.material].filter(Boolean).join(" · ");

  const handleApply = () => {
    if (!selected) return;
    onSave({
      productId: selected.id,
      price,
      productDescription: displayName(selected),
      productImageUrl: selected.image_web_url,
      unitsPerCase: selected.unitsPerCase,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <div
              className="font-semibold text-[#0e2d6b]"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Assign Product
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{slotLabel}</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by description or item #..."
            autoFocus={!("ontouchstart" in window)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#174a92]/25 focus:border-[#174a92]"
          />
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
              Loading products…
            </div>
          )}
          {error && !loading && (
            <div className="py-8 text-center text-sm text-red-500">{error}</div>
          )}
          {!loading && !error && results.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              No products found for "{search}"
            </div>
          )}
          {!loading && !error && (
            <div className="space-y-1">
              {results.map((p) => {
                const isSelected = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => pick(p)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? "bg-blue-50 ring-1 ring-[#174a92]/30"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                      {p.image_web_url ? (
                        <img src={p.image_web_url} alt={displayName(p)} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">?</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {p.brand || p.flavor ? (
                        <>
                          <div className="text-sm font-medium text-gray-800 leading-tight truncate">
                            {p.brand && <span>{p.brand}</span>}
                            {p.flavor && <span className="text-gray-500"> · {p.flavor}</span>}
                          </div>
                          {(p.size || p.material) && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {[p.size, p.material].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm font-medium text-gray-800 truncate">{p.description}</div>
                      )}
                      <div className="text-[10px] text-gray-500 mt-0.5">#{p.id}</div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#174a92] flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path
                            d="M1.5 4l2 2 3-3"
                            stroke="white"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Price + actions */}
        <div className="border-t border-gray-100 px-5 py-4 flex-shrink-0 space-y-3">
          {selected && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 w-10 flex-shrink-0">
                Price
              </label>
              {lockedPrice ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <span className="px-3 py-2 text-sm text-gray-500 border-r border-gray-200 select-none">$</span>
                    <span className="px-3 py-2 text-sm font-semibold text-gray-500 w-24">{lockedPrice}</span>
                  </div>
                  <span className="text-xs text-gray-500">per vend</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">machine rate</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <span className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border-r border-gray-300 select-none">$</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-24 px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <span className="text-xs text-gray-500">per vend</span>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            {current ? (
              <button
                onClick={() => onSave(null)}
                className="text-sm text-gray-500 hover:text-[#174a92] transition-colors"
              >
                Clear slot
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!selected}
                className="px-5 py-2 bg-[#174a92] text-white text-sm font-semibold rounded-lg hover:bg-[#0e3585] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Planogram: Stack Column ───────────────────────────────────────────────────

function StackColumn({
  label,
  assignment,
  onClick,
}: {
  label: string;
  assignment: SlotAssignment | null;
  onClick: () => void;
}) {
  const hasProduct = !!assignment?.productId;

  return (
    <button
      onClick={onClick}
      title={hasProduct ? assignment!.productDescription ?? assignment!.productId : `Assign column ${label}`}
      className="flex-shrink-0 w-[80px] rounded-lg border-2 overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
      style={{
        height: 164,
        borderColor: hasProduct ? "#174a9260" : "#e2e0dc",
        borderStyle: hasProduct ? "solid" : "dashed",
      }}
    >
      {/* Column letter header */}
      <div
        className="w-full text-center text-[11px] font-bold py-1.5 leading-none"
        style={{
          backgroundColor: hasProduct ? "#174a92" : "#e8e5e0",
          color: hasProduct ? "white" : "#999",
        }}
      >
        {label}
      </div>
      {/* Slot body */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-2 text-center"
        style={{
          height: "calc(100% - 28px)",
          backgroundColor: hasProduct ? "#174a920d" : "white",
        }}
      >
        {hasProduct ? (
          <>
            {/* Size above image */}
            {assignment!.productDescription?.split(" · ")[2] ? (
              <div className="text-[9px] font-semibold text-[#174a92] mb-0.5 leading-none">
                {assignment!.productDescription.split(" · ")[2]}
              </div>
            ) : null}
            <div className="w-12 h-12 rounded-md overflow-hidden bg-white border border-gray-100 flex-shrink-0">
              {assignment!.productImageUrl ? (
                <img
                  src={assignment!.productImageUrl}
                  alt={assignment!.productDescription ?? ""}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">?</div>
              )}
            </div>
            {/* Brand */}
            <div className="text-[9px] font-semibold text-gray-700 leading-tight text-center w-full mt-1">
              {assignment!.productDescription?.split(" · ")[0] ?? ""}
            </div>
            {/* Flavor */}
            <div className="text-[9px] text-gray-500 leading-tight text-center w-full">
              {assignment!.productDescription?.split(" · ")[1] ?? ""}
            </div>
            {assignment?.price && (
              <div className="text-[11px] font-semibold mt-0.5 text-[#174a92]">
                ${assignment.price}
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-300 text-2xl leading-none select-none">
            +
          </div>
        )}
      </div>
    </button>
  );
}

// ── Planogram: Grid Cell ──────────────────────────────────────────────────────

function GridCell({
  assignment,
  onClick,
  showImages,
}: {
  assignment: SlotAssignment | null;
  onClick: () => void;
  showImages: boolean;
}) {
  const hasProduct = !!assignment?.productId;
  const [brand, flavor, size] = (assignment?.productDescription ?? "").split(" · ");

  return (
    <button
      onClick={onClick}
      title={hasProduct ? (assignment!.productDescription ?? assignment!.productId) : "Assign product"}
      className="w-[84px] h-[80px] rounded-md border-2 flex flex-col items-center justify-center transition-all hover:shadow-sm hover:-translate-y-px active:translate-y-0 flex-shrink-0 overflow-hidden"
      style={
        hasProduct
          ? { backgroundColor: "#174a920d", borderColor: "#174a9240" }
          : { backgroundColor: "white", borderColor: "#e2e0dc", borderStyle: "dashed" }
      }
    >
      {hasProduct ? (
        showImages && assignment!.productImageUrl ? (
          <>
            <img
              src={assignment!.productImageUrl}
              alt={assignment!.productDescription ?? ""}
              className="h-10 w-auto object-contain"
            />
            {assignment?.price && (
              <div className="text-[11px] font-semibold text-[#174a92] mt-1">
                ${assignment.price}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-[10px] font-semibold text-gray-800 leading-tight text-center w-full px-1 truncate">
              {brand}
            </div>
            {flavor && (
              <div className="text-[9px] text-gray-500 leading-tight text-center w-full px-1 truncate">
                {flavor}
              </div>
            )}
            {size && (
              <div className="text-[9px] text-[#174a92] font-medium leading-tight mt-0.5">
                {size}
              </div>
            )}
            {assignment?.price && (
              <div className="text-[11px] font-semibold text-[#174a92] mt-1">
                ${assignment.price}
              </div>
            )}
          </>
        )
      ) : (
        <div className="text-gray-300 text-xl leading-none select-none">+</div>
      )}
    </button>
  );
}

// ── Button Row ───────────────────────────────────────────────────────────────

// COLUMN_W and CONNECTOR_W must match the StackColumn and connector widths below
const COLUMN_W = 80;
const CONNECTOR_W = 20; // width of the link connector between paired columns
const COL_GAP = 8;      // gap-2

function buttonGroupWidth(group: ButtonGroup, linkedGroups: number[][]): number {
  if (group.columns.length === 1) return COLUMN_W;
  // Multi-column group (linked): sum columns + connectors between them
  const linkedGroup = linkedGroups.find((lg) =>
    group.columns.every((c) => lg.includes(c))
  );
  if (!linkedGroup) return group.columns.length * COLUMN_W + (group.columns.length - 1) * COL_GAP;
  return group.columns.length * COLUMN_W + (group.columns.length - 1) * CONNECTOR_W;
}

function ButtonRow({ machineType }: { machineType: MachineType }) {
  if (!machineType.buttonMap) return null;
  const groups = machineType.buttonMap;
  const linkedGroups = machineType.linkedGroups ?? [];

  return (
    <div className="mb-1">
      {/* Label sits above, doesn't affect chip alignment */}
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
        Button #
      </div>

      {/* Two-row layout: chips row then connectors row */}
      <div className="flex flex-col gap-0">
        {/* Row 1: all button chips, top-aligned */}
        <div className="flex gap-2 items-center">
          {groups.map((group, gi) => {
            const w = buttonGroupWidth(group, linkedGroups);
            return (
              <div key={gi} style={{ width: w }} className="flex justify-center flex-shrink-0">
                <div className="flex gap-1">
                  {group.buttons.map((btn) => (
                    <div
                      key={btn}
                      className="px-2 py-1 rounded-md bg-white border border-gray-300 text-[11px] font-bold font-mono text-gray-500 min-w-[22px] text-center leading-none"
                      style={{ boxShadow: "0 2px 0 #d1d5db" }}
                    >
                      {btn}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Row 2: connectors, same widths */}
        <div className="flex gap-2 items-start">
          {groups.map((group, gi) => {
            const w = buttonGroupWidth(group, linkedGroups);
            const isWide = group.columns.length > 1;
            const hasMultiBtn = group.buttons.length > 1;
            return (
              <div key={gi} style={{ width: w }} className="flex justify-center flex-shrink-0 pt-1">
                {isWide ? (
                  // Bracket spanning the linked pair
                  <div style={{ width: Math.round(w * 0.72) }} className="relative h-3">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gray-300" />
                    <div className="absolute top-0 left-0 w-px h-3 bg-gray-300" />
                    <div className="absolute top-0 right-0 w-px h-3 bg-gray-300" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-3 bg-gray-300" />
                  </div>
                ) : hasMultiBtn ? (
                  // Two buttons converging to one column
                  <div className="relative h-3" style={{ width: 32 }}>
                    <div className="absolute top-0 left-0 right-0 h-px bg-gray-300" />
                    <div className="absolute top-0 left-0 w-px h-2 bg-gray-300" />
                    <div className="absolute top-0 right-0 w-px h-2 bg-gray-300" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-3 bg-gray-300" />
                  </div>
                ) : (
                  <div className="w-px h-3 bg-gray-300" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Planogram Editor ─────────────────────────────────────────────────────────

function PlanogramEditor({
  machineType,
  slots,
  onSlotClick,
}: {
  machineType: MachineType;
  slots: Record<string, SlotAssignment>;
  onSlotClick: (key: string) => void;
}) {
  const isStack = machineType.rows === null;
  const totalSlots = isStack
    ? machineType.columns
    : machineType.columns * machineType.rows!;
  const filledSlots = Object.keys(slots).length;
  const [showImages, setShowImages] = useState(false);

  return (
    <div className="bg-[#f8f7f5] rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {isStack ? "Stack Planogram" : `${machineType.category} Planogram`}
            </span>
            <span className="text-xs text-gray-500">
              · Click a slot to assign a product
            </span>
          </div>
          <div className="text-xs text-gray-500 tabular-nums mt-1">
            <span className={filledSlots === totalSlots ? "text-emerald-600 font-medium" : ""}>
              {filledSlots}
            </span>
            <span> / {totalSlots} filled</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {!isStack && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs text-gray-500 font-medium">Show Images</span>
              <button
                role="switch"
                aria-checked={showImages}
                onClick={() => setShowImages((v) => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors ${showImages ? "bg-[#174a92]" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showImages ? "translate-x-4" : ""}`} />
              </button>
            </label>
          )}
          {machineType.physicalLayout && (
            <MachineLayoutDiagram
              layout={machineType.physicalLayout}
              machineLabel={machineType.label}
            />
          )}
        </div>
      </div>

      {!isStack && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
          <svg className="flex-shrink-0 mt-0.5 text-amber-400" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 6v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <p className="text-xs text-amber-800 leading-relaxed">
            Products are loaded by full case. To maintain a clean appearance, the planogram will automatically group facings based on case pack size — you may not be able to place a product in every individual slot.
          </p>
        </div>
      )}

      {isStack ? (
        // Stack machine: row of columns, grouped by linkedGroups
        <div className="overflow-x-auto pb-2">
          <ButtonRow machineType={machineType} />
          <div className="flex gap-2 min-w-max items-start">
            {(() => {
              const rendered = new Set<number>();
              return Array.from({ length: machineType.columns }, (_, i) => {
                if (rendered.has(i)) return null;
                const group = getLinkedGroup(i, machineType);
                const isLinked = group.length > 1;
                group.forEach((idx) => rendered.add(idx));

                if (!isLinked) {
                  const key = String(i);
                  return (
                    <StackColumn
                      key={key}
                      label={String(i + 1)}
                      assignment={slots[key] ?? null}
                      onClick={() => onSlotClick(key)}
                    />
                  );
                }

                // Linked group — render with a bracket wrapper
                return (
                  <div key={`group-${i}`} className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-0">
                      {group.map((idx, gi) => {
                        const key = String(idx);
                        return (
                          <div key={key} className="flex items-center">
                            <StackColumn
                              label={String(idx + 1)}
                              assignment={slots[key] ?? null}
                              onClick={() => onSlotClick(key)}
                            />
                            {gi < group.length - 1 && (
                              <div className="flex flex-col items-center justify-center w-5 self-stretch">
                                <div className="w-px flex-1 bg-[#174a92]/30" />
                                <div className="w-4 h-4 rounded-full bg-[#174a92] flex items-center justify-center flex-shrink-0 my-1">
                                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                                    <path d="M2 5h2m4 0h-2m-2 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                                  </svg>
                                </div>
                                <div className="w-px flex-1 bg-[#174a92]/30" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Bracket label */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#174a92]/10 border border-[#174a92]/20">
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5h2m4 0h-2m-2 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" stroke="#174a92" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      <span className="text-[10px] font-semibold text-[#174a92]">
                        Cols {group.map((idx) => idx + 1).join(" & ")} linked
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : (
        // Grid machine
        <div className="overflow-x-auto pb-2">
          <div className="min-w-max">
            {/* Column headers */}
            <div className="flex gap-1.5 mb-1.5 ml-7">
              {Array.from({ length: machineType.columns }, (_, c) => (
                <div
                  key={c}
                  className="w-[84px] text-center text-xs font-semibold text-gray-500"
                >
                  {colLabel(c)}
                </div>
              ))}
            </div>
            {/* Rows */}
            {Array.from({ length: machineType.rows! }, (_, r) => (
              <div key={r} className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 text-xs text-gray-500 text-right flex-shrink-0 font-medium">
                  {r + 1}
                </div>
                {Array.from({ length: machineType.columns }, (_, c) => {
                  const key = `${c}-${r}`;
                  return (
                    <GridCell
                      key={key}
                      assignment={slots[key] ?? null}
                      onClick={() => onSlotClick(key)}
                      showImages={showImages}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Asset Tag Diagram ─────────────────────────────────────────────────────────

function AssetTagSVG({ scale = 1, suffix = "" }: { scale?: number; suffix?: string }) {
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
        <tspan fill={suffix ? "#174a92" : "#aaa"}>{suffix ? suffix.padEnd(6, "X") : "XXXXXX"}</tspan>
      </text>
      {/* Arrow annotation — only shown in modal */}
    </svg>
  );
}

function AssetTagDiagram({ suffix }: { suffix: string }) {
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
                <div className="font-semibold text-[#0e2d6b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
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
                    <div className="w-px h-6 bg-[#174a92]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#174a92] -mt-0.5" />
                  </div>
                </div>
              </div>

              {/* Callout label */}
              <div className="text-center pt-4">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#174a92]/10 border border-[#174a92]/20">
                  <span className="font-mono font-bold text-sm text-[#174a92]">0700</span>
                  <span className="text-xs text-gray-500">then the</span>
                  <span className="font-mono font-bold text-sm text-[#174a92]">6-digit number</span>
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

const CATEGORY_STYLES = {
  Stack: { pill: "bg-blue-50 text-blue-700" },
  "Glass Front": { pill: "bg-blue-50 text-blue-700" },
  "Smart Cooler": { pill: "bg-blue-50 text-blue-700" },
};

function MachineTypeSelector({
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
            ? "border-[#174a92] bg-[#174a92] hover:bg-[#0e3585] hover:border-[#0e3585]"
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
                        ? "bg-[#174a92] border-[#174a92]"
                        : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <span className={`font-semibold text-sm leading-tight ${isSelected ? "text-white" : "text-[#0e2d6b]"}`}>
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

interface Props {
  machines: MachineEntry[];
  onChange: (machines: MachineEntry[]) => void;
  customerShortName: string;
}

export default function MachinesSection({ machines, onChange, customerShortName }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFocusId) return;
    const isMobile = "ontouchstart" in window;
    requestAnimationFrame(() => {
      const card = document.getElementById(`machine-card-${pendingFocusId}`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
      if (!isMobile) {
        const input = card?.querySelector<HTMLInputElement>("input[data-location-name]");
        input?.focus();
      }
      setPendingFocusId(null);
    });
  }, [pendingFocusId]);
  const [picker, setPicker] = useState<{
    machineId: string;
    slotKey: string;
    slotLabel: string;
    current: SlotAssignment | null;
    machineCategory: MachineCategory;
    lockedPrice: string | null;
  } | null>(null);

  const addMachine = () => {
    const m: MachineEntry = {
      id: uid(),
      locationName: "",
      shortName: "",
      machineTypeId: "",
      machineStatus: "",
      assetNumber: "",
      pricingMode: "",
      singlePrice: "",
      slots: {},
    };
    onChange([...machines, m]);
    setExpandedId(m.id);
  };

  const machineHasData = (m: MachineEntry) =>
    m.locationName.trim() !== "" ||
    m.shortName.trim() !== "" ||
    m.machineTypeId !== "" ||
    m.machineStatus !== "" ||
    m.assetNumber.trim() !== "" ||
    m.pricingMode !== "" ||
    m.singlePrice.trim() !== "" ||
    Object.keys(m.slots).length > 0;

  const remove = (id: string) => {
    onChange(machines.filter((m) => m.id !== id));
    if (expandedId === id) setExpandedId(null);
    setConfirmDeleteId(null);
  };

  const duplicate = (id: string) => {
    const src = machines.find((m) => m.id === id);
    if (!src) return;
    const newId = crypto.randomUUID();
    const copy: MachineEntry = {
      ...src,
      id: newId,
      locationName: "",
      shortName: "",
    };
    const idx = machines.findIndex((m) => m.id === id);
    const next = [...machines];
    next.splice(idx + 1, 0, copy);
    onChange(next);
    setExpandedId(newId);
    setPendingFocusId(newId);
  };

  const update = (id: string, patch: Partial<MachineEntry>) =>
    onChange(machines.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const openPicker = (machineId: string, slotKey: string) => {
    const m = machines.find((x) => x.id === machineId)!;
    const type = MACHINE_TYPES.find((t) => t.id === m.machineTypeId)!;
    setPicker({
      machineId,
      slotKey,
      slotLabel: slotDisplayLabel(slotKey, type),
      current: m.slots[slotKey] ?? null,
      machineCategory: type.category as MachineCategory,
      lockedPrice: m.pricingMode === "single" && m.singlePrice ? m.singlePrice : null,
    });
  };

  const savePicker = (assignment: SlotAssignment | null) => {
    if (!picker) return;
    const m = machines.find((x) => x.id === picker.machineId)!;
    const type = MACHINE_TYPES.find((t) => t.id === m.machineTypeId)!;
    const slots = { ...m.slots };
    const isGrid = type.rows !== null;
    if (isGrid) {
      const [colStr, rowStr] = picker.slotKey.split("-");
      const col = parseInt(colStr);
      const row = parseInt(rowStr);
      const existingUnits = m.slots[picker.slotKey]?.unitsPerCase ?? "";
      // Build a map of col -> assignment for this row (for template detection)
      const rowSlots: Record<number, SlotAssignment> = {};
      for (const [k, v] of Object.entries(m.slots)) {
        const [kCol, kRow] = k.split("-").map(Number);
        if (kRow === row) rowSlots[kCol] = v;
      }
      // DN-3800: if placing same 24pk product on right side (E-G) of existing 4/3 row → full row merge
      let effectiveCol = col;
      if (type.id === "dn3800" && assignment?.unitsPerCase === "24" && col >= 4) {
        const leftProduct = rowSlots[0]?.productId;
        if (leftProduct && leftProduct === assignment.productId) {
          // Same product as A-D group — merge to full row, clear left group first
          for (let c = 0; c < 7; c++) delete slots[`${c}-${row}`];
          for (let c = 0; c < 7; c++) slots[`${c}-${row}`] = assignment;
          update(picker.machineId, { slots });
          setPicker(null);
          return;
        }
        // Different product in right side — not allowed in this template, do nothing
        setPicker(null);
        return;
      }

      // Clear old fan-out group first (handles group-size changes, e.g. 24→12)
      const oldCols = getGridFanOut(type.id, col, existingUnits, rowSlots);
      for (const c of oldCols) delete slots[`${c}-${row}`];
      // Write new fan-out group (use updated rowSlots after clearing)
      if (assignment) {
        const newRowSlots = { ...rowSlots };
        for (const c of oldCols) delete newRowSlots[c];
        const newCols = getGridFanOut(type.id, effectiveCol, assignment.unitsPerCase ?? "", newRowSlots);
        for (const c of newCols) slots[`${c}-${row}`] = assignment;
      }
    } else {
      // Stack machine: fan out to all columns in the linked group
      const colIndex = parseInt(picker.slotKey);
      const group = getLinkedGroup(colIndex, type);
      for (const idx of group) {
        const key = String(idx);
        if (assignment) slots[key] = assignment;
        else delete slots[key];
      }
    }
    update(picker.machineId, { slots });
    setPicker(null);
  };

  const locationNames = machines.map((m) => m.locationName.trim().toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2
            className="text-2xl font-semibold text-[#0e2d6b]"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Configure Machines
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Add each vending machine, assign a unique location name, and set its
            planogram.
          </p>
        </div>
      </div>

      {machines.length === 0 && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              className="text-gray-500"
            >
              <rect
                x="4"
                y="2"
                width="20"
                height="24"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="7"
                y="6"
                width="14"
                height="8"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle cx="10" cy="20" r="1.5" fill="currentColor" />
              <circle cx="14" cy="20" r="1.5" fill="currentColor" />
              <circle cx="18" cy="20" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div className="text-gray-500 text-sm font-medium">
            No machines added yet
          </div>
          <div className="text-gray-500 text-xs mt-1">
            Click "Add Machine" to start configuring
          </div>
        </div>
      )}

      <div className="space-y-3">
        {machines.map((machine, idx) => {
          const type = MACHINE_TYPES.find((t) => t.id === machine.machineTypeId);
          const isExpanded = expandedId === machine.id;
          const isDuplicate =
            machine.locationName.trim() !== "" &&
            locationNames.filter(
              (n) => n === machine.locationName.trim().toLowerCase()
            ).length > 1;
          const filledSlots = Object.keys(machine.slots).length;
          const totalSlots = type
            ? type.rows
              ? type.columns * type.rows
              : type.columns
            : 0;

          return (
            <div
              key={machine.id}
              id={`machine-card-${machine.id}`}
              className="bg-white rounded-xl border border-gray-200"
            >
              {/* Header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                onClick={() =>
                  setExpandedId(isExpanded ? null : machine.id)
                }
              >
                <div className="w-7 h-7 rounded-full bg-[#0e2d6b] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[#0e2d6b] flex items-center gap-2">
                    {machine.locationName || (
                      <span className="text-gray-500 font-normal italic">
                        Unnamed machine
                      </span>
                    )}
                    {isDuplicate && (
                      <span className="text-[#174a92] text-xs font-normal">
                        ⚠ Duplicate name
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                    {type ? (
                      <>
                        <span>{type.category}</span>
                        <span>·</span>
                        <span>{type.label}</span>
                        {filledSlots > 0 && (
                          <>
                            <span>·</span>
                            <span
                              className={
                                filledSlots === totalSlots
                                  ? "text-emerald-600"
                                  : ""
                              }
                            >
                              {filledSlots}/{totalSlots} slots
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-amber-500">
                        No machine type selected
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {type && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLES[type.category].pill}`}
                    >
                      {type.shortLabel}
                    </span>
                  )}
                  {/* Copy machine */}
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicate(machine.id); }}
                    className="text-gray-400 hover:text-[#174a92] transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100"
                    title="Duplicate machine"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="4" width="8" height="8" rx="1.5" />
                      <path d="M2 10V2.5A.5.5 0 012.5 2H10" />
                    </svg>
                  </button>
                  {/* Delete with confirmation */}
                  {confirmDeleteId === machine.id ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-gray-500">Remove?</span>
                      <button
                        onClick={() => remove(machine.id)}
                        className="text-xs px-2 py-0.5 rounded bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (machineHasData(machine)) {
                          setConfirmDeleteId(machine.id);
                        } else {
                          remove(machine.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-400 transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-xl leading-none"
                      title="Remove machine"
                    >
                      ×
                    </button>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Expanded body */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 pb-6 pt-5 space-y-6">
                  {/* Location name */}
                  <div className="max-w-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Machine Location Name
                      <span className="text-[#174a92] ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      data-location-name
                      value={machine.locationName}
                      onChange={(e) =>
                        update(machine.id, { locationName: e.target.value })
                      }
                      placeholder="e.g. Main Entrance 1"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#174a92]/25 focus:border-[#174a92] transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For machines in the same location, add a number, counting
                      from left to right (e.g. Cafeteria 1)
                    </p>
                  </div>

                  {/* Short name */}
                  {(() => {
                    const VIP_MAX = 25;
                    const prefix = `FS ${customerShortName} `;
                    const maxShortName = Math.max(0, VIP_MAX - prefix.length);
                    const shortName = machine.shortName ?? "";
                    const vipName = `FS ${customerShortName} ${shortName}`.trim().toUpperCase();
                    const vipLen = vipName.length;
                    const atLimit = shortName.length >= maxShortName;
                    return (
                      <>
                        <div className="max-w-sm">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Machine Location Short Name
                            <span className="text-[#174a92] ml-0.5">*</span>
                          </label>
                          <input
                            type="text"
                            value={shortName}
                            onChange={(e) =>
                              update(machine.id, {
                                shortName: e.target.value.slice(0, maxShortName),
                              })
                            }
                            maxLength={maxShortName}
                            placeholder="e.g. Entrance 1"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#174a92]/25 focus:border-[#174a92] transition-colors"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Must be unique within this location. Max {maxShortName} characters based on Customer Short Name.
                          </p>
                        </div>

                        {/* VIP Account Name */}
                        <div className="max-w-sm">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            VIP Account Name
                          </label>
                          <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 font-mono tracking-wide select-all">
                            {vipName}
                          </div>
                          <p className="text-xs mt-1">
                            <span className={atLimit ? "text-amber-500 font-medium" : "text-gray-500"}>
                              {vipLen}/{VIP_MAX} characters
                            </span>
                            <span className="text-gray-500"> — auto-generated from Customer and Location Short Names.</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1.5 italic">
                            Tip: a shorter customer name leaves more room for a descriptive location name, making it easier for drivers to identify placement.
                          </p>
                        </div>
                      </>
                    );
                  })()}

                  {/* Machine type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Machine Type
                      <span className="text-[#174a92] ml-0.5">*</span>
                    </label>
                    <MachineTypeSelector
                      selected={machine.machineTypeId}
                      onSelect={(id) =>
                        update(machine.id, { machineTypeId: id, slots: {} })
                      }
                    />
                  </div>

                  {/* Machine status — shown once a machine type is selected */}
                  {type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Machine Status
                        <span className="text-[#174a92] ml-0.5">*</span>
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        {(
                          [
                            {
                              value: "existing" as const,
                              label: "Customer already has a machine",
                              icon: (
                                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                                  <rect x="3" y="1" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                  <rect x="6" y="4" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                                  <circle cx="8" cy="14" r="1.2" fill="currentColor" />
                                  <circle cx="10" cy="14" r="1.2" fill="currentColor" />
                                  <circle cx="12" cy="14" r="1.2" fill="currentColor" />
                                </svg>
                              ),
                            },
                            {
                              value: "new" as const,
                              label: "Customer needs a new machine placed",
                              icon: (
                                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                                  <rect x="3" y="1" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
                                  <path d="M10 7v6M7 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              ),
                            },
                          ] as const
                        ).map(({ value, label, icon }) => {
                          const isSelected = machine.machineStatus === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                update(machine.id, {
                                  machineStatus: value,
                                  assetNumber: value === "new" ? "" : machine.assetNumber,
                                })
                              }
                              className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                                isSelected
                                  ? "border-[#174a92] bg-[#174a92]/5"
                                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                              }`}
                            >
                              <span
                                className={`flex-shrink-0 ${
                                  isSelected ? "text-[#174a92]" : "text-gray-500"
                                }`}
                              >
                                {icon}
                              </span>
                              <span
                                className={`text-sm font-medium leading-snug ${
                                  isSelected ? "text-[#0e2d6b]" : "text-gray-600"
                                }`}
                              >
                                {label}
                              </span>
                              {isSelected && (
                                <div className="ml-auto w-5 h-5 rounded-full bg-[#174a92] flex items-center justify-center flex-shrink-0">
                                  <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
                                    <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Asset number — shown when existing machine selected */}
                      {machine.machineStatus === "existing" && (
                        <>
                        <div className="mt-4 flex flex-wrap items-start gap-4">
                          <div className="flex-1 min-w-[200px] max-w-xs">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                              Machine Asset Number
                              <span className="text-[#174a92] ml-0.5">*</span>
                            </label>
                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#174a92]/25 focus-within:border-[#174a92] transition-colors">
                              <span className="px-3 py-2 text-sm font-mono font-semibold text-gray-500 bg-gray-50 border-r border-gray-300 select-none tracking-wider flex-shrink-0">
                                0700
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={machine.assetNumber}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                                  update(machine.id, { assetNumber: val });
                                }}
                                placeholder="XXXXXX"
                                maxLength={6}
                                autoFocus={!("ontouchstart" in window)}
                                className="flex-1 px-3 py-2 text-sm font-mono tracking-widest focus:outline-none bg-white placeholder:text-gray-300"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Enter the 6-digit number after "0700" on the asset tag.
                            </p>
                          </div>
                          <div className="mt-6 flex-shrink-0">
                            <AssetTagDiagram suffix={machine.assetNumber} />
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-4">
                          <svg className="flex-shrink-0 mt-0.5 text-amber-400" width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
                            <path d="M7 6v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                          </svg>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            The customer is responsible for clearing all existing inventory from the machine before PCNY takes over. Please confirm this with the customer prior to scheduling.
                          </p>
                        </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Pricing mode — shown once machine status is answered */}
                  {type && machine.machineStatus && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Machine Pricing
                        <span className="text-[#174a92] ml-0.5">*</span>
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        {(
                          [
                            {
                              value: "single" as const,
                              label: "Single price for all products",
                              sub: "One vend price across the entire machine",
                            },
                            {
                              value: "multiple" as const,
                              label: "Multiple prices",
                              sub: "Set a price per product when building the planogram",
                            },
                          ] as const
                        ).map(({ value, label, sub }) => {
                          const isSelected = machine.pricingMode === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                update(machine.id, {
                                  pricingMode: value,
                                  singlePrice: value === "multiple" ? "" : machine.singlePrice,
                                })
                              }
                              className={`flex-1 flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                                isSelected
                                  ? "border-[#174a92] bg-[#174a92]/5"
                                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                              }`}
                            >
                              <div className="flex-1">
                                <div className={`text-sm font-medium leading-snug ${isSelected ? "text-[#0e2d6b]" : "text-gray-600"}`}>
                                  {label}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-[#174a92] flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
                                    <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Single price input */}
                      {machine.pricingMode === "single" && (
                        <div className="mt-4 max-w-xs">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Vend Price
                            <span className="text-[#174a92] ml-0.5">*</span>
                          </label>
                          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#174a92]/25 focus-within:border-[#174a92] transition-colors w-36">
                            <span className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border-r border-gray-300 select-none">$</span>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              value={machine.singlePrice}
                              onChange={(e) => {
                                const price = e.target.value;
                                update(machine.id, {
                                  singlePrice: price,
                                  // Propagate price into all existing slots
                                  slots: Object.fromEntries(
                                    Object.entries(machine.slots).map(([k, v]) => [k, { ...v, price }])
                                  ),
                                });
                              }}
                              placeholder="0.00"
                              autoFocus={!("ontouchstart" in window)}
                              className="flex-1 px-3 py-2 text-sm focus:outline-none"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Applied to every product in this machine.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Planogram — shown once machine status and pricing are both answered */}
                  {type &&
                    machine.machineStatus &&
                    machine.pricingMode &&
                    (machine.pricingMode === "multiple" || machine.singlePrice) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Planogram / Product Configuration
                      </label>
                      <PlanogramEditor
                        machineType={type}
                        slots={machine.slots}
                        onSlotClick={(key) => openPicker(machine.id, key)}
                      />
                    </div>
                  )}

                  {/* Bottom action bar */}
                  <div className="flex justify-end pt-4 mt-2 border-t border-gray-100">
                    <button
                      onClick={() => setExpandedId(null)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#174a92] text-white hover:bg-[#0e3585] transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={addMachine}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#174a92] text-white rounded-lg text-sm font-semibold hover:bg-[#0e3585] transition-colors shadow-sm"
      >
        <span className="text-base leading-none">+</span> Add Machine
      </button>

      {picker && (
        <ProductPickerModal
          current={picker.current}
          slotLabel={picker.slotLabel}
          machineCategory={picker.machineCategory}
          lockedPrice={picker.lockedPrice}
          onSave={savePicker}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
