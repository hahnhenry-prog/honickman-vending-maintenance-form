import { LocationData } from "../types";
import { Field, Input } from "@honickman/ui";
import { parsePhone, formatPhone, isValidPhone } from "../lib/phone";


interface Props {
  data: LocationData;
  onChange: (data: LocationData) => void;
}

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
          className="text-2xl font-semibold text-[var(--color-secondary)]"
          style={{ fontFamily: "var(--font-display)" }}
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
            <Input
              type="text"
              value={data.businessName}
              onChange={set("businessName")}
              placeholder="e.g. Riverside Amusement Park"
            />
          </Field>
          <Field label="Business Short Name" required>
            <Input
              type="text"
              value={data.businessShortName ?? ""}
              onChange={(e) => onChange({ ...data, businessShortName: e.target.value.slice(0, 10) })}
              placeholder="e.g. Riverside"
              maxLength={10}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Truncated description used for the account name in VIP. Max 10 characters — shorter is better.
              <span className={`ml-2 font-mono ${(data.businessShortName ?? "").length === 10 ? "text-amber-500" : "text-gray-400"}`}>
                {(data.businessShortName ?? "").length}/10
              </span>
            </p>
          </Field>
          <Field label="Street Address" required>
            <Input
              type="text"
              value={data.address}
              onChange={set("address")}
              placeholder="123 Commerce Blvd"
            />
          </Field>
          <Field label="City" required>
            <Input
              type="text"
              value={data.city}
              onChange={set("city")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State">
              <div className="hui-input bg-gray-50 text-gray-700 font-medium cursor-not-allowed">
                NY
              </div>
            </Field>
            <Field label="ZIP" required>
              <Input
                type="text"
                value={data.zip}
                onChange={set("zip")}
                maxLength={10}
                placeholder="e.g. 10001"
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
              <Input
                type="text"
                value={data.contactName}
                onChange={set("contactName")}
              />
            </Field>
            <Field label="Phone" required>
              <Input
                type="tel"
                value={formatPhone(data.contactPhone)}
                onChange={(e) => onChange({ ...data, contactPhone: parsePhone(e.target.value) })}
                placeholder="(555) 000-0000"
                invalid={!!(data.contactPhone && !isValidPhone(data.contactPhone))}
              />
              {data.contactPhone && !isValidPhone(data.contactPhone) && (
                <p className="text-xs text-red-500 mt-1">Enter a 10-digit US phone number.</p>
              )}
            </Field>
          </div>
          <Field label="Email">
            <Input
              type="email"
              value={data.contactEmail}
              onChange={set("contactEmail")}
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
              <Input
                type="text"
                value={data.salesRep}
                onChange={set("salesRep")}
                placeholder="Your name"
              />
            </Field>
            <Field label="Approved By" required>
              <select value={data.approvedBy ?? ""} onChange={set("approvedBy")} className="hui-input">
                <option value="">Select approver…</option>
                <option>Joe Hayes</option>
                <option>Steve Cavallo</option>
                <option>Gil Montalvo</option>
                <option>Terrence Hoffman</option>
              </select>
            </Field>
            <Field label="Branch" required>
              <select value={data.branch ?? ""} onChange={set("branch")} className="hui-input">
                <option value="">Select branch…</option>
                <option value="Bronx">Bronx</option>
                <option value="Queens">Queens</option>
                <option value="Brooklyn">Brooklyn</option>
                <option value="Long Island">Long Island</option>
              </select>
            </Field>
            <Field label="Distributor">
              <Input
                type="text"
                value={data.distributor ?? ""}
                onChange={set("distributor")}
                placeholder="Distributor name"
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={data.notes}
              onChange={set("notes")}
              rows={3}
              placeholder="Any special instructions or context for the operations team..."
              className="hui-input resize-none"
            />
          </Field>
        </div>
      </section>

    </div>
  );
}
