import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore("parcel-stats");
  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  // GET — return current count
  if (req.method === "GET") {
    try {
      const val = await store.get("success_count");
      const count = val ? parseInt(val, 10) : 0;
      return new Response(JSON.stringify({ count }), { status: 200, headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ count: 0 }), { status: 200, headers: corsHeaders });
    }
  }

  // POST — increment and return new count
  if (req.method === "POST") {
    try {
      const val = await store.get("success_count");
      const newCount = (val ? parseInt(val, 10) : 0) + 1;
      await store.set("success_count", String(newCount));
      return new Response(JSON.stringify({ count: newCount }), { status: 200, headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = {
  path: "/netlify/functions/counter"
};
