const API = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000';

export async function exportCsv(opts: {
  token: string;
  type?: string;
  area?: string;
  start?: string; // ISO
  end?: string;   // ISO
  limit?: number;
}) {
  const url = new URL(`${API}/reports/export`);
  if (opts.type)  url.searchParams.set('type', opts.type);
  if (opts.area)  url.searchParams.set('area', opts.area);
  if (opts.start) url.searchParams.set('start', opts.start);
  if (opts.end)   url.searchParams.set('end', opts.end);
  if (opts.limit) url.searchParams.set('limit', String(opts.limit));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${opts.token}` },
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Export failed (${res.status}) ${msg}`);
  }

  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') ?? '';
  const m = /filename="?([^"]+)"?/i.exec(cd);
  const filename = m?.[1] || 'reports.csv';

  const a = document.createElement('a');
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
