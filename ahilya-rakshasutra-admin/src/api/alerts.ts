// src/api/alerts.ts
const API = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

export async function previewEmails(token: string, form: FormData) {
  const res = await fetch(`${API}/alerts/preview_emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ count: number; emails: string[] }>;
}

export async function sendEmailAlert(token: string, form: FormData) {
  const res = await fetch(`${API}/alerts/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean; sent: number; failed: number; recipients: number }>;
}
