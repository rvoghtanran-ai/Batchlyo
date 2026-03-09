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
