import { useState, useEffect, useRef } from "react";
import logo from "./imports/PCNY_logo.png";
import AdminPanel from "./components/AdminPanel";
import Dashboard from "./components/Dashboard";
import { LocationData, MachineEntry, FormStep } from "./types";
import { MACHINE_TYPES } from "./data";
import { fixtureLocation, fixtureMachines } from "./dev/testFixture";
import { loadFiltersRemote } from "./lib/filterConfig";
import { submitRequest } from "./lib/supabase";

const DEV_PREVIEW = false; // set to true to jump straight to Review with test data
import LocationForm from "./components/LocationForm";
import BillingForm from "./components/BillingForm";
import MachinesSection from "./components/MachinesSection";
import ReviewSection from "./components/ReviewSection";

const STEPS: { id: FormStep; label: string; sub: string }[] = [
  { id: "location", label: "Customer Details", sub: "Account & contact info" },
  { id: "billing", label: "Billing Details", sub: "AP account & commission" },
  { id: "machines", label: "Configure Machines", sub: "Add and set up each machine" },
  { id: "review", label: "Review & Submit", sub: "Confirm and send request" },
];

const defaultLocation: LocationData = {
  businessName: "",
  businessShortName: "",
  address: "",
  city: "",
  state: "NY",
  zip: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  salesRep: "",
  approvedBy: "",
  branch: "",
  distributor: "",
  apVendorNumber: "",
  billingAccountName: "",
  commissionRate: "",
  billingContactFirstName: "",
  billingContactLastName: "",
  billingContactEmail: "",
  billingContactPhone: "",
  billingSkipped: false,
  notes: "",
};

