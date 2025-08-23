// src/api/share.ts
const API = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
export type Department = "CYBER_CRIME" | "TEAMMATE";

export async function shareToDept(args: {
  token: string;
  department: Department;
  reportIds?: Array<number | string>;   // if omitted, backend can use filters you pass
  note?: string;
  filter?: { type?: "sms" | "url" | "voip"; area?: string; start?: string; end?: string; limit?: number };
}) {
  const body: any = {
    department: args.department,
    report_ids: args.reportIds ?? [],
    note: args.note ?? ""
  };
  if ((!args.reportIds || args.reportIds.length === 0) && args.filter) {
    Object.assign(body, args.filter);
  }

  const res = await fetch(`${API}/reports/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Share failed (${res.status}) ${msg}`);
  }
  return res.json() as Promise<{ ok: boolean; sent_to: string; count: number; filename: string }>;
}
