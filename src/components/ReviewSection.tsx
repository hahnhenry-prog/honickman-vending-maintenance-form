import { LocationData, MachineEntry } from "../types";
import { MACHINE_TYPES } from "../data";

interface Props {
  location: LocationData;
  machines: MachineEntry[];
}

export default function ReviewSection({ location, machines }: Props) {
  const totalMachines = machines.length;
  const uniqueSkus = new Set(
    machines.flatMap((m) => Object.values(m.slots).map((s) => s.productId))
  ).size;

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-semibold text-[#0e2d6b]"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Review & Submit
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Confirm everything looks right before sending to operations.
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
        {[
          { label: "Machines Requested", value: totalMachines },
          { label: "Products", value: uniqueSkus },
          {
            label: "PCNY Point of Contact",
            value: location.salesRep || "—",
            text: true,
          },
        ].map(({ label, value, text }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
              {label}
            </div>
            <div
              className={`font-semibold text-[#0e2d6b] ${text ? "text-base" : "text-2xl"}`}
              style={!text ? { fontFamily: "'Outfit', sans-serif" } : {}}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Location */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
          Location
        </div>
        <dl className="grid grid-cols-[120px_1fr] sm:grid-cols-[140px_1fr] gap-y-3 text-sm [overflow-wrap:anywhere]">
          <dt className="text-gray-500">Business</dt>
          <dd className="font-medium text-[#0e2d6b]">{location.businessName}</dd>
          <dt className="text-gray-500">Address</dt>
          <dd className="text-[#0e2d6b]">
            {location.address}, {location.city}
            {location.state && `, ${location.state}`}
            {location.zip && ` ${location.zip}`}
          </dd>
          {location.contactName && (
            <>
              <dt className="text-gray-500">On-Site Contact</dt>
              <dd className="text-[#0e2d6b]">
                {location.contactName}
                {location.contactPhone && ` · ${location.contactPhone}`}
              </dd>
            </>
          )}
          {location.contactEmail && (
            <>
              <dt className="text-gray-500">Email</dt>
              <dd className="text-[#0e2d6b]">{location.contactEmail}</dd>
            </>
          )}
          {location.approvedBy && (
            <>
              <dt className="text-gray-500">Approved By</dt>
              <dd className="font-medium text-[#0e2d6b]">{location.approvedBy}</dd>
            </>
          )}
          {location.branch && (
            <>
              <dt className="text-gray-500">Branch</dt>
              <dd className="font-medium text-[#0e2d6b]">{location.branch}</dd>
            </>
          )}
          {location.distributor && (
            <>
              <dt className="text-gray-500">Distributor</dt>
              <dd className="text-[#0e2d6b]">{location.distributor}</dd>
            </>
          )}
          {location.notes && (
            <>
              <dt className="text-gray-500">Notes</dt>
              <dd className="text-[#0e2d6b]">{location.notes}</dd>
            </>
          )}
        </dl>
      </section>

      {/* Billing */}
      {(location.billingSkipped || location.apVendorNumber || location.billingAccountName || location.commissionRate || location.billingContactFirstName || location.billingContactEmail) && (
        <section className={`bg-white rounded-xl border p-6 ${location.billingSkipped ? "border-amber-300 bg-amber-50" : "border-gray-200"}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Billing
            </div>
            {location.billingSkipped && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-amber-900">
                Vendor setup pending — due end of month
              </span>
            )}
          </div>
          <dl className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-y-3 text-sm [overflow-wrap:anywhere]">
            {location.apVendorNumber && (
              <>
                <dt className="text-gray-500">AP Vendor Number</dt>
                <dd className="font-medium text-[#0e2d6b]">{location.apVendorNumber}</dd>
              </>
            )}
            {location.billingAccountName && (
              <>
                <dt className="text-gray-500">Billing Account</dt>
                <dd className="font-medium text-[#0e2d6b]">{location.billingAccountName}</dd>
              </>
            )}
            {location.commissionRate && (
              <>
                <dt className="text-gray-500">Commission Rate</dt>
                <dd className="font-medium text-[#0e2d6b]">{location.commissionRate}%</dd>
              </>
            )}
            {(location.billingContactFirstName || location.billingContactLastName) && (
              <>
                <dt className="text-gray-500">Billing Contact</dt>
                <dd className="font-medium text-[#0e2d6b]">
                  {[location.billingContactFirstName, location.billingContactLastName].filter(Boolean).join(" ")}
                </dd>
              </>
            )}
            {location.billingContactEmail && (
              <>
                <dt className="text-gray-500">Billing Email</dt>
                <dd className="text-[#0e2d6b]">{location.billingContactEmail}</dd>
              </>
            )}
            {location.billingContactPhone && (
              <>
                <dt className="text-gray-500">Billing Phone</dt>
                <dd className="text-[#0e2d6b]">{location.billingContactPhone}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {/* Machines */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
          Machines ({totalMachines})
        </div>

        {/* VIP Account Names */}
        {machines.some((m) => m.shortName) && (
          <div className="mb-5 pb-5 border-b border-gray-100">
            <div className="text-xs text-gray-500 font-medium mb-2">VIP Account Names</div>
            <div className="flex flex-col gap-1">
              {machines.map((m, i) => {
                const name = `FS ${location.businessShortName ?? ""} ${m.shortName ?? ""}`.trim().toUpperCase();
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0e2d6b] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-mono text-sm text-[#0e2d6b]">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {machines.map((machine, i) => {
            const type = MACHINE_TYPES.find((t) => t.id === machine.machineTypeId);
            const slotEntries = Object.entries(machine.slots);
            const slotCount = slotEntries.length;

            // Group by product using cached slot data
            const productCounts = slotEntries.reduce<
              Record<string, { id: string; description: string; imageUrl?: string; price: string; count: number }>
            >((acc, [, slot]) => {
              if (!slot.productId) return acc;
              const key = slot.productId;
              if (!acc[key]) acc[key] = {
                id: slot.productId,
                description: slot.productDescription ?? slot.productId,
                imageUrl: slot.productImageUrl,
                price: slot.price,
                count: 0,
              };
              acc[key].count++;
              return acc;
            }, {});

            return (
              <div
                key={machine.id}
                className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
              >
                <div className="w-7 h-7 rounded-full bg-[#0e2d6b] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#0e2d6b] text-sm">
                    {machine.locationName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                    <span>{type?.label ?? "—"}</span>
                    {type && (
                      <>
                        <span>·</span>
                        <span>{slotCount} slot{slotCount !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span>{Object.values(productCounts).length} product{Object.values(productCounts).length !== 1 ? "s" : ""}</span>
                      </>
                    )}
                  </div>
                  {Object.values(productCounts).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.values(productCounts).map(({ id, description, imageUrl, price, count }) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700 border border-gray-200"
                        >
                          {imageUrl && (
                            <img src={imageUrl} alt="" className="w-4 h-4 object-contain rounded-sm bg-white/20" />
                          )}
                          {(() => { const p = description.split(" · "); return [p[0], p[1]].filter(Boolean).join(" · "); })()}
                          {count > 1 && <span className="opacity-70">×{count}</span>}
                          {price && <span className="opacity-70">· ${price}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="bg-[#174a92]/5 border border-[#174a92]/20 rounded-xl px-5 py-4 text-sm text-[#0e2d6b]">
        Each machine will generate a separate account in VIP. MDM will follow up to confirm account activation and equipment assignment. Once this has taken place, Sales may submit an EMO to request machine placements.
      </div>
    </div>
  );
}
