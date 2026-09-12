import { SlotAssignment } from "../types";
import { ButtonGroup, MachineType } from "../data";

export const uid = () => Math.random().toString(36).slice(2, 9);

export const colLabel = (i: number) => String.fromCharCode(65 + i);

// Returns which columns to fill when placing a product in a grid machine.
// Rules are defined per machine type and units-per-case.
// rowSlots: map of col -> assignment for the row being edited (used for template detection)

export function getGridFanOut(
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


export function getLinkedGroup(colIndex: number, machineType: MachineType): number[] {
  const group = machineType.linkedGroups?.find((g) => g.includes(colIndex));
  return group ?? [colIndex];
}


export function slotDisplayLabel(key: string, type: MachineType): string {
  if (!type.rows) return `Column ${parseInt(key) + 1}`;
  const [c, r] = key.split("-").map(Number);
  return `${colLabel(c)}${r + 1}`;
}

// ── Product Picker Modal ──────────────────────────────────────────────────────


export const COLUMN_W = 80;

export const CONNECTOR_W = 20; // width of the link connector between paired columns

export const COL_GAP = 8;      // gap-2


export function buttonGroupWidth(group: ButtonGroup, linkedGroups: number[][]): number {
  if (group.columns.length === 1) return COLUMN_W;
  // Multi-column group (linked): sum columns + connectors between them
  const linkedGroup = linkedGroups.find((lg) =>
    group.columns.every((c) => lg.includes(c))
  );
  if (!linkedGroup) return group.columns.length * COLUMN_W + (group.columns.length - 1) * COL_GAP;
  return group.columns.length * COLUMN_W + (group.columns.length - 1) * CONNECTOR_W;
}

