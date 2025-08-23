import { useEffect, useState, useMemo } from "react";
import {
  getSummary,
  getHeatmap,
  getReports,
  logout,
  predictBatch,
  type PredictItem,
  type ModelOut
} from "../api";
import Map from "../components/Map";
import SummaryBars from "../components/SummaryBars";
import { useNavigate } from "react-router-dom";

type Filter = "all" | "sms" | "url" | "voip";

const HONEYPOT_URL = "http://56.228.3.220/";
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

export default function Dashboard() {
  const navigate = useNavigate();

  const [counts, setCounts] = useState({ sms: 0, url: 0, voip: 0, honeypot: 0 });
  const [points, setPoints] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  const [modelById, setModelById] = useState<Record<string | number, ModelOut>>({});
  const [predicting, setPredicting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ---------- Data loaders ----------
  async function load() {
    const s = await getSummary();
    setCounts(s.counts);
    setPoints(await getHeatmap());
    //setRows(s.latest ?? []);
  }

  // Always fetch wide, filter locally so the dropdown always works
  async function loadTable(currentFilter: Filter) {
    const list = await getReports(undefined as any, 200);
    const all = Array.isArray(list) ? list : [];
    if (currentFilter === "all") {
      setRows(all);
      return;
    }
    const key = currentFilter.toLowerCase();
    setRows(all.filter(r => String(r?.type ?? "").toLowerCase() === key));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // only refresh counts + heatmap
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadTable(filter);
    const t = setInterval(() => loadTable(filter), 5000); // refresh table too
    return () => clearInterval(t);
  }, [filter]);


  // ---------- Helpers ----------
  function toUpperType(t: string) {
    return (t || "").toUpperCase();
  }

  function extractText(r: any): string {
    if (!r) return "";
    if (r.type === "sms") return r.payload?.text ?? "";
    if (r.type === "url") return r.payload?.url ?? "";
    if (r.type === "voip") return r.payload?.phone ?? "";
    return "";
  }

  // ---------- Actions ----------
  async function handleRunModels() {
    try {
      setPredicting(true);
      const payload: PredictItem[] = rows
        .map((r: any) => ({
          id: r.id as string | number,
          type: toUpperType(r.type) as "SMS" | "URL" | "VOIP",
          text: extractText(r)
        }))
        .filter(x => x.text && (x.type === "SMS" || x.type === "URL" || x.type === "VOIP"));

      if (payload.length === 0) {
        alert("No rows with text/URL/phone to run predictions on.");
        return;
      }

      const results: ModelOut[] = await predictBatch(payload);
      const merged = { ...modelById };
      for (const m of results) {
        if (m.id !== undefined) merged[m.id] = m;
      }
      setModelById(merged);
    } catch (e: any) {
      console.error(e);
      alert("Model API failed. Check backend logs and CORS.");
    } finally {
      setPredicting(false);
    }
  }

  async function handleExportCsv() {
    try {
      setExporting(true);
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Missing auth token. Please login again.");
        return;
      }
      const url = new URL(`${API_BASE}/reports/export`);
      if (filter !== "all") url.searchParams.set("type", filter);
      url.searchParams.set("limit", "10000");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Export failed (${res.status}) ${msg}`);
      }

      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = /filename="?([^"]+)"?/i.exec(cd);
      const filename = m?.[1] || "reports.csv";

      const a = document.createElement("a");
      const href = URL.createObjectURL(blob);
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e: any) {
      console.error(e);
      alert(e.message || String(e));
    } finally {
      setExporting(false);
    }
  }

  const tableRows = useMemo(() => {
    return rows.map((r: any) => {
      const m = modelById[r.id];
      return {
        ...r,
        _modelPrediction: m?.prediction,
        _modelScore: typeof m?.score === "number" ? m.score : undefined
      };
    });
  }, [rows, modelById]);

  const summaryCounts = useMemo(
    () => ({ sms: counts.sms, url: counts.url, voip: counts.voip }),
    [counts]
  );

  // ---------- UI ----------
  return (
    // Prevent the page itself from scrolling; we'll scroll only the right pane
    <div className="min-h-screen bg-[#fff4e9] overflow-hidden">
      {/* Header (same as Login) */}
      <div className="bg-[#e07b3a] shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left: Logos + Title */}
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center shadow border border-[#f2c197] bg-white overflow-hidden">
                <img
                  src="/images/ahilya-logo.png"
                  alt="Ahilya Logo"
                  className="object-contain w-full h-full"
                />
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-bold">अहिल्या रक्षासूत्र</h1>
                <p className="text-sm">Ahilya RakshaSutra - Indore Fraud Detection System</p>
              </div>
            </div>

            {/* Right: Honeypot + Logout + IMC */}
            <div className="flex items-center space-x-4">
              <a
                href={HONEYPOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl font-semibold bg-[#fff9f3] border border-[#f2c197] shadow text-[#4a2e05] hover:bg-white transition"
                title="Open Cowrie honeypot dashboard in a new tab"
              >
                Show Honeypot Logs
              </a>

              <button
                onClick={() => {
                  logout();
                  location.reload();
                }}
                className="px-4 py-2 rounded-xl font-semibold bg-[#fff9f3] border border-[#f2c197] shadow text-[#4a2e05] hover:bg-white transition"
                title="Logout"
              >
                Logout
              </button>

              <div className="w-16 h-16 rounded-full flex items-center justify-center shadow border border-[#f2c197] bg-[#fff9f3] overflow-hidden">
                <img
                  src="/images/imc-logo.png"
                  alt="IMC Logo"
                  className="object-contain w-full h-full"
                />
              </div>
              <div className="text-white text-right">
                <p className="text-sm font-medium">Indore Municipal Corporation</p>
                <p className="text-xs">इंदौर नगर निगम</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content locked to viewport height; right pane scrolls */}
      <div className="h-[calc(100vh-80px)] p-0">
        <div className="h-full grid grid-cols-[2fr_1fr]">
          {/* Left map panel stays fixed height, no scroll */}
          <div className="h-full bg-[#fffdfb] border-r border-[#f2c197] overflow-hidden">
            <Map points={points} />
          </div>

          {/* Right sidebar is the only scrollable area */}
          <div className="h-full p-4 overflow-y-auto bg-[#fffdfb] border-l-4 border-[#e07b3a]">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold mr-auto text-[#4a2e05]">Admin Dashboard</h2>

              <select
                value={filter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilter(e.target.value as Filter)
                }
                className="bg-[#fffaf6] border border-[#f2c197] rounded-md px-2 py-1 text-sm text-[#4a2e05]"
                title="Filter reports by type"
              >
                <option value="all">All</option>
                <option value="voip">VOIP</option>
                <option value="sms">SMS</option>
                <option value="url">URL</option>
              </select>
            </div>


            <div className="flex items-center justify-between mt-3 mb-2">
              <h3 className="font-medium text-[#4a2e05]">Recent Reports</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleRunModels}
                  disabled={predicting || rows.length === 0}
                  className={`px-3 py-1.5 rounded-md border ${
                    predicting ? "opacity-60 cursor-not-allowed" : ""
                  } border-[#f2c197] bg-[#e07b3a] text-white`}
                  title="Run model inference for visible rows"
                >
                  {predicting ? "Running…" : "Run Models"}
                </button>

                <button
                  onClick={handleExportCsv}
                  disabled={exporting || rows.length === 0}
                  className={`px-3 py-1.5 rounded-md border ${
                    exporting ? "opacity-60 cursor-not-allowed" : ""
                  } border-[#f2c197] bg-[#fff9f3] text-[#4a2e05]`}
                  title="Export current filter to CSV"
                >
                  {exporting ? "Exporting…" : "Export CSV"}
                </button>

                <button
                  onClick={() => {
                    const ids = rows.map((r: any) => r.id);
                    navigate("/share", { state: { rowIds: ids, filter } });
                  }}
                  className="px-3 py-1.5 rounded-md border border-[#f2c197] bg-[#fff9f3] text-[#4a2e05]"
                  title="Share current rows to a department"
                >
                  Share to Dept
                </button>

                <button
                  onClick={() => navigate("/alert")}
                  className="px-3 py-1.5 rounded-md bg-[#e07b3a] text-white"
                  title="Create and send an email alert"
                >
                  Create Alert
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[#5c3d0c]">
                  <tr className="border-b border-[#f2c197]">
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Area</th>
                    <th className="text-left py-2">Payload</th>
                    <th className="text-left py-2">When</th>
                    <th className="text-left py-2">Model</th>
                    <th className="text-left py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r: any) => (
                    <tr key={r.id} className="border-b border-[#fff0e2]">
                      <td>
                        <span className="px-2 py-0.5 rounded-full border border-[#f2c197] text-xs text-[#4a2e05]">
                          {String(r.type).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 text-[#4a2e05]">{r.area}</td>
                      <td className="py-2 text-[#4a2e05]">
                        {r.type === "sms" && r.payload?.text}
                        {r.type === "url" && r.payload?.url}
                        {r.type === "voip" && r.payload?.phone}
                      </td>
                      <td className="py-2 text-[#4a2e05]">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="py-2">
                        {r._modelPrediction ? (
                          <span className="px-2 py-0.5 rounded-full border border-[#f2c197] text-xs text-[#4a2e05]">
                            {r._modelPrediction}
                          </span>
                        ) : (
                          <span className="text-[#b38b66]">-</span>
                        )}
                      </td>
                      <td className="py-2">
                        {typeof r._modelScore === "number" ? (
                          r._modelScore.toFixed(2)
                        ) : (
                          <span className="text-[#b38b66]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
