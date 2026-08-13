export default async (req) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: corsHeaders });
  }

  const SUPABASE_URL      = Netlify.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Netlify.env.get('SUPABASE_ANON_KEY');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase env vars missing');
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500, headers: corsHeaders });
  }

  let body;
  try { body = await req.json(); } catch(e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
  }

  const { action } = body;
  console.log('log.js action:', action);

  // ── INSERT a new parcel lookup record ──
  if (action === 'insert') {
    const { easting, northing, latitude, longitude, maps_url, confidence, user_agent } = body;

    console.log('Inserting row:', { easting, northing, latitude, longitude, maps_url, confidence });
  console.log('SUPABASE_URL present:', !!SUPABASE_URL, '| URL tail:', SUPABASE_URL ? SUPABASE_URL.slice(-10) : 'MISSING');
  console.log('ANON_KEY present:', !!SUPABASE_ANON_KEY, '| Key tail:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(-8) : 'MISSING');

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

    const responseText = await res.text();
    console.log('Supabase response status:', res.status);
    console.log('Supabase response body:', responseText);

    if (!res.ok) {
      return new Response(JSON.stringify({ error: responseText }), { status: res.status, headers: corsHeaders });
    }

    let data;
    try { data = JSON.parse(responseText); } catch(e) { data = []; }
    return new Response(JSON.stringify({ id: data[0]?.id }), { status: 200, headers: corsHeaders });
  }

  // ── UPDATE an existing record with contact info ──
  if (action === 'update_contact') {
    const { id, contact_name, contact_email, contact_whatsapp } = body;
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: corsHeaders });

    console.log('Updating contact for id:', id);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/parcel_lookups?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ contact_name, contact_email, contact_whatsapp })
    });

    const responseText = await res.text();
    console.log('Supabase update status:', res.status);
    console.log('Supabase update body:', responseText);

    if (!res.ok) {
      return new Response(JSON.stringify({ error: responseText }), { status: res.status, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
};

export const config = { path: '/netlify/functions/log' };
