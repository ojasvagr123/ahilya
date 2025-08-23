import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { shareToDept, type Department } from "../api/share";
import { getReports } from "../api";

type NavState = {
  rowIds?: Array<number | string>;
  filter?: "all" | "sms" | "url" | "voip";
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

// Keep these two EXACTLY as before
const CYBER_EMAIL = import.meta.env.VITE_DEMO_CYBER_EMAIL ?? "cyber-crime@police.mp.gov.in";
const TEAMMATE_EMAIL = import.meta.env.VITE_DEMO_TEAMMATE_EMAIL ?? "ojasv.agrawal280705@gmail.com";

// Around ~15 departments total. The first two remain unchanged.
// The rest use plausible, fake addresses.
const DEPTS: { id: Department; name: string; email: string }[] = [
  { id: "CYBER_CRIME" as Department, name: "Cyber Crime", email: CYBER_EMAIL },
  { id: "TEAMMATE" as Department, name: "Teammate", email: TEAMMATE_EMAIL },

  { id: "TRAFFIC_POLICE" as Department, name: "Traffic Police", email: "traffic.indore@police.mp.gov.in" },
  { id: "ANTI_FRAUD_CELL" as Department, name: "Anti-Fraud Cell", email: "anti-fraud@indore.gov.in" },
  { id: "WOMEN_HELPLINE" as Department, name: "Women Helpline", email: "whl@indore.gov.in" },
  { id: "CYBER_PATROL" as Department, name: "Cyber Patrol Unit", email: "cyberpatrol@police.mp.gov.in" },
  { id: "FINCRIME_UNIT" as Department, name: "Financial Crimes Unit", email: "fincrime@indore.gov.in" },
  { id: "BANK_OMBUDSMAN" as Department, name: "Banking Ombudsman", email: "ombudsman@rbi-indore.org" },
  { id: "TELECOM_COMPLIANCE" as Department, name: "Telecom Compliance", email: "compliance@telecom-indore.in" },
  { id: "DISTRICT_COLLECTOR" as Department, name: "District Collector Office", email: "dc.office@indore.gov.in" },
  { id: "POLICE_HQ" as Department, name: "Police Headquarters", email: "hq@police.mp.gov.in" },
  { id: "SOCIAL_ENGINEERING_DESK" as Department, name: "Social Engineering Desk", email: "sedesk@indore.gov.in" },
  { id: "PUBLIC_GRIEVANCE" as Department, name: "Public Grievance Cell", email: "pgcell@indore.gov.in" },
  { id: "CERT_INDIA" as Department, name: "CERT India (local liaison)", email: "cert-liaison@meity.gov.in" },
  { id: "IT_CELL" as Department, name: "IT Cell", email: "itcell@indore.gov.in" }
];

export default function SharePage() {
  const nav = useNavigate();
  const loc = useLocation();
  const state = (loc.state || {}) as NavState;

  const [dept, setDept] = useState(DEPTS[0]);
  const [note, setNote] = useState("");
  const [ids, setIds] = useState<Array<number | string>>(state.rowIds ?? []);
  const [busy, setBusy] = useState(false);

  // Map UI filter -> API param shape
  const toApiType = (f?: NavState["filter"]) =>
    !f || f === "all" ? undefined : (f.toUpperCase() as "SMS" | "URL" | "VOIP");

  // Fallback: if no IDs passed, fetch by the current filter
  useEffect(() => {
    if (ids.length) return;
    const limit = 500;
    const apiType = toApiType(state.filter);
    setBusy(true);
    getReports(apiType as any, limit)
      .then(list => setIds((list ?? []).map((r: any) => r.id)))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const token = localStorage.getItem("token") ?? "";

  async function doShare() {
    if (!token) {
      alert("Missing auth token. Please login again.");
      return;
    }
    if (!ids.length) {
      alert("No reports to share.");
      return;
    }

    try {
      setBusy(true);
      await shareToDept({
        token,
        department: dept.id,
        reportIds: ids,
        note
      });
      alert(`Shared ${ids.length} report(s) with ${dept.name} (${dept.email}).`);
      nav("/");
    } catch (e: any) {
      console.error(e);
      alert(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    // Match dashboard: page-level overflow hidden; content area scrolls
    <div className="min-h-screen bg-[#fff4e9] overflow-hidden">
      {/* Header copied from dashboard/login */}
      <div className="bg-[#e07b3a] shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left: Logos + Title */}
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center shadow border border-[#f2c197] bg-white overflow-hidden">
                <img src="/images/ahilya-logo.png" alt="Ahilya Logo" className="object-contain w-full h-full" />
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-bold">अहिल्या रक्षासूत्र</h1>
                <p className="text-sm">Ahilya RakshaSutra - Indore Fraud Detection System</p>
              </div>
            </div>

            {/* Right: Honeypot + Logout + IMC */}
            <div className="flex items-center space-x-4">

              <button
                onClick={() => {
                  // reuse Dashboard behavior
                  try {
                    // soft logout if available via API base
                    fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
                  } catch {}
                  localStorage.removeItem("token");
                  location.href = "/login";
                }}
                className="px-4 py-2 rounded-xl font-semibold bg-[#fff9f3] border border-[#f2c197] shadow text-[#4a2e05] hover:bg-white transition"
                title="Logout"
              >
                Logout
              </button>

              <div className="w-16 h-16 rounded-full flex items-center justify-center shadow border border-[#f2c197] bg-[#fff9f3] overflow-hidden">
                <img src="/images/imc-logo.png" alt="IMC Logo" className="object-contain w-full h-full" />
              </div>
              <div className="text-white text-right">
                <p className="text-sm font-medium">Indore Municipal Corporation</p>
                <p className="text-xs">इंदौर नगर निगम</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content area: locked height, scrolls inside */}
      <div className="h-[calc(100vh-80px)]">
        <div className="h-full overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6">
            <div className="bg-[#fffdfb] border border-[#f2c197] rounded-xl shadow p-5">
              <h1 className="text-xl font-semibold mb-4 text-[#4a2e05]">Share to Department</h1>

              <label className="block text-sm mb-1 text-[#4a2e05]">Department</label>
              <select
                value={dept.id}
                onChange={e => setDept(DEPTS.find(d => d.id === (e.target.value as Department)) || DEPTS[0])}
                className="w-full bg-[#fffaf6] border border-[#f2c197] rounded-md px-2 py-2 mb-3 text-[#4a2e05]"
              >
                {DEPTS.map(d => (
                  <option key={String(d.id)} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>

              <label className="block text-sm mb-1 text-[#4a2e05]">Email (auto)</label>
              <input
                value={dept.email}
                disabled
                className="w-full bg-[#fffaf6] border border-[#f2c197] rounded-md px-2 py-2 mb-3 text-[#4a2e05]"
              />

              <label className="block text-sm mb-1 text-[#4a2e05]">Optional note</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full bg-[#fffaf6] border border-[#f2c197] rounded-md px-2 py-2 mb-4 text-[#4a2e05]"
                rows={4}
                placeholder="Anything the dept should know..."
              />

              <div className="text-sm mb-4 text-[#5c3d0c]">
                Reports to share: <span className="text-[#4a2e05] font-medium">{ids.length}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => nav(-1)}
                  className="px-3 py-2 rounded-md border border-[#f2c197] bg-[#fff9f3] text-[#4a2e05]"
                >
                  Cancel
                </button>
                <button
                  onClick={doShare}
                  disabled={busy}
                  className={`px-3 py-2 rounded-md bg-[#e07b3a] text-white border border-[#f2c197] ${
                    busy ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {busy ? "Sharing…" : "Share"}
                </button>
              </div>

              {busy && (
                <div className="mt-4 text-sm text-[#5c3d0c]">
                  Working on it. Try not to click everything twice.
                </div>
              )}
            </div>

            {/* Tiny footer spacer so sticky mobile bars don't overlap */}
            <div className="h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
