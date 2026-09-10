import { projectId, publicAnonKey } from "../../utils/supabase/info";

export type MachineCategory = "Stack" | "Glass Front" | "Smart Cooler";
export type FilterCategory = "Stack" | "Glass Front / Smart Cooler";
export const FILTER_CATEGORIES: FilterCategory[] = ["Stack", "Glass Front / Smart Cooler"];

export interface CategoryFilters {
  Stack: string[] | null;
  "Glass Front / Smart Cooler": string[] | null;
}

const DEFAULT_FILTERS: CategoryFilters = {
  Stack: null,
  "Glass Front / Smart Cooler": null,
};

const LOCAL_KEY = "pcny_category_filters_v2";
const KV_KEY = "pcny_category_filters_v2";
const TABLE_URL = `https://${projectId}.supabase.co/rest/v1/kv_store_767dfe27`;
const HEADERS = {
  "Content-Type": "application/json",
  "apikey": publicAnonKey,
  "Authorization": `Bearer ${publicAnonKey}`,
  "Prefer": "resolution=merge-duplicates",
};

export function loadFilters(): CategoryFilters {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { ...DEFAULT_FILTERS };
    const parsed = JSON.parse(raw);
    return {
      Stack: parsed.Stack ?? null,
      "Glass Front / Smart Cooler": parsed["Glass Front / Smart Cooler"] ?? null,
    };
  } catch {
    return { ...DEFAULT_FILTERS };
  }
}

export async function loadFiltersRemote(): Promise<CategoryFilters> {
  try {
    const res = await fetch(`${TABLE_URL}?key=eq.${KV_KEY}&select=value`, {
      headers: { "apikey": publicAnonKey, "Authorization": `Bearer ${publicAnonKey}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    if (rows.length > 0) {
      const merged = { ...DEFAULT_FILTERS, ...rows[0].value };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {
    // fall through to localStorage
  }
  return loadFilters();
}

export async function saveFilters(filters: CategoryFilters): Promise<void> {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(filters));
  await fetch(TABLE_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ key: KV_KEY, value: filters }),
  });
}

export function getFilterForCategory(category: MachineCategory): string[] | null {
  const filters = loadFilters();
  if (category === "Stack") return filters["Stack"];
  return filters["Glass Front / Smart Cooler"];
}
