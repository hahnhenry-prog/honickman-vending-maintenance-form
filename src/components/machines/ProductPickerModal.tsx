import { useState, useRef, useEffect, useCallback } from "react";
import { SlotAssignment } from "../../types";
import { DbProduct, searchProducts } from "../../lib/supabase";
import { MachineCategory, getFilterForCategory } from "../../lib/filterConfig";

export function ProductPickerModal({
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
              className="font-semibold text-[var(--color-secondary)]"
              style={{ fontFamily: "var(--font-display)" }}
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
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
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
                        ? "bg-blue-50 ring-1 ring-[var(--color-primary)]/30"
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
                      <div className="w-4 h-4 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
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
                className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors"
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
                className="px-5 py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

