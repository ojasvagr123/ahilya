import { useState } from "react";
import { previewEmails, sendEmailAlert } from "../api/alerts";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

export default function AlertPage() {
  const token = localStorage.getItem("token") ?? "";
  const [subject, setSubject] = useState("Ahilya Alert");
  const [category, setCategory] = useState("SCAM-ALERT");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [toText, setToText] = useState(""); // optional manual emails
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ count: number; emails: string[] }>({
    count: 0,
    emails: []
  });

  async function doPreview() {
    const fd = new FormData();
    fd.append("to_text", toText);
    if (file) fd.append("file", file, file.name);
    setBusy(true);
    try {
      const res = await previewEmails(token, fd);
      setPreview(res);
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function doSend() {
    if (!message.trim()) {
      alert("Write the alert message.");
      return;
    }
    if (!file && !toText.trim()) {
      alert("Add recipients via CSV or the Emails box.");
      return;
    }

    const fd = new FormData();
    fd.append("subject", subject);
    fd.append("category", category);
    fd.append("message", message);
    fd.append("to_text", toText);
    if (file) fd.append("file", file, file.name);

    setBusy(true);
    try {
      const res = await sendEmailAlert(token, fd);
      alert(`Email sent: ${res.sent}  Failed: ${res.failed}`);
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    // Same page shell as Dashboard/Share: lock page height, inner content scrolls
    <div className="min-h-screen bg-[#fff4e9] overflow-hidden">
      {/* Header copied to match Login/Dashboard */}
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
    

              <button
                onClick={() => {
                  try {
                    fetch(`${API_BASE}/auth/logout`, {
                      method: "POST",
                      credentials: "include"
                    }).catch(() => {});
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

      {/* Content area: fixed height under header, scroll inside */}
      <div className="h-[calc(100vh-80px)]">
        <div className="h-full overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6">
            <div className="bg-[#fffdfb] border border-[#f2c197] rounded-xl shadow p-5">
              <h1 className="text-xl font-semibold mb-4 text-[#4a2e05]">
                Generate Email Alert
              </h1>

              <label className="block text-sm mb-1 text-[#4a2e05]">Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-[#fffaf6] border border-[#f2c197] rounded-md px-2 py-2 mb-3 text-[#4a2e05]"
                placeholder="Email subject"
              />

              <label className="block text-sm mb-1 text-[#4a2e05]">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[#fffaf6] border border-[#f2c197] rounded-md px-2 py-2 mb-3 text-[#4a2e05]"
              >
                <option value="SCAM-ALERT">SCAM-ALERT</option>
                <option value="PHISHING-URL">PHISHING-URL</option>
                <option value="VOIP-FRAUD">VOIP-FRAUD</option>
                <option value="GENERAL">GENERAL</option>
              </select>

              <label className="block text-sm mb-1 text-[#4a2e05]">
                Alert message (include scam URLs, numbers, etc.)
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={6}
                className="w-full bg-[#fffaf6] border border-[#f2c197] rounded-md px-2 py-2 mb-3 text-[#4a2e05]"
                placeholder="Write the text that will go in the email."
              />

              <label className="block text-sm mb-1 text-[#4a2e05]">
                Upload recipients CSV (column: email) — optional
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="mb-3"
              />

              <label className="block text-sm mb-1 text-[#4a2e05]">
                Or paste emails (comma or newline separated) — optional
              </label>
              <textarea
                value={toText}
                onChange={e => setToText(e.target.value)}
                rows={3}
                className="w-full bg-[#fffaf6] border border-[#f2c197] rounded-md px-2 py-2 mb-3 text-[#4a2e05]"
                placeholder="alice@example.com, bob@example.org"
              />

              <div className="flex gap-2">
                <button
                  onClick={doPreview}
                  disabled={busy}
                  className={`px-3 py-2 rounded-md border border-[#f2c197] bg-[#fff9f3] text-[#4a2e05] ${
                    busy ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {busy ? "Working…" : "Preview recipients"}
                </button>
                <button
                  onClick={doSend}
                  disabled={busy}
                  className={`px-3 py-2 rounded-md bg-[#e07b3a] text-white border border-[#f2c197] ${
                    busy ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {busy ? "Sending…" : "Send Alert"}
                </button>
              </div>

              <div className="mt-4 text-sm text-[#5c3d0c]">
                {preview.count > 0 ? (
                  <>
                    <div>
                      Total recipients:{" "}
                      <span className="text-[#4a2e05] font-medium">
                        {preview.count}
                      </span>
                    </div>
                    <div className="mt-2">Sample:</div>
                    <ul className="mt-1 list-disc list-inside">
                      {(preview.emails || []).slice(0, 10).map(e => (
                        <li key={e}>{e}</li>
                      ))}
                      {preview.emails.length > 10 && (
                        <li>…and {preview.emails.length - 10} more</li>
                      )}
                    </ul>
                  </>
                ) : (
                  <div>
                    Upload a CSV or paste emails, then click Preview to see who will
                    receive the alert.
                  </div>
                )}
              </div>
            </div>

            {/* Spacer so mobile UI chrome doesn’t overlap */}
            <div className="h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
