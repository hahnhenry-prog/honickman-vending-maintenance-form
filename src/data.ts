export interface ButtonGroup {
  buttons: string[];  // physical button labels on the machine
  columns: number[];  // 0-indexed column indices this button group controls
}

export interface PhysicalButton {
  number: number;
  inactive?: boolean;
  inactiveLabel?: string;  // e.g. "CC" for credit card reader
  columns: number[];       // 0-indexed column indices (empty if inactive)
}

export interface PhysicalLayout {
  // Each panel is rows of buttons; center payment column is implied between panels
  leftPanel: PhysicalButton[][];
  rightPanel: PhysicalButton[][];
}

export interface MachineType {
  id: string;
  label: string;
  shortLabel: string;
  category: "Stack" | "Glass Front" | "Smart Cooler";
  columns: number;
  rows: number | null;
  linkedGroups?: number[][];  // column indices that share a product assignment
  buttonMap?: ButtonGroup[];  // physical button → column mapping for display
  physicalLayout?: PhysicalLayout;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  defaultPrice: number;
  color: string;
}

export const MACHINE_TYPES: MachineType[] = [
  {
    id: "v721", label: "Vendo 721", shortLabel: "V-721", category: "Stack", columns: 10, rows: null,
    linkedGroups: [[0, 1]],
    buttonMap: [
      { buttons: ["1"],       columns: [0, 1] },
      { buttons: ["3"],       columns: [2] },
      { buttons: ["4"],       columns: [3] },
      { buttons: ["5"],       columns: [4] },
      { buttons: ["6"],       columns: [5] },
      { buttons: ["7"],       columns: [6] },
      { buttons: ["8"],       columns: [7] },
      { buttons: ["9", "10"],  columns: [8] },
      { buttons: ["11", "12"], columns: [9] },
    ],
    physicalLayout: {
      leftPanel: [
        [{ number: 1,  columns: [0, 1] }, { number: 2,  inactive: true, inactiveLabel: "CC", columns: [] }],
        [{ number: 5,  columns: [4] },    { number: 6,  columns: [5] }],
        [{ number: 9,  columns: [8] },    { number: 10, columns: [8] }],
      ],
      rightPanel: [
        [{ number: 3,  columns: [2] },    { number: 4,  columns: [3] }],
        [{ number: 7,  columns: [6] },    { number: 8,  columns: [7] }],
        [{ number: 11, columns: [9] },    { number: 12, columns: [9] }],
      ],
    },
  },
  { id: "v621", label: "Vendo 621", shortLabel: "V-621", category: "Stack", columns: 8, rows: null },
  { id: "dn5800", label: "Dixie Narco 5800", shortLabel: "DN-5800", category: "Glass Front", columns: 9, rows: 5 },
  { id: "dn3800", label: "Dixie Narco 3800", shortLabel: "DN-3800", category: "Glass Front", columns: 7, rows: 5 },
  { id: "pico", label: "PicoCooler Vision", shortLabel: "PicoCooler", category: "Smart Cooler", columns: 8, rows: 5 },
];

export const PRODUCTS: Product[] = [
  { id: "pepsi", name: "Pepsi", sku: "PEP-12OZ", defaultPrice: 1.75, color: "#1a52b0" },
  { id: "dietpepsi", name: "Diet Pepsi", sku: "DPP-12OZ", defaultPrice: 1.75, color: "#4a7fd4" },
  { id: "pepsizerro", name: "Pepsi Zero Sugar", sku: "PZS-12OZ", defaultPrice: 1.75, color: "#111827" },
  { id: "mtn", name: "Mountain Dew", sku: "MTD-12OZ", defaultPrice: 1.75, color: "#6ab04c" },
  { id: "dietmtn", name: "Diet Mountain Dew", sku: "DMD-12OZ", defaultPrice: 1.75, color: "#a3c644" },
  { id: "mtnzero", name: "Mtn Dew Zero", sku: "MDZ-12OZ", defaultPrice: 1.75, color: "#2d6a1f" },
  { id: "mtncode", name: "Mtn Dew Code Red", sku: "MCR-12OZ", defaultPrice: 1.75, color: "#c0392b" },
  { id: "starry", name: "Starry", sku: "STR-12OZ", defaultPrice: 1.75, color: "#f1c40f" },
  { id: "crush-org", name: "Crush Orange", sku: "CRO-12OZ", defaultPrice: 1.75, color: "#e67e22" },
  { id: "crush-grp", name: "Crush Grape", sku: "CRG-12OZ", defaultPrice: 1.75, color: "#8e44ad" },
  { id: "drbrn", name: "Dr. Brown's Black Cherry", sku: "DBC-12OZ", defaultPrice: 1.75, color: "#6d2b2b" },
  { id: "brisk-lt", name: "Brisk Lemon Tea", sku: "BLT-12OZ", defaultPrice: 1.75, color: "#e2a800" },
  { id: "aquafina", name: "Aquafina Water", sku: "AQF-20OZ", defaultPrice: 1.50, color: "#0288d1" },
  { id: "bubly-stb", name: "bubly Strawberry", sku: "BSB-12OZ", defaultPrice: 1.75, color: "#e91e8c" },
  { id: "bubly-mng", name: "bubly Mango", sku: "BMG-12OZ", defaultPrice: 1.75, color: "#f57c00" },
  { id: "gatorade-cool", name: "Gatorade Cool Blue", sku: "GCB-20OZ", defaultPrice: 2.00, color: "#1565c0" },
  { id: "gatorade-fruit", name: "Gatorade Fruit Punch", sku: "GFP-20OZ", defaultPrice: 2.00, color: "#b71c1c" },
  { id: "gatorade-lemon", name: "Gatorade Lemon-Lime", sku: "GLL-20OZ", defaultPrice: 2.00, color: "#9ccc00" },
  { id: "lipton-lt", name: "Lipton Iced Tea", sku: "LIT-20OZ", defaultPrice: 1.75, color: "#a0522d" },
];
