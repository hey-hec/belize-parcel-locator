const BIN_ID = '6a773717da38895dfeca0920';
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

export default async (req) => {
  const apiKey = Netlify.env.get('JSONBIN_API_KEY');
  const headers = {
    'Content-Type': 'application/json',
    'X-Master-Key': apiKey
  };
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  // GET — return current count
  if (req.method === 'GET') {
    try {
      const res = await fetch(BIN_URL + '/latest', { headers });
      const data = await res.json();
      const count = data.record?.count ?? 0;
      return new Response(JSON.stringify({ count }), { status: 200, headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ count: 0 }), { status: 200, headers: corsHeaders });
    }
  }

  // POST — increment and return new count
  if (req.method === 'POST') {
    try {
      // Read current value
      const readRes = await fetch(BIN_URL + '/latest', { headers });
      const readData = await readRes.json();
      const newCount = (readData.record?.count ?? 0) + 1;

      // Write new value
      await fetch(BIN_URL, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ count: newCount })
      });

      return new Response(JSON.stringify({ count: newCount }), { status: 200, headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: '/netlify/functions/counter'
};
