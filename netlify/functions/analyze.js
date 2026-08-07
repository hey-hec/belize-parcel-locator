const PROMPT = [
  "This is a photo of a Belize cadastral / land survey plan.",
  "Somewhere on the sheet there are usually two grid reference lines (often drawn in blue), each labeled with a coordinate value ending in the letter N (northing) or E (easting) — for example \"1934 100 N\" and \"364 200 E\". These represent a position on the national survey grid.",
  "Do NOT confuse these with: lot side lengths (e.g. \"30.475\"), bearings/angles (e.g. \"105°\", \"15° 46' 20\"\"), or the lot area in square yards (e.g. \"777.78 S.Y.\"). Those are not grid coordinates.",
  "Find the northing and easting grid labels if they appear anywhere in the image, even if partially cropped, rotated, or handwritten-style.",
  "Respond with ONLY raw JSON and nothing else — no markdown code fences, no commentary before or after. Match this exact shape:",
  "{\"found\": boolean, \"easting\": number_or_null, \"northing\": number_or_null, \"raw_easting_label\": string_or_null, \"raw_northing_label\": string_or_null, \"confidence\": \"high\"|\"medium\"|\"low\", \"notes\": string}",
  "Strip spaces/commas from the numbers before returning them as plain numbers (e.g. \"364 200\" becomes 364200).",
  "Set \"found\" to true only if BOTH a northing and an easting value are clearly legible. If only a partial or ambiguous label is visible, set found to false, put whatever you could read in the raw label fields, and explain what's missing in notes."
].join(' ');

export default async (req) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: body.mediaType, data: body.base64 } },
            { type: 'text', text: PROMPT }
          ]
        }]
      })
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: '/netlify/functions/analyze'
};
