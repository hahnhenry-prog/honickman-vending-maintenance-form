import { LocationData } from "../types";


interface Props {
  data: LocationData;
  onChange: (data: LocationData) => void;
}

function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-[#174a92] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#174a92]/25 focus:border-[#174a92] transition-colors placeholder:text-gray-400";

export default function LocationForm({ data, onChange }: Props) {
  const set =
    (key: keyof LocationData) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      onChange({ ...data, [key]: e.target.value });

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-semibold text-[#0e2d6b]"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Customer Details
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          This information applies to all vending machines at this account.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Business Information
        </div>
        <div className="space-y-4">
          <Field label="Business Name" required>
            <input
              type="text"
              value={data.businessName}
              onChange={set("businessName")}
              placeholder="e.g. Riverside Amusement Park"
              className={inputCls}
            />
          </Field>
          <Field label="Business Short Name" required>
            <input
              type="text"
              value={data.businessShortName ?? ""}
              onChange={(e) => onChange({ ...data, businessShortName: e.target.value.slice(0, 10) })}
              placeholder="e.g. Riverside"
              maxLength={10}
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Truncated description used for the account name in VIP. Max 10 characters — shorter is better.
              <span className={`ml-2 font-mono ${(data.businessShortName ?? "").length === 10 ? "text-amber-500" : "text-gray-400"}`}>
                {(data.businessShortName ?? "").length}/10
              </span>
            </p>
          </Field>
          <Field label="Street Address" required>
            <input
              type="text"
              value={data.address}
              onChange={set("address")}
              placeholder="123 Commerce Blvd"
              className={inputCls}
            />
          </Field>
          <Field label="City" required>
            <input
              type="text"
              value={data.city}
              onChange={set("city")}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State">
              <div className={`${inputCls} bg-gray-50 text-gray-700 font-medium cursor-not-allowed`}>
                NY
              </div>
            </Field>
            <Field label="ZIP" required>
              <input
                type="text"
                value={data.zip}
                onChange={set("zip")}
                maxLength={10}
                placeholder="e.g. 10001"
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          On-Site Contact
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          The administrative contact responsible for coordinating delivery, installation, and any on-site matters.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact Name" required>
              <input
                type="text"
                value={data.contactName}
                onChange={set("contactName")}
                className={inputCls}
              />
            </Field>
            <Field label="Phone" required>
              <input
                type="tel"
                value={data.contactPhone}
                onChange={set("contactPhone")}
                placeholder="(555) 000-0000"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Email">
            <input
              type="email"
              value={data.contactEmail}
              onChange={set("contactEmail")}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Request Details
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="PCNY Point of Contact" required>
              <input
                type="text"
                value={data.salesRep}
                onChange={set("salesRep")}
                placeholder="Your name"
                className={inputCls}
              />
            </Field>
            <Field label="Approved By" required>
              <select value={data.approvedBy ?? ""} onChange={set("approvedBy")} className={inputCls}>
                <option value="">Select approver…</option>
                <option>Joe Hayes</option>
                <option>Steve Cavallo</option>
                <option>Gil Montalvo</option>
                <option>Terrence Hoffman</option>
              </select>
            </Field>
            <Field label="Branch" required>
              <select value={data.branch ?? ""} onChange={set("branch")} className={inputCls}>
                <option value="">Select branch…</option>
                <option value="Bronx">Bronx</option>
                <option value="Queens">Queens</option>
                <option value="Brooklyn">Brooklyn</option>
                <option value="Long Island">Long Island</option>
              </select>
            </Field>
            <Field label="Distributor">
              <input
                type="text"
                value={data.distributor ?? ""}
                onChange={set("distributor")}
                placeholder="Distributor name"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={data.notes}
              onChange={set("notes")}
              rows={3}
              placeholder="Any special instructions or context for the operations team..."
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>
      </section>

    </div>
  );
}
