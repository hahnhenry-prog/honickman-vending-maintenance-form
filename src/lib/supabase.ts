import { projectId, publicAnonKey } from "../../utils/supabase/info";

export interface DbProduct {
  id: string;
  description: string;
  image_web_url: string;
  brand: string;
  flavor: string;
  size: string;
  material: string;
  unitsPerCase: string;
}

const BASE = `https://${projectId}.supabase.co/rest/v1`;
const HEADERS: Record<string, string> = {
  apikey: publicAnonKey,
  Authorization: `Bearer ${publicAnonKey}`,
};

let subBrandsCache: Record<string, { brand: string; flavor: string }> | null = null;
let packagesCache: Record<string, { size: string; material: string; unitsPerCase: string }> | null = null;
let allProductsCache: DbProduct[] | null = null;

async function getSubBrands(): Promise<Record<string, { brand: string; flavor: string }>> {
  if (subBrandsCache) return subBrandsCache;
  const res = await fetch(`${BASE}/sub_brands?select=id,brand,flavor&limit=2000`, { headers: HEADERS });
  const rows: { id: string; brand: string; flavor: string }[] = await res.json();
  subBrandsCache = Object.fromEntries(rows.map((r) => [r.id, { brand: r.brand ?? "", flavor: r.flavor ?? "" }]));
  return subBrandsCache;
}

async function getPackages(): Promise<Record<string, { size: string; material: string; unitsPerCase: string }>> {
  if (packagesCache) return packagesCache;
  const res = await fetch(`${BASE}/packages?select=id,size,material,consumable_units_per_case&limit=2000`, { headers: HEADERS });
  const rows: { id: string; size: string; material: string; consumable_units_per_case: string }[] = await res.json();
  packagesCache = Object.fromEntries(rows.map((r) => [r.id, {
    size: r.size ?? "",
    material: r.material ?? "",
    unitsPerCase: r.consumable_units_per_case ?? "",
  }]));
  return packagesCache;
}

interface RawProduct {
  id: string;
  description: string;
  image_web_url: string;
  sub_id: string;
  container_type_id: string;
}

const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });

function enrichProducts(
  raw: RawProduct[],
  subBrands: Record<string, { brand: string; flavor: string }>,
  packages: Record<string, { size: string; material: string; unitsPerCase: string }>
): DbProduct[] {
  return raw
    .map((p) => {
      const sb = subBrands[p.sub_id] ?? { brand: "", flavor: "" };
      const pkg = packages[p.container_type_id] ?? { size: "", material: "", unitsPerCase: "" };
      return {
        id: p.id,
        description: p.description,
        image_web_url: p.image_web_url,
        brand: sb.brand,
        flavor: sb.flavor,
        size: pkg.size,
        material: pkg.material,
        unitsPerCase: pkg.unitsPerCase,
      };
    })
    .filter((p) => p.unitsPerCase === "12" || p.unitsPerCase === "24")
    .sort((a, b) =>
      cmp(a.brand, b.brand) ||
      cmp(a.size, b.size) ||
      cmp(a.material, b.material) ||
      cmp(a.flavor, b.flavor)
    );
}

// Token-based client-side search: all tokens must match, order doesn't matter
function clientFilter(products: DbProduct[], query: string): DbProduct[] {
  const q = query.trim();
  if (!q) return products;
  const tokens = q.toLowerCase().split(/\s+/);
  return products.filter((p) => {
    const haystack = `${p.brand} ${p.flavor} ${p.size} ${p.material} ${p.id}`.toLowerCase();
    return tokens.every((t) => haystack.includes(t));
  });
}

async function getAllProducts(): Promise<DbProduct[]> {
  if (allProductsCache) return allProductsCache;
  const params = new URLSearchParams({
    select: "id,description,image_web_url,sub_id,container_type_id",
    pcny: "eq.true",
    status: "eq.Active",
    data_complete: "eq.true",
    order: "id.asc",
    limit: "1000",
  });
  const [raw, subBrands, packages] = await Promise.all([
    fetch(`${BASE}/products?${params}`, { headers: HEADERS }).then((r) => r.json() as Promise<RawProduct[]>),
    getSubBrands(),
    getPackages(),
  ]);
  allProductsCache = enrichProducts(raw, subBrands, packages);
  return allProductsCache;
}

export async function searchProducts(
  query: string,
  allowedIds?: string[] | null
): Promise<DbProduct[]> {
  if (allowedIds && allowedIds.length === 0) return [];
  const all = await getAllProducts();
  const filtered = allowedIds ? all.filter((p) => allowedIds.includes(p.id)) : all;
  return clientFilter(filtered, query);
}

