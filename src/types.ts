export interface LocationData {
  businessName: string;
  businessShortName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  salesRep: string;
  approvedBy: string;
  branch: string;
  distributor: string;
  apVendorNumber: string;
  billingAccountName: string;
  commissionRate: string;
  billingContactFirstName: string;
  billingContactLastName: string;
  billingContactEmail: string;
  billingContactPhone: string;
  billingSkipped: boolean;
  notes: string;
}

export interface SlotAssignment {
  productId: string;
  price: string;
  productDescription?: string;
  productImageUrl?: string;
  unitsPerCase?: string;
}

export interface MachineEntry {
  id: string;
  locationName: string;
  shortName: string;
  machineTypeId: string;
  machineStatus: "existing" | "new" | "";
  assetNumber: string;
  pricingMode: "single" | "multiple" | "";
  singlePrice: string;
  slots: Record<string, SlotAssignment>;
}

export type FormStep = "location" | "billing" | "machines" | "review";
