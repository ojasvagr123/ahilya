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

/**
 * Model API base (FastAPI on 8000 by default).
 * Keep this separate from API_BASE so you can deploy it independently later.
 */
const MODEL_BASE = import.meta.env.VITE_MODEL_BASE ?? "http://127.0.0.1:8000";

/** Call /predict/batch with lean items */
export async function predictBatch(items: PredictItem[]): Promise<ModelOut[]> {
  const res = await fetch(`${MODEL_BASE}/predict/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items),
  });
  if (!res.ok) throw new Error(`predict-batch failed: ${res.status}`);
  return res.json();
}
