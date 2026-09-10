import { LocationData, MachineEntry } from "../types";

export const fixtureLocation: LocationData = {
  businessName: "Riverside Amusement Park",
  address: "123 Commerce Blvd",
  city: "Bronx",
  state: "NY",
  zip: "10451",
  contactName: "Maria Gonzalez",
  contactPhone: "(718) 555-0192",
  contactEmail: "mgonzalez@riverside.com",
  salesRep: "John Smith",
  approvedBy: "Gil Montalvo",
  branch: "Bronx",
  distributor: "Metro Vending Supply",
  apVendorNumber: "4217",
  billingAccountName: "Riverside Entertainment LLC",
  commissionRate: "12.5",
  billingContactFirstName: "Robert",
  billingContactLastName: "Park",
  billingContactEmail: "rpark@riverside.com",
  billingContactPhone: "(718) 555-0210",
  billingSkipped: false,
  notes: "Machine to be placed near main entrance.",
};

const IMG = "https://honickman-catalog-images.s3.us-east-1.amazonaws.com/products/web";

const s = (productId: string, price: string, description: string, unitsPerCase: string): MachineEntry["slots"][string] => ({
  productId,
  price,
  productDescription: description,
  productImageUrl: `${IMG}/${productId}.webp`,
  unitsPerCase,
});

// ── Machine 1: Main Entrance 1 — Vendo 721, new, single price $4 ──────────────
const entrance1Slots: MachineEntry["slots"] = {
  "0": s("014188", "4", "Pepsi · Original · 20 oz", "24"),
  "1": s("014188", "4", "Pepsi · Original · 20 oz", "24"),
  "2": s("056858", "4", "Pepsi · Zero Sugar · 20 oz", "24"),
  "3": s("061277", "4", "Starry · Lemon Lime · 20 oz", "24"),
  "4": s("011161", "4", "Gatorade · Fruit Punch · 20 oz", "24"),
  "5": s("011163", "4", "Gatorade · Cool Blue · 20 oz", "24"),
  "6": s("056848", "4", "Crush · Orange · 20 oz", "24"),
  "7": s("011006", "4", "Aquafina · Water · 20 oz", "24"),
  "8": s("011006", "4", "Aquafina · Water · 20 oz", "24"),
  "9": s("011006", "4", "Aquafina · Water · 20 oz", "24"),
};

// ── Machine 2: Main Entrance 2 — Vendo 721, new, single price $4 ──────────────
const entrance2Slots: MachineEntry["slots"] = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [
    String(i),
    s("011006", "4", "Aquafina · Water · 20 oz", "24"),
  ])
);

