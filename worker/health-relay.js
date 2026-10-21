// ApexFit Health relay: a tiny Cloudflare Worker that receives pushes from the
// "Health Auto Export" iOS app and hands the data to ApexFit when it asks.
// Needs: a KV namespace bound as HEALTH, and a secret named TOKEN.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (o, status = 200) => new Response(JSON.stringify(o), {status, headers: {...CORS, 'Content-Type': 'application/json'}});
const KEEP_DAYS = 400;

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS});
    if (!env.TOKEN || req.headers.get('Authorization') !== 'Bearer ' + env.TOKEN) return json({error: 'unauthorized'}, 401);
    const cur = JSON.parse((await env.HEALTH.get('data')) || '{}');
    for (const k of ['weights', 'bodyFat', 'steps', 'activeKcal']) cur[k] = cur[k] || {};
    if (req.method === 'GET') return json(cur);
    if (req.method !== 'POST') return json({error: 'method'}, 405);

    let body; try { body = await req.json(); } catch (e) { return json({error: 'bad json'}, 400); }
    const metrics = (body && body.data && body.data.metrics) || [];
    let n = 0;
    for (const m of metrics) {
      for (const row of m.data || []) {
        const day = String(row.date || '').slice(0, 10), q = Number(row.qty);
        if (!/^\d{4}-\d\d-\d\d$/.test(day) || !(q >= 0)) continue;
        if (m.name === 'weight_body_mass' && q > 0) cur.weights[day] = Math.round((m.units === 'lb' ? q * 0.45359237 : m.units === 'st' ? q * 6.35029 : q) * 10) / 10;
        else if (m.name === 'body_fat_percentage' && q > 0) cur.bodyFat[day] = Math.round((q <= 1 ? q * 100 : q) * 10) / 10;
        else if (m.name === 'step_count') cur.steps[day] = Math.round(q);
        else if (m.name === 'active_energy') cur.activeKcal[day] = Math.round(m.units === 'kJ' ? q / 4.184 : q);
        else continue;
        n++;
      }
    }
    const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
    for (const k of Object.keys(cur)) for (const d of Object.keys(cur[k])) if (d < cutoff) delete cur[k][d];
    cur.updated = new Date().toISOString();
    await env.HEALTH.put('data', JSON.stringify(cur));
    return json({ok: true, received: n});
  },
};