function StepIndicator({ current }: { current: FormStep }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4 flex-shrink-0 overflow-x-auto">
      <div className="flex items-center min-w-max">
        {STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    done
                      ? "bg-[#174a92] text-white"
                      : active
                        ? "bg-[#0e2d6b] text-white"
                        : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {done ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5l2.5 2.5 3.5-4"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <div>
                  <div
                    className={`text-sm font-semibold leading-tight ${
                      active
                        ? "text-[#0e2d6b]"
                        : done
                          ? "text-[#174a92]"
                          : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-xs text-gray-500">{step.sub}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-10 mx-4 transition-colors ${done ? "bg-[#174a92]" : "bg-gray-200"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SESSION_KEY = "pcny_form_session";

function loadSession(): { step: FormStep; location: LocationData; machines: MachineEntry[] } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(step: FormStep, location: LocationData, machines: MachineEntry[]) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ step, location, machines })); }
  catch { /* storage full — fail silently */ }
}

export default function App() {
  const saved = DEV_PREVIEW ? null : loadSession();
  const [step, setStep] = useState<FormStep>(DEV_PREVIEW ? "review" : (saved?.step ?? "location"));
  const [location, setLocation] = useState<LocationData>(DEV_PREVIEW ? fixtureLocation : (saved?.location ?? defaultLocation));
  const [machines, setMachines] = useState<MachineEntry[]>(DEV_PREVIEW ? fixtureMachines : (saved?.machines ?? []));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [errorTipOpen, setErrorTipOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Persist form state across refreshes (sessionStorage clears on tab close)
  useEffect(() => {
    if (!DEV_PREVIEW) saveSession(step, location, machines);
  }, [step, location, machines]);

  // Load filters from Supabase on startup so product pickers are always filtered correctly
  useEffect(() => { loadFiltersRemote(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        e.preventDefault();
        setAdminOpen((o) => !o);
      }
      if (e.ctrlKey && e.shiftKey && e.key === "K") {
        e.preventDefault();
        setStep((s) =>
          s === "location" ? "billing" :
          s === "billing" ? "machines" :
          s === "machines" ? "review" : s
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const canContinueLocation =
    location.businessName.trim() !== "" &&
    (location.businessShortName ?? "").trim() !== "" &&
    location.address.trim() !== "" &&
    location.city.trim() !== "" &&
    location.zip.trim() !== "" &&
    location.contactName.trim() !== "" &&
    location.contactPhone.trim() !== "" &&
    location.salesRep.trim() !== "" &&
    location.approvedBy.trim() !== "" &&
    location.branch.trim() !== "";

  const canContinueBilling =
    location.commissionRate.trim() !== "" &&
    (location.billingSkipped ||
      (location.apVendorNumber.trim() !== "" &&
        location.billingAccountName.trim() !== "" &&
        location.billingContactFirstName.trim() !== "" &&
        location.billingContactLastName.trim() !== "" &&
        location.billingContactEmail.trim() !== "" &&
        location.billingContactPhone.trim() !== ""));

  const canContinueMachines =
    machines.length > 0 &&
    machines.every((m) => {
      if (m.locationName.trim() === "" || m.machineTypeId === "") return false;
      const type = MACHINE_TYPES.find((t) => t.id === m.machineTypeId);
      if (!type) return false;
      const totalSlots = type.rows ? type.columns * type.rows : type.columns;
      return Object.keys(m.slots).length === totalSlots;
    }) &&
    // no duplicate location names
    new Set(machines.map((m) => m.locationName.trim().toLowerCase())).size ===
      machines.length;

  const next = () => {
    if (step === "location") setStep("billing");
    else if (step === "billing") setStep("machines");
    else if (step === "machines") setStep("review");
  };

  const back = () => {
    if (step === "billing") setStep("location");
    else if (step === "machines") setStep("billing");
    else if (step === "review") setStep("machines");
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const id = await submitRequest(location, machines);
      sessionStorage.removeItem(SESSION_KEY);
      setRequestId(id);
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M8 16l5 5 11-11"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2
          className="text-2xl font-semibold text-[#0e2d6b] mb-2"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Request Submitted
        </h2>
        <p className="text-gray-500 text-sm max-w-sm">
          Your request for {machines.length} vending machine
          {machines.length !== 1 ? "s" : ""} at{" "}
          <strong>{location.businessName}</strong> has been sent to operations.
        </p>
        {requestId && (
          <div className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-xs text-gray-400 font-mono">
            Request ID: {requestId}
          </div>
        )}
        <button
          onClick={() => {
            setSubmitted(false);
            setSubmitError(null);
            setRequestId(null);
            sessionStorage.removeItem(SESSION_KEY);
            setStep("location");
            setLocation(defaultLocation);
            setMachines([]);
          }}
          className="mt-8 px-6 py-2.5 bg-[#0e2d6b] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a3e] transition-colors"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  if (dashboardOpen) {
    return (
      <>
        <Dashboard onClose={() => setDashboardOpen(false)} />
        {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
      </>
    );
  }

  return (
    <>
    <div className="min-h-full flex flex-col">
      {/* App header */}
      <header className="text-white px-4 sm:px-8 py-3 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: "#174a92" }}>
        <img
          src={logo}
          alt="Pepsi-Cola Bottling Company of New York, Inc."
          className="h-10 w-auto"
        />
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div
              className="text-sm font-semibold leading-tight"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              New Vending Machine Request
            </div>
          </div>
          {/* ⋯ menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
              title="More options"
            >
              ···
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 min-w-[180px] z-50">
                <button
                  onClick={() => { setDashboardOpen(true); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Submissions Dashboard
                </button>
                <button
                  onClick={() => { setAdminOpen(true); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Product Filter Admin
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <StepIndicator current={step} />

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          {step === "location" && (
            <LocationForm data={location} onChange={setLocation} />
          )}
          {step === "billing" && (
            <BillingForm data={location} onChange={setLocation} />
          )}
          {step === "machines" && (
            <MachinesSection machines={machines} onChange={setMachines} customerShortName={location.businessShortName ?? ""} />
          )}
          {step === "review" && (
            <ReviewSection location={location} machines={machines} />
          )}
        </div>
      </main>

      {/* Footer nav */}
      <footer className="bg-white border-t border-gray-200 px-4 sm:px-8 py-4 flex flex-wrap justify-between items-center gap-2 flex-shrink-0">
        <button
          onClick={back}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors ${step === "location" ? "invisible" : ""}`}
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          {(() => {
            const errMsg =
              step === "machines" && machines.length > 0 && !canContinueMachines
                ? machines.some((m) => m.locationName.trim() === "" || m.machineTypeId === "")
                  ? "All machines need a name and type"
                  : new Set(machines.map((m) => m.locationName.trim().toLowerCase())).size !== machines.length
                    ? "Location names must be unique"
                    : "All slots must be configured before continuing"
                : submitError ?? null;
            if (!errMsg) { if (errorTipOpen) setErrorTipOpen(false); return null; }
            return (
              <div className="relative">
                <button
                  onClick={() => setErrorTipOpen((o) => !o)}
                  className="w-7 h-7 rounded-full bg-amber-100 border border-amber-300 text-amber-600 flex items-center justify-center text-sm font-bold"
                >
                  !
                </button>
                {errorTipOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 leading-snug z-50">
                    {errMsg}
                    <div className="absolute top-full right-3 border-4 border-transparent border-t-gray-900" />
                  </div>
                )}
              </div>
            );
          })()}
          {step !== "review" ? (
            <button
              onClick={next}
              disabled={
                step === "location"
                  ? !canContinueLocation
                  : step === "billing"
                    ? !canContinueBilling
                    : step === "machines"
                      ? !canContinueMachines
                      : false
              }
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-[#174a92] text-white hover:bg-[#0e3585] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {step === "machines"
                ? <><span className="sm:hidden">Review →</span><span className="hidden sm:inline">Review Request →</span></>
                : step === "billing"
                  ? <><span className="sm:hidden">Configure →</span><span className="hidden sm:inline">Configure Machines →</span></>
                  : "Continue →"}
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-[#174a92] text-white hover:bg-[#0e3585] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          )}
        </div>
      </footer>
    </div>

    {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </>
  );
}
