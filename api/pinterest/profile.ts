export default async function handler(req: any, res: any) {
  try {
    const username = (req.query.username as string || '').trim().replace(/^@/, '').replace(/\/$/, '');
    if (!username) return res.status(400).json({ error: "Missing ?username=" });

    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const resp = await fetch(`https://www.pinterest.com/${username}/pins/`, {
      headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.9" }
    });

    if (!resp.ok) return res.status(resp.status).json({ error: `Pinterest returned ${resp.status}` });
    const html = await resp.text();

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

    const timestamps = pins.map(p => p.createdAt ? new Date(p.createdAt).getTime() : 0).filter(t => t > 0).sort((a, b) => b - a);
    let avgDaysBetweenPins = 0;
    if (timestamps.length >= 2) {
      const spanDays = (timestamps[0] - timestamps[timestamps.length - 1]) / (1000 * 60 * 60 * 24);
      avgDaysBetweenPins = Math.round(spanDays / (timestamps.length - 1));
    }

    const boardDist: Record<string, number> = {};
    for (const pin of pins) {
      if (pin.boardName) boardDist[pin.boardName] = (boardDist[pin.boardName] || 0) + 1;
    }

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
}
