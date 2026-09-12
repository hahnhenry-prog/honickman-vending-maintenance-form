import { useState, useEffect, useCallback } from "react";
import {
  CategoryFilters,
  FilterCategory,
  FILTER_CATEGORIES,
  loadFilters,
  loadFiltersRemote,
  saveFilters,
} from "../lib/filterConfig";
import { DbProduct, fetchAllProducts } from "../lib/supabase";

interface Props {
  onClose: () => void;
}

const CATEGORY_DESCRIPTIONS: Record<FilterCategory, string> = {
  Stack: "Vendo 721, Vendo 621 — stack-style coil machines",
  "Glass Front / Smart Cooler": "Dixie Narco 5800, DN-3800, PicoCooler Vision — glass-front and smart cooler machines",
};

export default function AdminPanel({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<FilterCategory>("Stack");
  const [filters, setFilters] = useState<CategoryFilters>(loadFilters);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [search, setSearch] = useState("");
  const [sortSnapshot, setSortSnapshot] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load filters from Supabase on open
  useEffect(() => {
    loadFiltersRemote().then(setFilters);
  }, []);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await fetchAllProducts(q);
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(""); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const currentFilter = filters[activeTab]; // null = all allowed
  const filterEnabled = currentFilter !== null;

  const isAllowed = (id: string) =>
    !filterEnabled || (currentFilter ?? []).includes(id);

  const toggleProduct = (id: string) => {
    const current = filters[activeTab] ?? products.map((p) => p.id);
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    setFilters((f) => ({ ...f, [activeTab]: next }));
    setSaved(false);
  };

  const toggleFilterEnabled = (enabled: boolean) => {
    setFilters((f) => ({
      ...f,
      [activeTab]: enabled ? [] : null,
    }));
    setSaved(false);
  };

  const selectAll = () => {
    setFilters((f) => ({ ...f, [activeTab]: products.map((p) => p.id) }));
    setSaved(false);
  };

const clearAll = () => {
    setFilters((f) => ({ ...f, [activeTab]: [] }));
    setSaved(false);
  };

  const handleSave = async () => {
    await saveFilters(filters);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const allowedCount = filterEnabled
    ? (currentFilter ?? []).filter((id) => products.some((p) => p.id === id)).length
    : products.length;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#f0eeeb]">
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-4 flex-shrink-0 border-b border-white/20"
        style={{ backgroundColor: "var(--color-secondary)" }}
      >
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-amber-400 text-amber-900">
            Admin
          </div>
          <div>
            <div
              className="text-white font-semibold text-sm leading-tight"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Product Filter Configuration
            </div>
            <div className="text-white/40 text-[11px] mt-0.5">
              Controls which products sales reps can select per machine category
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              saved
                ? "bg-emerald-500 text-white"
                : "bg-[var(--color-primary)] hover:bg-[#1f5cb8] text-white"
            }`}
          >
            {saved ? "✓ Saved" : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0 border-b border-gray-200 bg-white flex-shrink-0 px-8">
        {FILTER_CATEGORIES.map((cat) => {
          const f = filters[cat];
          const enabled = f !== null;
          return (
            <button
              key={cat}
              onClick={() => { setActiveTab(cat); setSearch(""); }}
              className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === cat
                  ? "border-[var(--color-primary)] text-[var(--color-secondary)]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {cat}
              {enabled && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold">
                  {f!.length} products
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl w-full mx-auto px-8 py-6 gap-5">
        {/* Category description + filter toggle */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-6">
          <div>
            <div className="text-sm font-semibold text-[var(--color-secondary)]">{activeTab}</div>
            <div className="text-xs text-gray-400 mt-0.5">{CATEGORY_DESCRIPTIONS[activeTab]}</div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-gray-500">
              {filterEnabled ? "Filter active" : "All products available"}
            </span>
            <button
              onClick={() => toggleFilterEnabled(!filterEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                filterEnabled ? "bg-[var(--color-primary)]" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  filterEnabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {filterEnabled ? (
          <>
            {/* Search + bulk actions */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !search) setSortSnapshot(filters[activeTab] ? [...(filters[activeTab] ?? [])] : null);
                    setSearch(val);
                  }}
                  placeholder="Search products…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] bg-white"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(""); setSortSnapshot(null); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
              <span className="text-sm text-gray-400 whitespace-nowrap">
                {allowedCount} / {products.length} selected
              </span>
<button
                onClick={selectAll}
                className="px-3 py-2 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-lg transition-colors font-medium"
              >
                Select all
              </button>
              <button
                onClick={clearAll}
                className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear all
              </button>
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200">
              {loading && (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                  Loading products…
                </div>
              )}
              {!loading && products.length === 0 && (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                  No products found
                </div>
              )}
              {!loading &&
                [...products]
                  .sort((a, b) => {
                    const wasSelected = (id: string) =>
                      search && sortSnapshot !== null
                        ? sortSnapshot.includes(id)
                        : isAllowed(id);
                    return (wasSelected(a.id) ? 0 : 1) - (wasSelected(b.id) ? 0 : 1);
                  })
                  .map((p, i) => {
                  const allowed = isAllowed(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                        i > 0 ? "border-t border-gray-100" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={allowed}
                        onChange={() => toggleProduct(p.id)}
                        className="w-4 h-4 accent-[var(--color-primary)] flex-shrink-0 cursor-pointer"
                      />
                      <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                        {p.image_web_url ? (
                          <img src={p.image_web_url} alt={p.description} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">?</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {(p.brand || p.flavor) ? (
                          <>
                            <div className={`text-sm font-medium leading-tight ${allowed ? "text-gray-800" : "text-gray-400"}`}>
                              {p.brand && <span>{p.brand}</span>}
                              {p.flavor && <span className={allowed ? "text-gray-500" : "text-gray-400"}> · {p.flavor}</span>}
                            </div>
                            {(p.size || p.material) && (
                              <div className="text-xs text-gray-500">
                                {[p.size, p.material].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className={`text-sm font-medium truncate ${allowed ? "text-gray-800" : "text-gray-400"}`}>
                            {p.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">#{p.id}</div>
                      </div>
                      {allowed && (
                        <div className="w-4 h-4 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4l2 2 3-3" stroke="var(--color-primary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </label>
                  );
                })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-gray-400">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-500">No filter active</div>
              <div className="text-xs mt-1">
                Sales reps can choose any product for {activeTab} machines. Enable the filter to restrict the selection.

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="text-center py-2 text-[10px] text-gray-300 flex-shrink-0">
        Press Ctrl+Shift+A to toggle this panel · Changes are stored locally in the browser
      </div>
    </div>
  );
}
