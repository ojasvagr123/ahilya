import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";
export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function login(phone: string, password: string) {
  const { data } = await api.post("/auth/login", { phone, password });
  localStorage.setItem("token", data.token.access_token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export async function getSummary() {
  const { data } = await api.get("/admin/summary");
  return data as { counts: { sms:number; url:number; voip:number; honeypot:number }, latest:any[] };
}

export async function getHeatmap() {
  const { data } = await api.get("/admin/heatmap");
  return data as { id:number; lat:number; lon:number; type:"sms"|"url"|"voip" }[];
}

export async function getReports(type: "all"|"sms"|"url"|"voip" = "all", limit = 200) {
  const { data } = await api.get(`/admin/reports?type=${type}&limit=${limit}`);
  return data as any[];
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

/** Backend model API types */
export type ModelOut = {
  id?: string | number;
  prediction: string;
  score: number;
  model: "SMS" | "VOIP" | "URL";
  version: string;
};

export type PredictItem = {
  id: string | number;
  type: "SMS" | "VOIP" | "URL";
  text: string;
};

const MODEL_BASE = import.meta.env.VITE_MODEL_BASE ?? "http://127.0.0.1:8000";

export async function predictBatch(items: PredictItem[]): Promise<ModelOut[]> {
  const res = await fetch(`${MODEL_BASE}/predict/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items),
  });
  if (!res.ok) throw new Error(`predict-batch failed: ${res.status}`);
  return res.json();
}

// ---- Admin ML files + run ----
export type AdminFileItem = {
  name: string;
  path: string;        // absolute or upload-relative path (from backend)
  size: number;        // bytes
  ext: string;         // "jpg" | "png" | ...
  type: "image" | "csv" | "other";
  url?: string;        // optional: backend-provided preview URL
};

export type AdminRunResult = {
  path: string;
  model: "deepfake" | "malware";
  label: string;         // "deepfake"|"real" or similar
  confidence: number;    // 0..1
  [k: string]: any;
};

export async function getAdminFiles(): Promise<AdminFileItem[]> {
  const res = await fetch(`${API_BASE}/admin-ml/files`, {
    headers: authHeaderMaybe(),
  });
  if (!res.ok) throw new Error(`files failed: ${res.status}`);
  const data = await res.json();
  return (data?.files ?? []) as AdminFileItem[];
}

/** Build a preview URL that actually works with your backend routes. */
export function filePreviewUrl(f: AdminFileItem): string {
  // If backend already sent url, respect it.
  if (f.url) {
    return f.url.startsWith("http") ? f.url : `${API_BASE}${f.url}`;
  }
  // Fallback: hit /admin-ml/file with the path the backend returned.
  return `${API_BASE}/admin-ml/file?path=${encodeURIComponent(f.path)}`;
}

export async function runAdminModel(params: {
  path: string;
  model?: "auto" | "deepfake" | "malware";
}): Promise<AdminRunResult> {
  const res = await fetch(`${API_BASE}/admin-ml/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaderMaybe() },
    body: JSON.stringify({ path: params.path, model: params.model ?? "auto" })
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as AdminRunResult;
}

function authHeaderMaybe(): Record<string, string> {
  const token = localStorage.getItem("token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
