const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

export async function onRequestPost(context) {
  const { request, env } = context;

  const SUPABASE_URL      = env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); } catch(e) {
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

    const responseText = await res.text();
    console.log('Supabase insert status:', res.status, responseText);

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
    console.log('Supabase update status:', res.status, responseText);

    if (!res.ok) {
      return new Response(JSON.stringify({ error: responseText }), { status: res.status, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
