import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAdminFiles,
  runAdminModel,
  filePreviewUrl,
  type AdminFileItem,
  type AdminRunResult
} from "../api";

function isImageExt(ext: string) {
  return ["jpg", "jpeg", "png", "webp", "bmp", "gif"].includes(ext.toLowerCase());
}

function formatKB(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getUploadedAt(f: AdminFileItem): string {
  const ts =
    (f as any).uploadedAt ||
    (f as any).createdAt ||
    (f as any).mtime ||
    (f as any).ctime ||
    (f as any).lastModified ||
    null;
  if (!ts) return "-";
  try {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function ModelLabPage() {
  const navigate = useNavigate();

  const [files, setFiles] = useState<AdminFileItem[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [latest, setLatest] = useState<Record<string, AdminRunResult>>({});
  const [search, setSearch] = useState("");

  async function load() {
    const list = await getAdminFiles();
    setFiles(list);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const images = useMemo(
    () =>
      files
        .filter((f) => (f.type === "image" || isImageExt(f.ext || "")))
        .filter((f) => {
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return f.name.toLowerCase().includes(q);
        }),
    [files, search]
  );

  async function runDeepfake(path: string) {
    setBusy((b) => ({ ...b, [path]: true }));
    try {
      const res = await runAdminModel({ path, model: "deepfake" });

      // Normalize label using your rule: <70% => deepfake, else real
      const pct = Math.max(0, Math.min(100, ((res.confidence ?? 0) as number) * 100));
      const label = pct < 70 ? "deepfake" : "real";

      setLatest((m) => ({ ...m, [path]: { ...res, label } }));
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setBusy((b) => ({ ...b, [path]: false }));
    }
  }

  function ResultBlock({ r }: { r?: AdminRunResult }) {
    if (!r) return <div className="text-xs text-[#b38b66]">No result yet.</div>;
    const pctNum = Math.max(0, Math.min(100, (r.confidence ?? 0) * 100));
    const pct = pctNum.toFixed(1);
    const derivedLabel = pctNum < 70 ? "DEEPFAKE" : "REAL";
    const isReal = derivedLabel === "REAL";
    const color = isReal ? "#198754" : "#dc2626";
    return (
      <div className="mt-2 text-sm">
        <div
          className="inline-flex items-center gap-2 px-2 py-1 rounded-full border"
          style={{ borderColor: "#f2c197", color }}
        >
          <span className="font-semibold" style={{ color }}>
            {derivedLabel}
          </span>
          <span className="opacity-80">({pct}%)</span>
        </div>
        <div className="text-xs text-[#5c3d0c] mt-1 opacity-80">model: {r.model}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff4e9] overflow-hidden">
      {/* Header */}
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

            {/* Right: Back + IMC */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 rounded-xl font-semibold bg-[#fff9f3] border border-[#f2c197] shadow text-[#4a2e05] hover:bg-white transition"
                title="Back to Dashboard"
              >
                Back to Dashboard
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

      {/* Main: single full-width scrollable panel */}
      <div className="h-[calc(100vh-80px)] p-0">
        <div className="h-full p-4 overflow-y-auto bg-[#fffdfb] border-l-4 border-[#e07b3a]">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold mr-auto text-[#4a2e05]">Images in uploads/</h2>

            <input
              placeholder="Search by filename"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#fffaf6] border border-[#f2c197] rounded-md px-3 py-1.5 text-sm text-[#4a2e05] w-56"
              title="Filter by filename"
            />

            <button
              onClick={load}
              className="px-3 py-1.5 rounded-md border border-[#f2c197] bg-[#fff9f3] text-[#4a2e05]"
              title="Refresh list"
            >
              Refresh
            </button>
          </div>

          {/* Grid of image cards */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {images.map((f) => {
              const running = !!busy[f.path];
              const r = latest[f.path];

              return (
                <div key={f.path} className="bg-[#fffaf6] border border-[#f2c197] rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="aspect-[4/3] bg-white border-b border-[#fff0e2] flex items-center justify-center">
                    <img
                      src={filePreviewUrl(f)}
                      alt={f.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="p-3 text-[#4a2e05] flex-1 flex flex-col">
                    <div className="font-semibold break-all">{f.name}</div>
                    <div className="text-xs opacity-80 mt-1">Size: {formatKB(f.size || 0)}</div>
                    <div className="text-xs opacity-80">Uploaded: {getUploadedAt(f)}</div>

                    <div className="mt-3">
                      <button
                        onClick={() => runDeepfake(f.path)}
                        disabled={running}
                        className={`w-full px-3 py-2 rounded-md border border-[#f2c197] ${
                          running
                            ? "opacity-60 cursor-not-allowed bg-[#fff3ea] text-[#b38b66]"
                            : "bg-[#e07b3a] text-white"
                        }`}
                      >
                        {running ? "Running…" : "Run Deepfake"}
                      </button>
                    </div>

                    <div className="mt-2">
                      <ResultBlock r={r} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {images.length === 0 && (
            <div className="text-[#b38b66] text-sm mt-4">
              No images found. Place image files in the backend’s <code>uploads/</code> folder.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
