export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { targetUrl, apiKey, body } = req.body;

    if (!targetUrl) {
      return res.status(400).json({ error: "Missing targetUrl" });
    }

    const isPollinations = targetUrl.includes("pollinations.ai");
    const method = isPollinations ? "GET" : "POST";
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
    };

    if (apiKey && apiKey !== 'none') {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const fetchOptions: any = {
      method,
      headers,
    };

    if (method === "POST" && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(targetUrl, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    // Handle binary response for Pollinations (images)
    if (isPollinations) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', response.headers.get('Content-Type') || 'image/png');
      return res.send(buffer);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: error.message });
  }
}