export async function fetchAllProducts(query: string): Promise<DbProduct[]> {
  const all = await getAllProducts();
  return clientFilter(all, query);
}

export interface DbRequest {
  id: string;
  created_at: string;
  status: string;
  business_name: string;
  business_short_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  sales_rep: string;
  approved_by: string;
  branch: string;
  distributor: string;
  notes: string;
  ap_vendor_number: string;
  billing_account_name: string;
  commission_rate: string;
  billing_contact_first_name: string;
  billing_contact_last_name: string;
  billing_contact_email: string;
  billing_contact_phone: string;
  billing_skipped: boolean;
  machine_count: number;
}

export interface DbMachine {
  id: string;
  request_id: string;
  location_name: string;
  short_name: string;
  machine_type_id: string;
  machine_status: string;
  asset_number: string;
  card_reader_serial: string;
  pricing_mode: string;
  single_price: string;
  slots: Record<string, import("../types").SlotAssignment>;
  vending_notes: string;
}

export async function fetchRequests(status?: string): Promise<DbRequest[]> {
  const params = new URLSearchParams({ order: "created_at.desc", limit: "200" });
  if (status) params.append("status", `eq.${status}`);
  const [reqRes, machRes] = await Promise.all([
    fetch(`${BASE}/requests?${params}`, { headers: HEADERS }),
    fetch(`${BASE}/request_machines?select=request_id`, { headers: HEADERS }),
  ]);
  const rows = await reqRes.json();
  const machRows: { request_id: string }[] = await machRes.json();
  if (!Array.isArray(rows)) return [];
  const countMap: Record<string, number> = {};
  if (Array.isArray(machRows)) {
    for (const m of machRows) countMap[m.request_id] = (countMap[m.request_id] ?? 0) + 1;
  }
  return rows.map((r) => ({ ...r, machine_count: countMap[r.id] ?? 0 }));
}

export async function fetchRequestDetail(id: string): Promise<{ request: DbRequest; machines: DbMachine[] }> {
  const [reqRes, machRes] = await Promise.all([
    fetch(`${BASE}/requests?id=eq.${id}`, { headers: HEADERS }),
    fetch(`${BASE}/request_machines?request_id=eq.${id}&order=created_at.asc`, { headers: HEADERS }),
  ]);
  const [request] = await reqRes.json();
  const machines = await machRes.json();
  return { request, machines };
}

export async function updateMachine(id: string, patch: Partial<DbMachine>): Promise<void> {
  await fetch(`${BASE}/request_machines?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function updateRequestStatus(id: string, status: string): Promise<void> {
  await fetch(`${BASE}/requests?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function submitRequest(
  location: import("../types").LocationData,
  machines: import("../types").MachineEntry[]
): Promise<string> {
  // Insert request row
  const reqRes = await fetch(`${BASE}/requests`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json", "Prefer": "return=representation" },
    body: JSON.stringify({
      status: "submitted",
      business_name: location.businessName,
      business_short_name: location.businessShortName,
      address: location.address,
      city: location.city,
      state: location.state,
      zip: location.zip,
      contact_name: location.contactName,
      contact_phone: location.contactPhone,
      contact_email: location.contactEmail,
      sales_rep: location.salesRep,
      approved_by: location.approvedBy,
      branch: location.branch,
      distributor: location.distributor,
      notes: location.notes,
      ap_vendor_number: location.apVendorNumber,
      billing_account_name: location.billingAccountName,
      commission_rate: location.commissionRate,
      billing_contact_first_name: location.billingContactFirstName,
      billing_contact_last_name: location.billingContactLastName,
      billing_contact_email: location.billingContactEmail,
      billing_contact_phone: location.billingContactPhone,
      billing_skipped: location.billingSkipped,
    }),
  });
  if (!reqRes.ok) throw new Error(`Failed to submit request: ${await reqRes.text()}`);
  const [req] = await reqRes.json();

  // Insert one row per machine
  await fetch(`${BASE}/request_machines`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(
      machines.map((m) => ({
        request_id: req.id,
        location_name: m.locationName,
        short_name: m.shortName,
        machine_type_id: m.machineTypeId,
        machine_status: m.machineStatus,
        asset_number: m.assetNumber,
        pricing_mode: m.pricingMode,
        single_price: m.singlePrice,
        slots: m.slots,
      }))
    ),
  });

  return req.id;
}
