import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Cloudflare Proxy Endpoint
  app.post("/api/proxy/cloudflare", async (req, res) => {
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
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', response.headers.get('Content-Type') || 'image/png');
        return res.send(Buffer.from(buffer));
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Pinterest Keyword Research Proxy — uses Google Autocomplete to get real search suggestions
  app.get("/api/pinterest/keywords", async (req, res) => {
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
  });

  // Pinterest Profile Scraper — extracts real profile stats + recent pins
  app.get("/api/pinterest/profile", async (req, res) => {
    try {
      const username = (req.query.username as string || '').trim().replace(/^@/, '').replace(/\/$/, '');
      if (!username) return res.status(400).json({ error: "Missing ?username=" });

      const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const resp = await fetch(`https://www.pinterest.com/${username}/pins/`, {
        headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.9" }
      });

      if (!resp.ok) return res.status(resp.status).json({ error: `Pinterest returned ${resp.status}` });
      const html = await resp.text();

      // Extract profile data from HTML
      const extract = (pattern: RegExp): string | null => {
        const m = html.match(pattern);
        return m ? m[1] : null;
      };

      const followerCount = Number(extract(/follower_count['":\s]+(\d+)/) || 0);
      const pinCount = Number(extract(/pin_count['":\s]+(\d+)/) || 0);
      const boardCount = Number(extract(/board_count['":\s]+(\d+)/) || 0);
      const fullName = extract(/"full_name":"([^"]+)"/) || username;
      const about = extract(/"about":"([^"]*?)"/) || '';
      const domainUrl = extract(/"domain_url":"([^"]+)"/) || '';
      const profileImg = extract(/"image_xlarge_url":"([^"]+)"/) || extract(/"image_large_url":"([^"]+)"/) || '';
      const isVerified = html.includes('"is_verified_merchant":true');

      // Extract pins from embedded JSON with full data
      const pins: any[] = [];
      const pinMatches = [...html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)];
      
      for (const match of pinMatches) {
        try {
          const data = JSON.parse(match[1]);
          const findPins = (obj: any, depth = 0): void => {
            if (depth > 8 || !obj || typeof obj !== 'object' || pins.length >= 50) return;
            if (obj.grid_title && obj.id && obj.images) {
              const imgUrl = obj.images?.['236x']?.url || obj.images?.['474x']?.url || obj.images?.orig?.url || '';
              pins.push({
                id: String(obj.id),
                title: obj.grid_title || '',
                description: (obj.description || '').substring(0, 300),
                link: obj.link || '',
                domain: obj.domain || '',
                image: imgUrl,
                createdAt: obj.created_at || '',
                boardName: obj.board?.name || '',
                seoTitle: obj.seo_title || '',
                dominantColor: obj.dominant_color || '',
                ratingCount: obj.rich_summary?.aggregate_rating?.rating_count || 0,
                reviewCount: obj.rich_summary?.aggregate_rating?.review_count || 0,
                hasVideo: !!obj.video_status,
              });
              return;
            }
            if (Array.isArray(obj)) {
              for (let i = 0; i < Math.min(obj.length, 60); i++) findPins(obj[i], depth + 1);
            } else {
              for (const key of Object.keys(obj)) findPins(obj[key], depth + 1);
            }
          };
          findPins(data);
        } catch { /* skip */ }
      }

      // Compute posting frequency
      const timestamps = pins.map(p => p.createdAt ? new Date(p.createdAt).getTime() : 0).filter(t => t > 0).sort((a, b) => b - a);
      let avgDaysBetweenPins = 0;
      if (timestamps.length >= 2) {
        const spanDays = (timestamps[0] - timestamps[timestamps.length - 1]) / (1000 * 60 * 60 * 24);
        avgDaysBetweenPins = Math.round(spanDays / (timestamps.length - 1));
      }

      // Board distribution
      const boardDist: Record<string, number> = {};
      for (const pin of pins) {
        if (pin.boardName) boardDist[pin.boardName] = (boardDist[pin.boardName] || 0) + 1;
      }

      // Top keywords from titles
      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'it', 'this', 'that', 'from', 'as', 'are', 'was', 'be', 'has', 'had', 'have', 'its', 'your', 'you', 'we', 'our', 'my', 'me', 'do']);
      const wordFreq: Record<string, number> = {};
      for (const pin of pins) {
        const words = (pin.title + ' ' + pin.description).toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w));
        for (const w of words) wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
      const topKeywords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([word, count]) => ({ word, count }));

      res.json({
        username, fullName, about, followerCount, pinCount, boardCount,
        domainUrl, profileImg, isVerified, pins,
        analytics: {
          avgDaysBetweenPins,
          boardDistribution: boardDist,
          topKeywords,
          totalPinsScanned: pins.length,
          oldestPinDate: timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : null,
          newestPinDate: timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : null,
        },
        scannedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Profile Scrape Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const isProduction = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "prod";
  const distExists = fs.existsSync(path.join(__dirname, "dist", "index.html"));

  // Vite middleware for development
  if (!isProduction && !distExists) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      
      // Explicit fallback for Vite middleware mode
      app.use(/.*/, async (req, res, next) => {
          const url = req.originalUrl;
          if (url.startsWith('/api/')) return next();
          try {
              let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
              template = await vite.transformIndexHtml(url, template);
              res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          } catch (e) {
              vite.ssrFixStacktrace(e as Error);
              next(e);
          }
      });
    } catch (e) {
      console.warn("Failed to load vite, falling back to static serving", e);
      app.use(express.static(path.join(__dirname, "dist")));
      app.get(/.*/, (req, res) => {
        res.sendFile(path.join(__dirname, "dist", "index.html"));
      });
    }
  } else {
    // Production: Serve static files
    app.use(express.static(path.join(__dirname, "dist")));
    
    // SPA Fallback
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
