const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

// ── Send email notification via Resend ──
async function sendEmail(resendKey, subject, html, toAddress = 'contact@bluestardigital.bz') {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendKey}`
    },
    body: JSON.stringify({
      from: 'Belize Land Locator <notifications@app.bluestardigital.bz>',
      to: [toAddress],
      subject,
      html
    })
  });
  const data = await res.json();
  console.log('Resend status:', res.status, 'to:', toAddress, JSON.stringify(data));
  return res.ok;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const SUPABASE_URL  = env.SUPABASE_URL;
  const SUPABASE_KEY  = env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY    = env.RESEND_API_KEY;

  console.log('RESEND_KEY present:', !!RESEND_KEY, '| tail:', RESEND_KEY ? RESEND_KEY.slice(-6) : 'MISSING');
  console.log('SUPABASE_URL present:', !!SUPABASE_URL);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); } catch(e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
  }

  const { action } = body;

  // ── INSERT a new parcel lookup record + notify ──
  if (action === 'insert') {
    const { easting, northing, latitude, longitude, maps_url, confidence, user_agent } = body;

    // 1. Write to Supabase
    const res = await fetch(`${SUPABASE_URL}/rest/v1/parcel_lookups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
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
    const recordId = data[0]?.id;

    // 2. Send notification email (non-blocking — don't fail the response if email fails)
    if (RESEND_KEY) {
      const mapsLink = maps_url || `https://www.google.com/maps?q=${latitude},${longitude}&t=k&z=17`;
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#16a34a;margin-bottom:4px">📍 New Parcel Located</h2>
          <p style="color:#6b7280;font-size:13px;margin-bottom:24px">Belize Land Locator · ${new Date().toUTCString()}</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:8px 12px;background:#f0fdf4;font-size:13px;color:#374151;width:40%"><strong>Easting</strong></td>
                <td style="padding:8px 12px;background:#f9fafb;font-family:monospace;font-size:13px">${Number(easting).toLocaleString()} m E</td></tr>
            <tr><td style="padding:8px 12px;background:#f0fdf4;font-size:13px;color:#374151"><strong>Northing</strong></td>
                <td style="padding:8px 12px;background:#f9fafb;font-family:monospace;font-size:13px">${Number(northing).toLocaleString()} m N</td></tr>
            <tr><td style="padding:8px 12px;background:#f0fdf4;font-size:13px;color:#374151"><strong>Latitude</strong></td>
                <td style="padding:8px 12px;background:#f9fafb;font-family:monospace;font-size:13px">${Number(latitude).toFixed(6)}</td></tr>
            <tr><td style="padding:8px 12px;background:#f0fdf4;font-size:13px;color:#374151"><strong>Longitude</strong></td>
                <td style="padding:8px 12px;background:#f9fafb;font-family:monospace;font-size:13px">${Number(longitude).toFixed(6)}</td></tr>
            <tr><td style="padding:8px 12px;background:#f0fdf4;font-size:13px;color:#374151"><strong>Confidence</strong></td>
                <td style="padding:8px 12px;background:#f9fafb;font-size:13px;text-transform:capitalize">${confidence || '—'}</td></tr>
          </table>

          <a href="${mapsLink}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:24px">
            Open in Google Maps →
          </a>

          <p style="color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;padding-top:12px">
            Belize Land Locator · Built by Blue Star Digital BZ · contact@bluestardigital.bz
          </p>
        </div>`;

      try {
        await sendEmail(RESEND_KEY, `📍 New parcel located — ${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`, html);
      } catch(e) { console.error('Email error:', e.message); }
    }

    return new Response(JSON.stringify({ id: recordId }), { status: 200, headers: corsHeaders });
  }

  // ── UPDATE an existing record with contact info + notify admin + email user ──
  if (action === 'update_contact') {
    const { id, contact_name, contact_email, contact_whatsapp } = body;
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: corsHeaders });

    // 1. Fetch the existing record so we have coordinates for the user email
    const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/parcel_lookups?id=eq.${id}&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const records = await fetchRes.json();
    const record = records[0] || {};

    // 2. Patch Supabase record with contact info
    const res = await fetch(`${SUPABASE_URL}/rest/v1/parcel_lookups?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ contact_name, contact_email, contact_whatsapp })
    });

    const responseText = await res.text();
    console.log('Supabase update status:', res.status, responseText);

    if (!res.ok) {
      return new Response(JSON.stringify({ error: responseText }), { status: res.status, headers: corsHeaders });
    }

    const mapsLink = record.maps_url || `https://www.google.com/maps?q=${record.latitude},${record.longitude}&t=k&z=17`;
    const firstName = (contact_name || 'there').split(' ')[0];

    // 3. Send admin notification email
    if (RESEND_KEY && (contact_name || contact_email)) {
      const adminHtml = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#2563eb;margin-bottom:4px">👤 User Submitted Contact Info</h2>
          <p style="color:#6b7280;font-size:13px;margin-bottom:24px">Belize Land Locator · ${new Date().toUTCString()}</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:8px 12px;background:#eff6ff;font-size:13px;color:#374151;width:40%"><strong>Name</strong></td>
                <td style="padding:8px 12px;background:#f9fafb;font-size:13px">${contact_name || '—'}</td></tr>
            <tr><td style="padding:8px 12px;background:#eff6ff;font-size:13px;color:#374151"><strong>Email</strong></td>
                <td style="padding:8px 12px;background:#f9fafb;font-size:13px">${contact_email ? `<a href="mailto:${contact_email}">${contact_email}</a>` : '—'}</td></tr>
            <tr><td style="padding:8px 12px;background:#eff6ff;font-size:13px;color:#374151"><strong>WhatsApp</strong></td>
                <td style="padding:8px 12px;background:#f9fafb;font-size:13px">${contact_whatsapp || '—'}</td></tr>
            <tr><td style="padding:8px 12px;background:#eff6ff;font-size:13px;color:#374151"><strong>Easting</strong></td>
                <td style="padding:8px 12px;background:#f9fafb;font-family:monospace;font-size:13px">${record.easting ? Number(record.easting).toLocaleString() + ' m E' : '—'}</td></tr>
            <tr><td style="padding:8px 12px;background:#eff6ff;font-size:13px;color:#374151"><strong>Northing</strong></td>
                <td style="padding:8px 12px;background:#f9fafb;font-family:monospace;font-size:13px">${record.northing ? Number(record.northing).toLocaleString() + ' m N' : '—'}</td></tr>
            <tr><td style="padding:8px 12px;background:#eff6ff;font-size:13px;color:#374151"><strong>Record ID</strong></td>
                <td style="padding:8px 12px;background:#f9fafb;font-family:monospace;font-size:11px">${id}</td></tr>
          </table>
          <a href="${mapsLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:24px">Open in Google Maps →</a>
          <p style="color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;padding-top:12px">
            Belize Land Locator · Built by Blue Star Digital BZ · contact@bluestardigital.bz
          </p>
        </div>`;
      try {
        await sendEmail(RESEND_KEY, `👤 New contact — ${contact_name || contact_email || 'unknown'}`, adminHtml);
      } catch(e) { console.error('Admin email error:', e.message); }
    }

    // 4. Send results email to the user
    if (RESEND_KEY && contact_email) {
      const userHtml = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <div style="background:#f0fdf4;border-radius:10px;padding:20px 24px;margin-bottom:24px;border:1px solid #dcfce7">
            <h2 style="color:#16a34a;margin:0 0 4px 0;font-size:22px">📍 Your Parcel Location</h2>
            <p style="color:#6b7280;font-size:13px;margin:0">Belize Land Locator</p>
          </div>

          <p style="color:#374151;font-size:15px;margin-bottom:20px">Hi ${firstName},</p>
          <p style="color:#374151;font-size:14px;line-height:1.6;margin-bottom:24px">
            Here are the results from your recent parcel location search. Save this email for your records.
          </p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr><td style="padding:10px 14px;background:#f0fdf4;font-size:13px;color:#374151;width:40%;border-bottom:1px solid #e5e7eb"><strong>Easting</strong></td>
                <td style="padding:10px 14px;background:#f9fafb;font-family:monospace;font-size:14px;border-bottom:1px solid #e5e7eb">${record.easting ? Number(record.easting).toLocaleString() + ' m E' : '—'}</td></tr>
            <tr><td style="padding:10px 14px;background:#f0fdf4;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb"><strong>Northing</strong></td>
                <td style="padding:10px 14px;background:#f9fafb;font-family:monospace;font-size:14px;border-bottom:1px solid #e5e7eb">${record.northing ? Number(record.northing).toLocaleString() + ' m N' : '—'}</td></tr>
            <tr><td style="padding:10px 14px;background:#f0fdf4;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb"><strong>Latitude</strong></td>
                <td style="padding:10px 14px;background:#f9fafb;font-family:monospace;font-size:14px;border-bottom:1px solid #e5e7eb">${record.latitude ? Number(record.latitude).toFixed(6) : '—'}</td></tr>
            <tr><td style="padding:10px 14px;background:#f0fdf4;font-size:13px;color:#374151"><strong>Longitude</strong></td>
                <td style="padding:10px 14px;background:#f9fafb;font-family:monospace;font-size:14px">${record.longitude ? Number(record.longitude).toFixed(6) : '—'}</td></tr>
          </table>

          <a href="${mapsLink}" style="display:block;background:#16a34a;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:24px;text-align:center">
            📍 Open in Google Maps (Satellite View)
          </a>

          <div style="background:#fffbe6;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-bottom:24px">
            <p style="color:#92400e;font-size:12px;margin:0;line-height:1.5">
              <strong>Disclaimer:</strong> This is an unofficial tool. These coordinates are estimates only.
              Always verify against official parcel records before making any legal or financial decision.
            </p>
          </div>

          <p style="color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;padding-top:12px;line-height:1.6">
            Belize Land Locator &nbsp;·&nbsp; Built by <a href="mailto:contact@bluestardigital.bz" style="color:#16a34a">Blue Star Digital BZ</a><br>
            This email was sent because you requested your parcel location results.
          </p>
        </div>`;

      try {
        await sendEmail(RESEND_KEY, `📍 Your parcel location results — Belize Land Locator`, userHtml, contact_email);
      } catch(e) { console.error('User email error:', e.message); }
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
