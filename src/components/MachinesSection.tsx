import { useState, useEffect } from "react";
import { MachineEntry, SlotAssignment } from "../types";
import { MACHINE_TYPES } from "../data";
import { MachineCategory } from "../lib/filterConfig";
import { AssetTagDiagram } from "./machines/AssetTag";
import { CATEGORY_STYLES, MachineTypeSelector } from "./machines/MachineTypeSelector";
import { PlanogramEditor } from "./machines/Planogram";
import { ProductPickerModal } from "./machines/ProductPickerModal";
import { getGridFanOut, getLinkedGroup, slotDisplayLabel, uid } from "../lib/planogram";

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
      assetNumber: "",
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
            className="text-2xl font-semibold text-[var(--color-secondary)]"
            style={{ fontFamily: "var(--font-display)" }}
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
                <div className="w-7 h-7 rounded-full bg-[var(--color-secondary)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[var(--color-secondary)] flex items-center gap-2">
                    {machine.locationName || (
                      <span className="text-gray-500 font-normal italic">
                        Unnamed machine
                      </span>
                    )}
                    {isDuplicate && (
                      <span className="text-[var(--color-primary)] text-xs font-normal">
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
                    className="text-gray-400 hover:text-[var(--color-primary)] transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100"
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
                      <span className="text-[var(--color-primary)] ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      data-location-name
                      value={machine.locationName}
                      onChange={(e) =>
                        update(machine.id, { locationName: e.target.value })
                      }
                      placeholder="e.g. Main Entrance 1"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors"
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
                            <span className="text-[var(--color-primary)] ml-0.5">*</span>
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors"
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
                      <span className="text-[var(--color-primary)] ml-0.5">*</span>
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
                        <span className="text-[var(--color-primary)] ml-0.5">*</span>
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
                                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                              }`}
                            >
                              <span
                                className={`flex-shrink-0 ${
                                  isSelected ? "text-[var(--color-primary)]" : "text-gray-500"
                                }`}
                              >
                                {icon}
                              </span>
                              <span
                                className={`text-sm font-medium leading-snug ${
                                  isSelected ? "text-[var(--color-secondary)]" : "text-gray-600"
                                }`}
                              >
                                {label}
                              </span>
                              {isSelected && (
                                <div className="ml-auto w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
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
                              <span className="text-[var(--color-primary)] ml-0.5">*</span>
                            </label>
                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-primary)]/25 focus-within:border-[var(--color-primary)] transition-colors">
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
                        <span className="text-[var(--color-primary)] ml-0.5">*</span>
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
                                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                              }`}
                            >
                              <div className="flex-1">
                                <div className={`text-sm font-medium leading-snug ${isSelected ? "text-[var(--color-secondary)]" : "text-gray-600"}`}>
                                  {label}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
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
                            <span className="text-[var(--color-primary)] ml-0.5">*</span>
                          </label>
                          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-primary)]/25 focus-within:border-[var(--color-primary)] transition-colors w-36">
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
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors"
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
        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-colors shadow-sm"
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

