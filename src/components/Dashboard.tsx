import { useState, useEffect, useCallback } from "react";
import {
  DbRequest, DbMachine,
  fetchRequests, fetchRequestDetail,
  updateMachine, updateRequestStatus,
} from "../lib/supabase";
import { MACHINE_TYPES } from "../data";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DashboardRole = "Sales" | "Vending" | "MDM" | "Route Accounting";
const ROLES: DashboardRole[] = ["Sales", "Vending", "MDM", "Route Accounting"];

const ROLE_DESCRIPTIONS: Record<DashboardRole, string> = {
  "Sales": "View your submitted requests",
  "Vending": "Review requests, verify asset IDs, add card reader serials",
  "MDM": "Download VIP data and mark requests complete",
  "Route Accounting": "View planograms and machine configurations",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  submitted:      { label: "Submitted",       color: "bg-blue-100 text-blue-700" },
  vending_review: { label: "Vending Review",  color: "bg-amber-100 text-amber-700" },
  mdm_ready:      { label: "MDM Ready",       color: "bg-purple-100 text-purple-700" },
  complete:       { label: "Complete",         color: "bg-emerald-100 text-emerald-700" },
};

const colLabel = (i: number) => String.fromCharCode(65 + i);

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.color}`}>
      {s.label}
    </span>
  );
}

// ── Role Selector ─────────────────────────────────────────────────────────────

function RoleSelector({ onSelect }: { onSelect: (r: DashboardRole) => void }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-8">
      <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">
        Select your role to continue
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => onSelect(role)}
            className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-[#174a92] hover:shadow-sm transition-all group"
          >
            <div className="font-semibold text-[#0e2d6b] text-sm mb-1 group-hover:text-[#174a92]">
              {role}
            </div>
            <div className="text-xs text-gray-400 leading-relaxed">
              {ROLE_DESCRIPTIONS[role]}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Request List ──────────────────────────────────────────────────────────────

function RequestList({
  role,
  onSelect,
}: {
  role: DashboardRole;
  onSelect: (id: string) => void;
}) {
  const [requests, setRequests] = useState<DbRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const statusFilter: Record<DashboardRole, string | undefined> = {
    "Sales": undefined,
    "Vending": "submitted",
    "MDM": "vending_review",
    "Route Accounting": undefined,
  };

  useEffect(() => {
    fetchRequests(statusFilter[role]).then((data) => {
      setRequests(data);
      setLoading(false);
    });
  }, [role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
        Loading requests…
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-gray-400 text-sm gap-2">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-1">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="2" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        No requests found
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
          <tr>
            {["Business", "Branch", "Sales Rep", "Machines", "Submitted", "Status"].map((h) => (
              <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((r, i) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`cursor-pointer hover:bg-blue-50 transition-colors ${i > 0 ? "border-t border-gray-100" : ""}`}
            >
              <td className="px-5 py-4">
                <div className="font-medium text-[#0e2d6b]">{r.business_name}</div>
                <div className="text-xs text-gray-400">{r.city}, {r.state}</div>
              </td>
              <td className="px-5 py-4 text-gray-600">{r.branch || "—"}</td>
              <td className="px-5 py-4 text-gray-600">{r.sales_rep || "—"}</td>
              <td className="px-5 py-4 text-gray-600">{r.machine_count ?? "—"}</td>
              <td className="px-5 py-4 text-gray-400 text-xs">
                {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Planogram Read-Only ───────────────────────────────────────────────────────

function ReadOnlyPlanogram({ machine }: { machine: DbMachine }) {
  const type = MACHINE_TYPES.find((t) => t.id === machine.machine_type_id);
  if (!type) return null;
  const isGrid = type.rows !== null;

  if (!isGrid) {
    // Build rows from buttonMap if available, else one row per column
    const rows: { btns: string; cols: number[] }[] = type.buttonMap
      ? type.buttonMap.map((g) => ({ btns: g.buttons.join(" / "), cols: g.columns }))
      : Array.from({ length: type.columns }, (_, i) => ({ btns: String(i + 1), cols: [i] }));

    return (
      <div className="space-y-1">
        {rows.map(({ btns, cols }) => {
          const slot = machine.slots?.[String(cols[0])];
          const [brand, flavor, size] = (slot?.productDescription ?? "").split(" · ");
          return (
            <div
              key={btns}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${slot ? "bg-[#174a92]/5 border border-[#174a92]/15" : "bg-gray-50 border border-dashed border-gray-200"}`}
            >
              {/* Button label */}
              <div className="w-14 flex-shrink-0 text-center">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">BTN</div>
                <div className="text-[11px] font-bold text-gray-600">{btns}</div>
              </div>
              <div className="w-px h-7 bg-gray-200 flex-shrink-0" />
              {/* Columns */}
              <div className="w-12 flex-shrink-0 text-center">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">COL</div>
                <div className="text-[11px] font-bold text-gray-600">
                  {cols.length > 1 ? `${cols[0] + 1}–${cols[cols.length - 1] + 1}` : String(cols[0] + 1)}
                </div>
              </div>
              <div className="w-px h-7 bg-gray-200 flex-shrink-0" />
              {slot ? (
                <>
                  {slot.productImageUrl && (
                    <img src={slot.productImageUrl} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#0e2d6b] text-[12px]">{brand}</span>
                    {flavor && <span className="text-gray-500 text-[12px]">{flavor}</span>}
                    {size && <span className="text-[#174a92] text-[11px]">{size}</span>}
                  </div>
                  <div className="flex-shrink-0 font-semibold text-[#174a92] text-[13px] ml-auto">${slot.price}</div>
                </>
              ) : (
                <div className="flex-1 text-gray-300 text-xs italic">Empty</div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max text-[10px]">
        <div className="flex gap-1 mb-1 ml-6">
          {Array.from({ length: type.columns }, (_, c) => (
            <div key={c} className="w-[70px] text-center text-[10px] text-gray-400 font-bold">{colLabel(c)}</div>
          ))}
        </div>
        {Array.from({ length: type.rows! }, (_, r) => (
          <div key={r} className="flex items-center gap-1 mb-1.5 break-inside-avoid">
            <div className="w-5 text-right text-[10px] text-gray-400 font-semibold flex-shrink-0">{r + 1}</div>
            {Array.from({ length: type.columns }, (_, c) => {
              const slot = machine.slots?.[`${c}-${r}`];
              const [brand, flavor, size] = (slot?.productDescription ?? "").split(" · ");
              return (
                <div key={c} className={`w-[70px] h-[88px] rounded-lg border flex flex-col items-center justify-center text-center px-1 py-1.5 gap-px ${slot ? "border-[#174a92]/30 bg-[#174a92]/5" : "border-dashed border-gray-200"}`}>
                  {slot ? (
                    <>
                      {slot.productImageUrl
                        ? <img src={slot.productImageUrl} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
                        : <div className="w-7 h-7" />
                      }
                      <div className="text-[8px] font-semibold text-gray-800 w-full leading-tight truncate">{brand}</div>
                      {flavor && <div className="text-[7px] text-gray-500 w-full leading-tight truncate">{flavor}</div>}
                      <div className="text-[7.5px] text-[#174a92] leading-tight">{size}</div>
                      <div className="text-[8px] font-bold text-[#174a92]">${slot.price}</div>
                    </>
                  ) : <span className="text-gray-300 text-sm">—</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Request Detail ────────────────────────────────────────────────────────────

function RequestDetail({
  id,
  role,
  onBack,
}: {
  id: string;
  role: DashboardRole;
  onBack: () => void;
}) {
  const [request, setRequest] = useState<DbRequest | null>(null);
  const [machines, setMachines] = useState<DbMachine[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<DbMachine>>>({});
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchRequestDetail(id).then(({ request: r, machines: m }) => {
      setRequest(r);
      setMachines(m);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const setEdit = (machineId: string, field: keyof DbMachine, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [machineId]: { ...prev[machineId], [field]: value },
    }));
  };

  const saveEdits = async () => {
    setSaving(true);
    await Promise.all(
      Object.entries(edits).map(([mId, patch]) => updateMachine(mId, patch))
    );
    setEdits({});
    await load();
    setSaving(false);
  };

  const advanceStatus = async () => {
    if (!request) return;
    setAdvancing(true);
    const next =
      request.status === "submitted" ? "vending_review" :
      request.status === "vending_review" ? "mdm_ready" :
      "complete";
    await updateRequestStatus(id, next);
    await load();
    setAdvancing(false);
  };

  const downloadVipCsv = () => {
    if (!request) return;
    const headers = [
      "Business Name", "Address", "City", "State", "ZIP",
      "Contact Name", "Contact Phone", "Contact Email",
      "AP Vendor Number", "Billing Account Name", "Commission Rate",
      "Billing Contact First Name", "Billing Contact Last Name",
      "Billing Contact Email", "Billing Contact Phone",
      "Machine Location Name", "Short Name", "Machine Type",
      "Asset Number", "Telemeter Serial Number",
    ];
    const rows = machines.map((m) => {
      const type = MACHINE_TYPES.find((t) => t.id === m.machine_type_id);
      return [
        request.business_name, request.address, request.city, request.state, request.zip,
        request.contact_name, request.contact_phone, request.contact_email,
        request.ap_vendor_number, request.billing_account_name, request.commission_rate,
        request.billing_contact_first_name, request.billing_contact_last_name,
        request.billing_contact_email, request.billing_contact_phone,
        m.location_name, m.short_name, type?.label ?? m.machine_type_id,
        m.asset_number ?? "", m.card_reader_serial ?? "",
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `VIP_${request.business_name.replace(/\s+/g, "_")}_${request.id.slice(0, 8)}.csv`;
    a.click();
  };

  if (loading || !request) {
    return (
      <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  const inputCls = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#174a92]/25 focus:border-[#174a92]";

  const vendingReady = role === "Vending" && machines.every((m) => {
    const asset = edits[m.id]?.asset_number ?? m.asset_number;
    const cr = edits[m.id]?.card_reader_serial ?? m.card_reader_serial;
    return asset && cr;
  });

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Screen-only top bar */}
      <div className="no-print max-w-4xl mx-auto px-8 pt-8 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to list
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1" y="4" width="11" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M3.5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4" stroke="currentColor" strokeWidth="1.2"/>
              <rect x="3.5" y="7.5" width="6" height="2" rx="0.5" fill="currentColor" opacity=".4"/>
            </svg>
            Print
          </button>
          <StatusBadge status={request.status} />
          <span className="text-xs text-gray-400 font-mono">{request.id.slice(0, 8)}</span>
        </div>
      </div>

      <div className="print-region max-w-4xl mx-auto px-8 py-6 space-y-6">

        {/* Print-only header */}
        <div className="hidden print:block mb-4">
          <div className="text-lg font-bold text-[#0e2d6b]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            PCNY — Vending Machine Request
          </div>
          <div className="text-sm text-gray-500">{request.business_name} · {request.address}, {request.city}, {request.state} {request.zip}</div>
          <div className="text-xs text-gray-400 mt-0.5">Printed {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
        </div>

        {/* Customer Details */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 break-inside-avoid">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Customer Details</div>
          <dl className="grid grid-cols-[160px_1fr] gap-y-3 text-sm">
            <dt className="text-gray-500">Business</dt>
            <dd className="font-medium text-[#0e2d6b]">{request.business_name}</dd>
            {request.business_short_name && (<><dt className="text-gray-500">Short Name</dt><dd className="font-mono text-gray-700">{request.business_short_name}</dd></>)}
            <dt className="text-gray-500">Address</dt>
            <dd className="text-gray-700">{request.address}, {request.city}, {request.state} {request.zip}</dd>
            <dt className="text-gray-500">On-Site Contact</dt>
            <dd className="text-gray-700">{request.contact_name}{request.contact_phone ? ` · ${request.contact_phone}` : ""}</dd>
            {request.contact_email && <><dt className="text-gray-500">Email</dt><dd className="text-gray-700">{request.contact_email}</dd></>}
            <dt className="text-gray-500">Sales Rep</dt>
            <dd className="text-gray-700">{request.sales_rep}</dd>
            <dt className="text-gray-500">Approved By</dt>
            <dd className="text-gray-700">{request.approved_by}</dd>
            <dt className="text-gray-500">Branch</dt>
            <dd className="text-gray-700">{request.branch}</dd>
            {request.distributor && <><dt className="text-gray-500">Distributor</dt><dd className="text-gray-700">{request.distributor}</dd></>}
            {request.notes && <><dt className="text-gray-500">Notes</dt><dd className="text-gray-700">{request.notes}</dd></>}
          </dl>
        </section>

        {/* Billing Details */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 break-inside-avoid">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Billing Details</div>
          {request.billing_skipped ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
              Vendor setup pending
            </div>
          ) : (
            <dl className="grid grid-cols-[160px_1fr] gap-y-3 text-sm">
              <dt className="text-gray-500">AP Vendor #</dt>
              <dd className="text-gray-700">{request.ap_vendor_number}</dd>
              <dt className="text-gray-500">Billing Account</dt>
              <dd className="text-gray-700">{request.billing_account_name}</dd>
              <dt className="text-gray-500">Commission Rate</dt>
              <dd className="text-gray-700">{request.commission_rate}%</dd>
              <dt className="text-gray-500">Billing Contact</dt>
              <dd className="text-gray-700">{request.billing_contact_first_name} {request.billing_contact_last_name}</dd>
              <dt className="text-gray-500">Billing Email</dt>
              <dd className="text-gray-700">{request.billing_contact_email}</dd>
              <dt className="text-gray-500">Billing Phone</dt>
              <dd className="text-gray-700">{request.billing_contact_phone}</dd>
            </dl>
          )}
        </section>

        {/* Machines */}
        {machines.map((machine, idx) => {
          const type = MACHINE_TYPES.find((t) => t.id === machine.machine_type_id);
          const assetVal = edits[machine.id]?.asset_number ?? machine.asset_number ?? "";
          const crVal = edits[machine.id]?.card_reader_serial ?? machine.card_reader_serial ?? "";

          return (
            <section key={machine.id} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 break-inside-avoid">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#0e2d6b]">
                    {idx + 1}. {machine.location_name}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {type?.label ?? machine.machine_type_id}
                    {" · "}
                    {machine.machine_status === "existing" ? "Existing machine" : "New placement"}
                    {" · "}
                    {machine.pricing_mode === "single" ? `$${machine.single_price} flat` : "Multiple prices"}
                  </div>
                </div>
              </div>

              {/* Vending fields */}
              {role === "Vending" ? (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  {[
                    { label: "Machine Asset Number", field: "asset_number" as keyof DbMachine, val: assetVal, original: machine.asset_number, placeholder: "e.g. 0700123456" },
                    { label: "Telemeter Serial Number", field: "card_reader_serial" as keyof DbMachine, val: crVal, original: machine.card_reader_serial, placeholder: "Serial number" },
                  ].map(({ label, field, val, original, placeholder }) => {
                    const changed = original && val && val !== original;
                    return (
                      <div key={field}>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          {label} <span className="text-[#174a92]">*</span>
                        </label>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => setEdit(machine.id, field, e.target.value)}
                          placeholder={placeholder}
                          className={`${inputCls} ${changed ? "border-amber-400 ring-1 ring-amber-300" : ""}`}
                        />
                        {original && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                            {changed ? (
                              <>
                                <span className="text-gray-400 line-through font-mono text-[12px]">{original}</span>
                                <span className="text-amber-500">→</span>
                                <span className="text-amber-600 font-mono font-semibold text-[12px]">{val}</span>
                              </>
                            ) : (
                              <span className="text-gray-400">Submitted: <span className="font-mono">{original}</span></span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex gap-6 text-sm pt-2 border-t border-gray-100">
                  <div>
                    <span className="text-gray-500 text-xs">Asset Number </span>
                    <span className="font-mono text-gray-700">{machine.asset_number || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Card Reader </span>
                    <span className="font-mono text-gray-700">{machine.card_reader_serial || "—"}</span>
                  </div>
                </div>
              )}

              {/* Planogram */}
              {(role === "Route Accounting" || role === "Vending" || role === "MDM") && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Planogram</div>
                  <ReadOnlyPlanogram machine={machine} />
                </div>
              )}
            </section>
          );
        })}

        {/* Action footer — screen only */}
        <div className="no-print flex items-center justify-between pb-8">
          <div />
          <div className="flex items-center gap-3">
            {role === "Vending" && hasEdits && (
              <button
                onClick={saveEdits}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-[#174a92] text-[#174a92] hover:bg-[#174a92]/5 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            )}
            {role === "Vending" && request.status === "submitted" && (
              <button
                onClick={advanceStatus}
                disabled={advancing || !vendingReady}
                title={!vendingReady ? "All machines must have asset numbers and card reader serials" : undefined}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#174a92] text-white hover:bg-[#0e3585] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {advancing ? "Updating…" : "Mark Ready for MDM →"}
              </button>
            )}
            {role === "MDM" && request.status === "vending_review" && (
              <>
                <button
                  onClick={downloadVipCsv}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ↓ Download VIP CSV
                </button>
                <button
                  onClick={advanceStatus}
                  disabled={advancing}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#174a92] text-white hover:bg-[#0e3585] disabled:opacity-40 transition-colors"
                >
                  {advancing ? "Updating…" : "Mark Complete →"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Shell ───────────────────────────────────────────────────────────

export default function Dashboard({ onClose }: { onClose: () => void }) {
  const [role, setRole] = useState<DashboardRole | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="text-white px-8 py-3 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: "#174a92" }}>
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 13L7 9l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/50 leading-none mb-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Submissions
            </div>
            <div className="text-sm font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Dashboard
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {role && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">Role:</span>
              <span className="text-xs font-semibold text-white">{role}</span>
              <button
                onClick={() => { setRole(null); setSelectedId(null); }}
                className="text-xs text-white/40 hover:text-white/70 transition-colors ml-1 underline underline-offset-2"
              >
                Switch
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      {!role ? (
        <RoleSelector onSelect={setRole} />
      ) : selectedId ? (
        <RequestDetail
          id={selectedId}
          role={role}
          onBack={() => setSelectedId(null)}
        />
      ) : (
        <>
          <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
            <div>
              <div className="font-semibold text-[#0e2d6b] text-sm">
                {role === "Vending" ? "Pending Vending Review" :
                 role === "MDM" ? "Ready for MDM Processing" :
                 "All Requests"}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {role === "Vending" ? "Verify asset IDs and add card reader serials" :
                 role === "MDM" ? "Download VIP data and mark requests complete" :
                 "Click a request to view details"}
              </div>
            </div>
          </div>
          <RequestList role={role} onSelect={setSelectedId} />
        </>
      )}
    </div>
  );
}
