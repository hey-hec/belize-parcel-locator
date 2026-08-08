const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

export default async (req) => {
  // Read env inside the handler, not at module level
  const UPSTASH_URL = Netlify.env.get('UPSTASH_REDIS_URL');
  const UPSTASH_TOKEN = Netlify.env.get('UPSTASH_REDIS_TOKEN');

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return new Response(JSON.stringify({ error: 'Redis not configured' }), { status: 500, headers: corsHeaders });
  }

  async function redis(command) {
    const res = await fetch(`${UPSTASH_URL}/${command.map(encodeURIComponent).join('/')}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    return res.json();
  }

  try {
    if (req.method === 'GET') {
      const data = await redis(['GET', 'parcel_count']);
      const count = parseInt(data.result || '0', 10);
      return new Response(JSON.stringify({ count }), { status: 200, headers: corsHeaders });
    }

    if (req.method === 'POST') {
      const data = await redis(['INCR', 'parcel_count']);
      const count = data.result;
      return new Response(JSON.stringify({ count }), { status: 200, headers: corsHeaders });
    }

    return new Response('Method Not Allowed', { status: 405 });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
};

export const config = {
  path: '/netlify/functions/counter'
};
