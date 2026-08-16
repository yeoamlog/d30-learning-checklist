import { getStore } from '@netlify/blobs';

const validId = (id) => /^[a-zA-Z0-9_-]{16,80}$/.test(id || '');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default async (request) => {
  const id = new URL(request.url).searchParams.get('id');
  if (!validId(id)) return json({ error: 'Invalid sync id' }, 400);
  const store = getStore('d30-checklist');
  const key = 'progress:' + id;
  const existing = await store.get(key, { type: 'json' }) || { entries: {} };
  if (request.method === 'GET') return json(existing);
  if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405);
  const incoming = await request.json().catch(() => null);
  if (!incoming || typeof incoming.entries !== 'object') return json({ error: 'Invalid payload' }, 400);
  const entries = { ...(existing.entries || {}) };
  for (const [entryKey, value] of Object.entries(incoming.entries)) {
    if (!/^[0-9]+-(study|record)$/.test(entryKey)) continue;
    const next = { checked: Boolean(value?.checked), updatedAt: Number(value?.updatedAt) || Date.now() };
    if (!entries[entryKey] || next.updatedAt >= Number(entries[entryKey].updatedAt || 0)) entries[entryKey] = next;
  }
  const result = { entries, updatedAt: Date.now() };
  await store.setJSON(key, result);
  return json(result);
};