// ── Machine 3: Food Court — DN-5800, existing (123456), multiple prices ───────
// 9 cols (A–I = 0–8), 5 rows (0–4). Keys: "col-row"
const foodCourtSlots: MachineEntry["slots"] = {
  // Row 1 — Pepsi Original 20oz $4 (all 9 cols)
  "0-0": s("014188", "4", "Pepsi · Original · 20 oz", "24"),
  "1-0": s("014188", "4", "Pepsi · Original · 20 oz", "24"),
  "2-0": s("014188", "4", "Pepsi · Original · 20 oz", "24"),
  "3-0": s("014188", "4", "Pepsi · Original · 20 oz", "24"),
  "4-0": s("014188", "4", "Pepsi · Original · 20 oz", "24"),
  "5-0": s("014188", "4", "Pepsi · Original · 20 oz", "24"),
  "6-0": s("014188", "4", "Pepsi · Original · 20 oz", "24"),
  "7-0": s("014188", "4", "Pepsi · Original · 20 oz", "24"),
  "8-0": s("014188", "4", "Pepsi · Original · 20 oz", "24"),

  // Row 2 — A–E: Pepsi Zero Sugar, F–I: Starry Lemon Lime
  "0-1": s("056858", "4", "Pepsi · Zero Sugar · 20 oz", "24"),
  "1-1": s("056858", "4", "Pepsi · Zero Sugar · 20 oz", "24"),
  "2-1": s("056858", "4", "Pepsi · Zero Sugar · 20 oz", "24"),
  "3-1": s("056858", "4", "Pepsi · Zero Sugar · 20 oz", "24"),
  "4-1": s("056858", "4", "Pepsi · Zero Sugar · 20 oz", "24"),
  "5-1": s("061277", "4", "Starry · Lemon Lime · 20 oz", "24"),
  "6-1": s("061277", "4", "Starry · Lemon Lime · 20 oz", "24"),
  "7-1": s("061277", "4", "Starry · Lemon Lime · 20 oz", "24"),
  "8-1": s("061277", "4", "Starry · Lemon Lime · 20 oz", "24"),

  // Row 3 — A–E: Gatorade Fruit Punch, F–I: Gatorade Cool Blue
  "0-2": s("011161", "4", "Gatorade · Fruit Punch · 20 oz", "24"),
  "1-2": s("011161", "4", "Gatorade · Fruit Punch · 20 oz", "24"),
  "2-2": s("011161", "4", "Gatorade · Fruit Punch · 20 oz", "24"),
  "3-2": s("011161", "4", "Gatorade · Fruit Punch · 20 oz", "24"),
  "4-2": s("011161", "4", "Gatorade · Fruit Punch · 20 oz", "24"),
  "5-2": s("011163", "4", "Gatorade · Cool Blue · 20 oz", "24"),
  "6-2": s("011163", "4", "Gatorade · Cool Blue · 20 oz", "24"),
  "7-2": s("011163", "4", "Gatorade · Cool Blue · 20 oz", "24"),
  "8-2": s("011163", "4", "Gatorade · Cool Blue · 20 oz", "24"),

  // Row 4 — A–C: Pure Leaf Raspberry, D–E: Pure Leaf Honey Green Tea, F–G: Starbucks Frap Coffee $5, H–I: Starbucks Frap Mocha $5
  "0-3": s("057059", "4", "Pure Leaf · Raspberry · 18.5 oz", "12"),
  "1-3": s("057059", "4", "Pure Leaf · Raspberry · 18.5 oz", "12"),
  "2-3": s("057059", "4", "Pure Leaf · Raspberry · 18.5 oz", "12"),
  "3-3": s("057309", "4", "Pure Leaf · Honey Green Tea · 18.5 oz", "12"),
  "4-3": s("057309", "4", "Pure Leaf · Honey Green Tea · 18.5 oz", "12"),
  "5-3": s("015450", "5", "Starbucks · Frap Coffee · 13.7 oz", "12"),
  "6-3": s("015450", "5", "Starbucks · Frap Coffee · 13.7 oz", "12"),
  "7-3": s("057587", "5", "Starbucks · Frap Mocha · 13.7 oz", "12"),
  "8-3": s("057587", "5", "Starbucks · Frap Mocha · 13.7 oz", "12"),

  // Row 5 — A–C: El Jefe Mango $5, D–E: El Jefe Lemonade $5, F–G: Lean Body Chocolate $6, H–I: Lean Body Vanilla $6
  "0-4": s("063092", "5", "El Jefe · Wild Mango · 16 oz", "12"),
  "1-4": s("063092", "5", "El Jefe · Wild Mango · 16 oz", "12"),
  "2-4": s("063092", "5", "El Jefe · Wild Mango · 16 oz", "12"),
  "3-4": s("063090", "5", "El Jefe · Phantom Lemonade · 16 oz", "12"),
  "4-4": s("063090", "5", "El Jefe · Phantom Lemonade · 16 oz", "12"),
  "5-4": s("061195", "6", "Lean Body · Chocolate · 14 oz", "12"),
  "6-4": s("061195", "6", "Lean Body · Chocolate · 14 oz", "12"),
  "7-4": s("061199", "6", "Lean Body · Vanilla · 14 oz", "12"),
  "8-4": s("061199", "6", "Lean Body · Vanilla · 14 oz", "12"),
};

export const fixtureMachines: MachineEntry[] = [
  {
    id: "fixture-1",
    locationName: "Main Entrance 1",
    shortName: "Entrance1",
    machineTypeId: "v721",
    machineStatus: "new",
    assetNumber: "",
    pricingMode: "single",
    singlePrice: "4",
    slots: entrance1Slots,
  },
  {
    id: "fixture-2",
    locationName: "Main Entrance 2",
    shortName: "Entrance2",
    machineTypeId: "v721",
    machineStatus: "new",
    assetNumber: "",
    pricingMode: "single",
    singlePrice: "4",
    slots: entrance2Slots,
  },
  {
    id: "fixture-3",
    locationName: "Food Court",
    shortName: "Food Court",
    machineTypeId: "dn5800",
    machineStatus: "existing",
    assetNumber: "123456",
    pricingMode: "multiple",
    singlePrice: "",
    slots: foodCourtSlots,
  },
];
