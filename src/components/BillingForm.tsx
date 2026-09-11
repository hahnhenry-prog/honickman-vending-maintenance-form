import { LocationData } from "../types";
import { parsePhone, formatPhone, isValidPhone } from "../lib/phone";

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

const inputDisabledCls =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-400 placeholder:text-gray-300 cursor-not-allowed";

export default function BillingForm({ data, onChange }: Props) {
  const set =
    (key: keyof LocationData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...data, [key]: e.target.value });

  const skipped = data.billingSkipped ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-semibold text-[#0e2d6b]"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Billing Details
        </h2>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          All vending customers must be set up as a vendor with Accounts Payable in order to receive commission.
          To submit a new vendor request, email{" "}
          <a href="mailto:APHelp@hongrp.com" className="text-[#174a92] hover:underline font-medium">APHelp@hongrp.com</a>
          {" "}with a completed{" "}
          <a href="https://honickman-catalog-images.s3.us-east-1.amazonaws.com/documents/Form W-9.pdf" target="_blank" rel="noreferrer" className="text-[#174a92] hover:underline font-medium">W-9</a>
          {" "}and{" "}
          <a href="https://honickman-catalog-images.s3.us-east-1.amazonaws.com/documents/Honickman ACH Request Form.pdf" target="_blank" rel="noreferrer" className="text-[#174a92] hover:underline font-medium">ACH form</a>.
          {" "}Commissions are paid via ACH only — no checks.
        </p>
      </div>

      <section className={`bg-white rounded-xl border border-gray-200 p-6 space-y-5 transition-opacity ${skipped ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Account
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="AP Vendor Number" required={!skipped}>
            <input
              type="text"
              value={data.apVendorNumber ?? ""}
              onChange={set("apVendorNumber")}
              placeholder="e.g. 1234"
              className={skipped ? inputDisabledCls : inputCls}
              disabled={skipped}
            />
          </Field>
          <Field label="Billing Account Name" required={!skipped}>
            <input
              type="text"
              value={data.billingAccountName ?? ""}
              onChange={set("billingAccountName")}
              placeholder="Legal billing entity name"
              className={skipped ? inputDisabledCls : inputCls}
              disabled={skipped}
            />
          </Field>
        </div>
      </section>

      {/* Commission Rate — always active */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-5">
          Commission
        </div>
        <Field label="Commission Rate" required>
          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-[#174a92]/25 focus-within:border-[#174a92] transition-colors w-36">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={data.commissionRate ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                  onChange({ ...data, commissionRate: val });
                }
              }}
              placeholder="0.0"
              className="flex-1 px-3 py-2 text-sm focus:outline-none bg-white"
            />
            <span className="px-3 py-2 text-sm border-l border-gray-300 text-gray-400 bg-gray-50 select-none">%</span>
          </div>
        </Field>
      </section>

      <section className={`bg-white rounded-xl border border-gray-200 p-6 space-y-5 transition-opacity ${skipped ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Billing Contact
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name" required={!skipped}>
            <input
              type="text"
              value={data.billingContactFirstName ?? ""}
              onChange={set("billingContactFirstName")}
              className={skipped ? inputDisabledCls : inputCls}
              disabled={skipped}
            />
          </Field>
          <Field label="Last Name" required={!skipped}>
            <input
              type="text"
              value={data.billingContactLastName ?? ""}
              onChange={set("billingContactLastName")}
              className={skipped ? inputDisabledCls : inputCls}
              disabled={skipped}
            />
          </Field>
          <Field label="Email" required={!skipped}>
            <input
              type="email"
              value={data.billingContactEmail ?? ""}
              onChange={set("billingContactEmail")}
              className={skipped ? inputDisabledCls : inputCls}
              disabled={skipped}
            />
          </Field>
          <Field label="Phone" required={!skipped}>
            <input
              type="tel"
              value={formatPhone(data.billingContactPhone ?? "")}
              onChange={(e) => onChange({ ...data, billingContactPhone: parsePhone(e.target.value) })}
              placeholder="(555) 000-0000"
              className={`${skipped ? inputDisabledCls : inputCls} ${!skipped && data.billingContactPhone && !isValidPhone(data.billingContactPhone) ? "border-red-300 focus:border-red-400 focus:ring-red-200" : ""}`}
              disabled={skipped}
            />
            {!skipped && data.billingContactPhone && !isValidPhone(data.billingContactPhone) && (
              <p className="text-xs text-red-500 mt-1">Enter a 10-digit US phone number.</p>
            )}
          </Field>
        </div>
      </section>

      {/* Skip option */}
      <label
        className={`flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
          skipped
            ? "border-amber-400 bg-amber-50"
            : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={skipped}
            onChange={(e) => onChange({ ...data, billingSkipped: e.target.checked })}
            className="w-4 h-4 accent-amber-500 cursor-pointer"
          />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">
            Valid only through September
          </div>
          <div className="text-sm font-medium text-gray-700 leading-snug">
            Skip vendor setup and request machines.
          </div>
          <div className="text-sm text-gray-500 mt-0.5 leading-snug">
            I understand that I still need to provide a valid AP vendor # and will do so by the end of the month.
          </div>
        </div>
      </label>
    </div>
  );
}
