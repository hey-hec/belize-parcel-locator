const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const res = await fetch(`${env.UPSTASH_REDIS_URL}/GET/parcel_count`, {
      headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}` }
    });
    const data = await res.json();
    const count = parseInt(data.result || '0', 10);
    return new Response(JSON.stringify({ count }), { status: 200, headers: corsHeaders });
  } catch(e) {
    return new Response(JSON.stringify({ count: 0 }), { status: 200, headers: corsHeaders });
  }
}

export async function onRequestPost(context) {
  const { env } = context;
  try {
    const res = await fetch(`${env.UPSTASH_REDIS_URL}/INCR/parcel_count`, {
      headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_TOKEN}` }
    });
    const data = await res.json();
    return new Response(JSON.stringify({ count: data.result }), { status: 200, headers: corsHeaders });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
