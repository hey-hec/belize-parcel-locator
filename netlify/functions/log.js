const SUPABASE_URL = 'https://zlzkdmdiqvkhzokovykw.supabase.co';

export default async (req) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: corsHeaders });
  }

  const SUPABASE_ANON_KEY = Netlify.env.get('SUPABASE_ANON_KEY');
  if (!SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500, headers: corsHeaders });
  }

  let body;
  try { body = await req.json(); } catch(e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
  }

  const { action } = body;

  // ── INSERT a new parcel lookup record ──
  if (action === 'insert') {
    const { easting, northing, latitude, longitude, maps_url, confidence, user_agent } = body;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/parcel_lookups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ easting, northing, latitude, longitude, maps_url, confidence, user_agent })
    });
    const data = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: data }), { status: res.status, headers: corsHeaders });
    // Return the new record's id so the frontend can patch contact info later
    return new Response(JSON.stringify({ id: data[0]?.id }), { status: 200, headers: corsHeaders });
  }

  // ── UPDATE an existing record with contact info ──
  if (action === 'update_contact') {
    const { id, contact_name, contact_email, contact_whatsapp } = body;
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: corsHeaders });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/parcel_lookups?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ contact_name, contact_email, contact_whatsapp })
    });
    if (!res.ok) {
      const data = await res.json();
      return new Response(JSON.stringify({ error: data }), { status: res.status, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
};

export const config = { path: '/netlify/functions/log' };
