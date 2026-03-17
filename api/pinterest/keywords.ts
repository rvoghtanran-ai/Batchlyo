export default async function handler(req: any, res: any) {
  try {
    const seed = (req.query.q as string || '').trim();
    if (!seed) return res.status(400).json({ error: "Missing query parameter ?q=" });

    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    
    // Generate multiple query variations to maximize keyword coverage
    const queries = [
      `pinterest ${seed}`,           // Direct Pinterest searches
      `${seed} pinterest ideas`,     // Idea-focused
      `${seed} ideas`,                // General ideas (often reflects Pinterest)
      `${seed} aesthetic`,            // Aesthetic angle (big on Pinterest)
      `${seed} inspiration`,          // Inspiration searches
      `${seed} for beginners`,        // Beginner queries
      `${seed} diy`,                  // DIY angle
      `${seed} trending`,             // Trending searches
    ];

    const fetchSuggestions = async (q: string): Promise<string[]> => {
      try {
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=us&q=${encodeURIComponent(q)}`;
        const resp = await fetch(url, { headers: { "User-Agent": UA } });
        if (!resp.ok) return [];
        const data = await resp.json();
        return Array.isArray(data[1]) ? data[1] : [];
      } catch { return []; }
    };

    // Fire all queries in parallel
    const allResults = await Promise.all(queries.map(fetchSuggestions));
    
    // Flatten, deduplicate, and clean
    const seen = new Set<string>();
    const keywords: string[] = [];
    
    for (const batch of allResults) {
      for (const kw of batch) {
        const clean = kw.toLowerCase().trim();
        // Skip exact seed match or very short results
        if (clean === seed.toLowerCase() || clean.length < 4) continue;
        if (!seen.has(clean)) {
          seen.add(clean);
          keywords.push(clean);
        }
      }
    }

    res.json({ keywords, seed, count: keywords.length });
  } catch (error: any) {
    console.error("Keyword Proxy Error:", error);
    res.status(500).json({ error: error.message });
  }
}
