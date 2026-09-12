import { useState } from "react";
import { SlotAssignment } from "../../types";
import { MachineType } from "../../data";
import MachineLayoutDiagram from "../MachineLayoutDiagram";
import { COLUMN_W, CONNECTOR_W, buttonGroupWidth, colLabel, getLinkedGroup } from "../../lib/planogram";

export function StackColumn({
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
        borderColor: hasProduct ? "color-mix(in srgb, var(--color-primary) 38%, transparent)" : "#e2e0dc",
        borderStyle: hasProduct ? "solid" : "dashed",
      }}
    >
      {/* Column letter header */}
      <div
        className="w-full text-center text-[11px] font-bold py-1.5 leading-none"
        style={{
          backgroundColor: hasProduct ? "var(--color-primary)" : "#e8e5e0",
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
          backgroundColor: hasProduct ? "color-mix(in srgb, var(--color-primary) 5%, transparent)" : "white",
        }}
      >
        {hasProduct ? (
          <>
            {/* Size above image */}
            {assignment!.productDescription?.split(" · ")[2] ? (
              <div className="text-[9px] font-semibold text-[var(--color-primary)] mb-0.5 leading-none">
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
              <div className="text-[11px] font-semibold mt-0.5 text-[var(--color-primary)]">
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


export function GridCell({
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
          ? { backgroundColor: "color-mix(in srgb, var(--color-primary) 5%, transparent)", borderColor: "color-mix(in srgb, var(--color-primary) 25%, transparent)" }
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
              <div className="text-[11px] font-semibold text-[var(--color-primary)] mt-1">
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
              <div className="text-[9px] text-[var(--color-primary)] font-medium leading-tight mt-0.5">
                {size}
              </div>
            )}
            {assignment?.price && (
              <div className="text-[11px] font-semibold text-[var(--color-primary)] mt-1">
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

export function ButtonRow({ machineType }: { machineType: MachineType }) {
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


export function PlanogramEditor({
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
                className={`relative w-9 h-5 rounded-full transition-colors ${showImages ? "bg-[var(--color-primary)]" : "bg-gray-300"}`}
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
                                <div className="w-px flex-1 bg-[var(--color-primary)]/30" />
                                <div className="w-4 h-4 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 my-1">
                                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                                    <path d="M2 5h2m4 0h-2m-2 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                                  </svg>
                                </div>
                                <div className="w-px flex-1 bg-[var(--color-primary)]/30" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Bracket label */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5h2m4 0h-2m-2 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" stroke="var(--color-primary)" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      <span className="text-[10px] font-semibold text-[var(--color-primary)]">
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

