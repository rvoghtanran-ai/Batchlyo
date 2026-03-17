
import { Pin, CsvExportSettings, ExportFormat, ImageHostSettings, ImageHostProvider } from '../types';

export const generateSmartUTM = (baseUrl: string) => {
    if (!baseUrl || baseUrl.trim() === '') return '';
    const cleanUrl = baseUrl.split('?utm_')[0].split('&utm_')[0].split('?ref=')[0].split('&ref=')[0];
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const shortId = Math.random().toString(36).substring(2, 6);
    return `${cleanUrl}${separator}utm_id=${shortId}`;
};

// Multi-proxy configuration to ensure high availability for HTML SCRAPING
const PROXIES = [
  { 
    name: 'AllOrigins',
    // AllOrigins returns JSON with a 'contents' string
    getUrl: (target: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(target)}&disableCache=true`,
    isJson: true 
  },
  { 
    name: 'CorsProxy',
    // CorsProxy returns raw HTML
    getUrl: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
    isJson: false 
  }
];

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Ensure strictly data:image to avoid potential non-image text responses being treated as images
      if (result.startsWith("data:image")) {
        resolve(result);
      } else {
        reject(new Error("Response was not a valid image"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * OPTIMIZE IMAGE FOR AI ANALYSIS AND STORAGE
 * Resizes large images to max 1000px dimension.
 * This prevents LocalStorage quotas from being hit and speeds up AI processing.
 */
export const resizeImageForAI = (base64Str: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            // SMART FILTER: Reject icons and tiny junk (usually < 50px)
            if (img.width < 50 && img.height < 50) {
                reject(new Error("Image too small (likely an icon or thumbnail)"));
                return;
            }

            // Pinterest optimal width is 1000px. No need for 4k.
            const MAX_SIZE = 1200;

            let width = img.width;
            let height = img.height;

            // If image is already optimized, return original
            if (width <= MAX_SIZE && height <= 2000) {
                resolve(base64Str);
                return;
            }

            if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                // JPEG 0.85 is high quality but significantly smaller file size
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            } else {
                resolve(base64Str); // Fallback
            }
        };
        img.onerror = () => resolve(base64Str); // Fallback
    });
};

/**
 * STEALTH MODE ENGINE
 * Modifies image data to bypass duplicate detection and strip AI metadata.
 * Uses pure Canvas API (No AI).
 */
export const applyStealthFilters = (base64Str: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      // 1. Micro-Crop logic (Trim 1.5% from edges to shift pixel grid significantly)
      const cropX = Math.floor(img.width * 0.015);
      const cropY = Math.floor(img.height * 0.015);
      const newWidth = img.width - (cropX * 2);
      const newHeight = img.height - (cropY * 2);

      canvas.width = newWidth;
      canvas.height = newHeight;

      // 2. Subtle Rotation (randomly between -0.7 and 0.7 degrees)
      const angle = (Math.random() - 0.5) * 1.4; 
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Draw the image slightly scaled up to cover rotation gaps
      ctx.drawImage(img, -cropX - 2, -cropY - 2, img.width + 4, img.height + 4);

      // 3. Invisible Noise Injection (The "Grain")
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
         if (Math.random() > 0.6) {
             const noise = (Math.random() - 0.5) * 6; 
             data[i] = Math.min(255, Math.max(0, data[i] + noise));     // R
             data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise)); // G
             data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise)); // B
         }
      }
      ctx.putImageData(imageData, 0, 0);

      // 4. Export (Metadata Stripping)
      // Converting to a new blob strips original EXIF/IPTC data containing "AI Generated" tags
      resolve(canvas.toDataURL('image/jpeg', 0.94));
    };

    img.onerror = (e) => {
      console.warn("Stealth Mode failed to load image", e);
      resolve(base64Str); // Fallback to original
    };
  });
};

/**
 * CLIENT-SIDE COMPRESSION ENGINE
 * Massively reduces memory footprint by converting high-res blob uploads into optimized WebP strings
 * Suitable for React State and IndexedDB saving without freezing UI.
 */
export const compressImage = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      // 800px is plenty for grid previews and Pinterest ingestion, saves ~90% memory
      const MAX_SIZE = 800;
      let width = img.width;
      let height = img.height;

      if (width > MAX_SIZE) {
        height *= MAX_SIZE / width;
        width = MAX_SIZE;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // WebP is incredibly memory efficient compared to standard JPEG Base64
        resolve(canvas.toDataURL('image/webp', 0.8));
      } else {
        // Fallback to reading raw blob to base64 if canvas fails
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
  });
};

const SEO_POWER_WORDS = [
    "Ultimate", "Best", "Easy", "Top", "Viral", "Must-Try", 
    "Unique", "Lovely", "Quick", "Smart", "Creative", 
    "Trendy", "Popular", "Amazing", "Perfect", "Simple",
    "Stunning", "Incredible", "Genius", "Fast", "Luxury", "Chic", "Cozy", "Elegant", "DIY"
];

const HOOKS = [
    "You need to see this", "Don't miss this", "Trending now",
    "Everyone loves this", "Try this today", "Save for later",
    "Inspiration for you", "Check this out", "Watch this", 
    "Read more", "Click here", "Learn more", "See why", "Game changer", "Highly rated"
];

/**
 * LOCAL REMIX ENGINE (No AI)
 * Smart string manipulation to make text unique without API calls.
 */
export const remixTextLocal = (pin: Pin): Partial<Pin> => {
    const updates: Partial<Pin> = {};
    const year = new Date().getFullYear();

    // 1. Remix Tags (Shuffle)
    if (pin.tags && pin.tags.length > 0) {
        // Fisher-Yates Shuffle
        const shuffled = [...pin.tags];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        updates.tags = shuffled;
    }

    // 2. SEO Title Remixing - ROBUST CLEANING & RE-APPLYING
    if (pin.title && pin.title.trim().length > 0) {
        let cleanTitle = pin.title.trim();
        
        // A. AGGRESSIVE CLEANING
        // Strip common suffixes we add: | Year, | #ID, #ID, (Year), (Text)
        cleanTitle = cleanTitle
            .replace(/\|\s*\d{4}$/, '')      // | 2024
            .replace(/\|\s*#\d+$/, '')       // | #123
            .replace(/#\d+$/, '')            // #123
            .replace(/\s\(\d{4}\)$/, '')     // (2024)
            .replace(new RegExp(`\\s${year}$`), '') // 2024 at end
            .replace(/\s\([^)]+\)$/, '')     // (Any text)
            .replace(/\s[\u2700-\u27BF\uE000-\uF8FF\uD83C-\uDBFF\uDC00-\uDFFF]+$/, ''); // Emojis at end

        // Remove Power Word Prefixes (Case Insensitive)
        // Sort by length desc so "Must-Try" is matched before "Must"
        const sortedPowerWords = [...SEO_POWER_WORDS].sort((a,b) => b.length - a.length);
        for (const word of sortedPowerWords) {
            // Regex to match "Word " at start
            const regex = new RegExp(`^${word}\\s+`, 'i');
            if (regex.test(cleanTitle)) {
                cleanTitle = cleanTitle.replace(regex, '');
                // Break after finding one to avoid over-stripping actual title words
                break; 
            }
        }
        
        // Remove hooks from start of title if they leaked in
        for (const hook of HOOKS) {
             const regex = new RegExp(`^${hook}[!:.]?\\s+`, 'i');
             cleanTitle = cleanTitle.replace(regex, '');
        }

        cleanTitle = cleanTitle.trim();
        if (!cleanTitle) cleanTitle = pin.title; // Safety net: if we stripped everything, revert

        // B. APPLY NEW STRATEGY
        const strategy = Math.floor(Math.random() * 5);
        const powerWord = SEO_POWER_WORDS[Math.floor(Math.random() * SEO_POWER_WORDS.length)];
        const microId = Math.floor(Math.random() * 999);

        switch (strategy) {
            case 0: // Prefix: "Best Title"
                updates.title = `${powerWord} ${cleanTitle}`;
                break;
            case 1: // Suffix Year: "Title 2025"
                updates.title = `${cleanTitle} ${year}`;
                break;
            case 2: // Parenthesis Adjective: "Title (Amazing)"
                updates.title = `${cleanTitle} (${powerWord})`;
                break;
            case 3: // ID: "Title #123"
                updates.title = `${cleanTitle} #${microId}`;
                break;
            case 4: // Divider Year: "Title | 2025"
                updates.title = `${cleanTitle} | ${year}`;
                break;
        }
    }

    // 3. Description Remixing - ROBUST SPLITTING & HOOKING
    if (pin.description && pin.description.trim().length > 0) {
        let desc = pin.description.trim();
        
        // A. Clean previous hooks
        for (const hook of HOOKS) {
            // Check Start
            if (desc.toLowerCase().startsWith(hook.toLowerCase())) {
                desc = desc.substring(hook.length).trim();
                desc = desc.replace(/^[!.,;:-]+/, '').trim(); // Remove punctuation
            }
            // Check End
            if (desc.toLowerCase().endsWith(hook.toLowerCase())) {
                 desc = desc.substring(0, desc.length - hook.length).trim();
                 desc = desc.replace(/[!.,;:-]+$/, '').trim(); // Remove punctuation
            }
        }
        
        if (!desc) desc = pin.description; // Safety net

        const hook = HOOKS[Math.floor(Math.random() * HOOKS.length)];
        
        // B. Apply Hook
        if (Math.random() > 0.5) {
            // Prepend
            updates.description = `${hook}! ${desc}`;
        } else {
            // Append
            // Ensure desc ends in punctuation before appending
            const endPunct = /[.!?]$/.test(desc) ? '' : '.';
            updates.description = `${desc}${endPunct} ${hook}!`;
        }
        
        // Truncate if too long (Pinterest limit 500)
        if (updates.description.length > 490) {
            updates.description = updates.description.substring(0, 487) + "...";
        }
    }

    return updates;
};

/**
 * Converts an image URL (or Blob URL) to a Base64 string for AI consumption.
 * Handles CORS issues by trying direct fetch first, then a rotation of proxies.
 * INCLUDES AUTOMATIC RESIZING/OPTIMIZATION.
 */
export const urlToBase64 = async (url: string): Promise<string> => {
  // Optimization: If it's already a Data URL, check if we need to resize
  if (url.startsWith('data:')) {
      return await resizeImageForAI(url);
  }

  // Handle Blob URLs directly (local)
  if (url.startsWith('blob:')) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        return await resizeImageForAI(base64);
    } catch (e) {
        throw new Error("Failed to read local blob image.");
    }
  }

  // STRATEGY 1: Direct CORS Fetch
  try {
      const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (response.ok) {
          const blob = await response.blob();
          if (blob.size > 0 && blob.type.startsWith('image/')) {
              const base64 = await blobToBase64(blob);
              return await resizeImageForAI(base64);
          }
      }
  } catch (e) {
      // Direct fetch failed
  }

  // STRATEGY 2: Proxy Rotation
  const imageProxies = [
    (u: string) => `https://wsrv.nl/?url=${encodeURIComponent(u)}&output=png`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`
  ];

  let lastError;

  for (const getProxyUrl of imageProxies) {
    try {
      const fetchUrl = getProxyUrl(url);
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error(`Status ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      if (blob.size === 0) throw new Error("Empty response received");

      const base64 = await blobToBase64(blob);
      return await resizeImageForAI(base64);

    } catch (error) {
      console.warn(`[Utils] Image proxy attempt failed for ${url}:`, error);
      lastError = error;
    }
  }

  throw new Error(`Failed to fetch image after multiple attempts. Last error: ${lastError}`);
};

/**
 * Uploads to ImgBB
 */
export const uploadToImgBB = async (base64Data: string, apiKey: string): Promise<string> => {
  const cleanKey = apiKey ? apiKey.trim() : "";
  if (!cleanKey) throw new Error("ImgBB API Key is missing.");

  try {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const formData = new FormData();
    formData.append("key", cleanKey);
    formData.append("image", cleanBase64);

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ImgBB Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (data.success) {
      return data.data.url;
    } else {
      throw new Error(data.error?.message || "ImgBB Upload Failed");
    }
  } catch (error: any) {
    console.error("ImgBB Upload Exception:", error);
    throw error;
  }
};

/**
 * Uploads to FreeImage.host (Chevereto API)
 */
export const uploadToFreeImageHost = async (base64Data: string, apiKey: string): Promise<string> => {
    const cleanKey = apiKey ? apiKey.trim() : "";
    if (!cleanKey) throw new Error("FreeImage API Key is missing.");

    try {
        const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const formData = new FormData();
        formData.append("key", cleanKey);
        formData.append("source", cleanBase64);
        formData.append("format", "json");

        const response = await fetch("https://freeimage.host/api/1/upload", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`FreeImage Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        if (data.status_code === 200) {
            return data.image.url;
        } else {
            throw new Error(data.error?.message || "FreeImage Upload Failed");
        }
    } catch (error: any) {
        console.error("FreeImage Upload Exception:", error);
        throw error;
    }
};

/**
 * Uploads to Cloudinary (Unsigned)
 */
export const uploadToCloudinary = async (base64Data: string, cloudName: string, uploadPreset: string): Promise<string> => {
    const cleanName = cloudName ? cloudName.trim() : "";
    const cleanPreset = uploadPreset ? uploadPreset.trim() : "";
    if (!cleanName || !cleanPreset) throw new Error("Cloudinary Cloud Name or Upload Preset is missing.");

    try {
        const formData = new FormData();
        formData.append("file", base64Data);
        formData.append("upload_preset", cleanPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cleanName}/image/upload`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Cloudinary Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        if (data.secure_url) {
            return data.secure_url;
        } else {
            throw new Error("Cloudinary did not return a secure_url");
        }
    } catch (error: any) {
        console.error("Cloudinary Upload Exception:", error);
        throw error;
    }
};

/**
 * Unified Upload Handler
 */
export const uploadImage = async (imageSource: string, settings: ImageHostSettings): Promise<string> => {
    // 1. Ensure we have Base64 (handle blob: URLs if they appear)
    let base64 = imageSource;
    if (imageSource.startsWith('blob:')) {
        try {
            base64 = await urlToBase64(imageSource);
        } catch (e) {
            throw new Error("Failed to convert blob to base64 for upload.");
        }
    }

    // 2. If it's already a http link, return it (no upload needed)
    if (base64.startsWith('http')) return base64;
    
    // 3. Must be data: at this point
    if (!base64.startsWith('data:')) throw new Error("Invalid image format for upload.");

    // 4. Route to Provider
    switch (settings.provider) {
        case ImageHostProvider.CLOUDINARY:
            return await uploadToCloudinary(base64, settings.cloudName || '', settings.uploadPreset || '');
        
        case ImageHostProvider.FREEIMAGE:
            return await uploadToFreeImageHost(base64, settings.apiKey || '');
        
        case ImageHostProvider.IMGBB:
        default:
            return await uploadToImgBB(base64, settings.apiKey || '');
    }
};

export const scrapeImagesFromUrl = async (url: string): Promise<string[]> => {
  let targetUrl = url.trim();
  if (!targetUrl.match(/^https?:\/\//i)) {
    targetUrl = 'https://' + targetUrl;
  }

  let htmlContent = '';
  let fetchedSuccessfully = false;

  for (const proxy of PROXIES) {
    try {
      const response = await fetch(proxy.getUrl(targetUrl));
      if (!response.ok) throw new Error(`Status ${response.status}`);

      if (proxy.isJson) {
        const data = await response.json();
        if (data.contents) {
          htmlContent = data.contents;
          fetchedSuccessfully = true;
        }
      } else {
        htmlContent = await response.text();
        if (htmlContent) fetchedSuccessfully = true;
      }

      if (fetchedSuccessfully) break;
    } catch (error) {
      console.warn(`[Scraper] Failed with ${proxy.name}:`, error);
    }
  }

  if (!fetchedSuccessfully || !htmlContent) {
    throw new Error("Unable to access website. The site may be blocking scanners or proxies.");
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    const imageUrls: Set<string> = new Set();
    const isPinterest = targetUrl.includes('pinterest.com');
    const isFacebook = targetUrl.includes('facebook.com') || targetUrl.includes('fb.com');

    // 1. Social Platform Specific Logic
    if (isPinterest) {
        // Pinterest specific meta for main image
        const pinImg = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (pinImg) imageUrls.add(pinImg.replace('/originals/', '/736x/').replace('/564x/', '/736x/'));
    }

    // 2. Standard Meta Selectors
    const metaSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[itemprop="image"]',
      'link[rel="image_src"]'
    ];
    
    metaSelectors.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => {
        const content = el.getAttribute('content') || el.getAttribute('href');
        if (content) imageUrls.add(content);
      });
    });

    // 3. Image Elements with lazy loading support
    const imgElements = doc.querySelectorAll('img');
    imgElements.forEach((img) => {
      // Prioritize high-res Pinterest/FB patterns if detected
      let src = img.getAttribute('data-src') || 
                img.getAttribute('data-lazy-src') ||
                img.getAttribute('data-original') ||
                img.getAttribute('srcset')?.split(' ')[0] ||
                img.getAttribute('src');

      if (src) {
          // Pinterest HD Upgrade: Replace thumbnail paths with larger versions
          if (isPinterest && src.includes('/236x/')) src = src.replace('/236x/', '/736x/');
          imageUrls.add(src);
      }
    });

    const bgElements = doc.querySelectorAll('[style*="background-image"]');
    bgElements.forEach(el => {
        const style = el.getAttribute('style');
        const match = style?.match(/url\(['"]?(.*?)['"]?\)/);
        if (match && match[1]) imageUrls.add(match[1]);
    });

    const candidates: string[] = [];
    imageUrls.forEach(rawUrl => {
      try {
        const absoluteUrl = new URL(rawUrl, targetUrl).href;
        
        // Minimum Icon Blacklist to make scraper a monster
        const blacklist = [
            '.svg', 'icon', 'favicon'
        ];
        
        const isBlacklisted = blacklist.some(term => absoluteUrl.toLowerCase().includes(term));
        
        if (!isBlacklisted) {
           candidates.push(absoluteUrl);
        }
      } catch (e) {}
    });

    // Take more candidates as we expect the dimension filter to drop many
    const topCandidates = candidates.slice(0, 300); // Monster scraper: grab up to 300
    const base64Promises = topCandidates.map(async (url) => {
        try {
            return await urlToBase64(url);
        } catch (e) {
            return null;
        }
    });

    const results = await Promise.all(base64Promises);
    return results.filter((img): img is string => img !== null);

  } catch (error) {
    return [];
  }
};

const escapeCsv = (val: string | undefined): string => {
    if (!val) return '';
    const cleanVal = val.toString().replace(/"/g, '""');
    return `"${cleanVal}"`;
};

const escapeBoardId = (val: string | undefined): string => {
    if (!val) return '';
    const cleanVal = val.toString().replace(/"/g, '""');
    if (/^\d+$/.test(cleanVal) && cleanVal.length > 15) {
        return `"\t${cleanVal}"`;
    }
    return `"${cleanVal}"`;
};

const formatDate = (dateStr: string | undefined, format: 'default' | 'publer' = 'default'): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (format === 'publer') {
        return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const getHeader = (val: string | undefined, fallback: string) => (val && val.trim() !== '') ? val : fallback;

// --- EXPORT TO CSV ---
export const exportToCSV = (pins: Pin[], format: ExportFormat = 'default', customSettings?: CsvExportSettings, boardIdMap?: Record<string, string>) => {
  let headers: string[] = [];
  let rows: string[] = [];

  if (format === 'publer') {
    headers = ["Date", "Text", "Link", "Media", "Title", "Label", "Alt text", "Comment", "Board", "Subtype", "CTA", "Reminder"].map(h => `"${h}"`);
    rows = pins.map(pin => {
      return [
        escapeCsv(formatDate(pin.scheduledTime, 'publer')),
        escapeCsv(pin.description),
        escapeCsv(pin.destinationLink),
        escapeCsv(pin.imageUrl),
        escapeCsv(pin.title),
        "","", "",
        escapeCsv(pin.board),
        "", "", ""
      ].join(',');
    });
  } 
  else if (format === 'custom' && customSettings) {
    headers = [
      getHeader(customSettings.imageHeader, 'Image'),
      getHeader(customSettings.titleHeader, 'Title'),
      getHeader(customSettings.descriptionHeader, 'Description'),
      getHeader(customSettings.tagsHeader, 'Tags'),
      getHeader(customSettings.linkHeader, 'Link'),
      getHeader(customSettings.boardHeader, 'Board'),
      getHeader(customSettings.boardIdHeader, 'Board ID'),
      getHeader(customSettings.dateHeader, 'Date'),
      getHeader(customSettings.statusHeader, 'Status')
    ];

    rows = pins.map(pin => {
      const tagsString = (pin.tags || []).join(', ');
      const boardId = boardIdMap && pin.board ? (boardIdMap[pin.board] || '') : '';
      return [
        escapeCsv(pin.imageUrl),
        escapeCsv(pin.title),
        escapeCsv(pin.description),
        escapeCsv(tagsString),
        escapeCsv(pin.destinationLink),
        escapeCsv(pin.board), 
        escapeBoardId(boardId), 
        escapeCsv(formatDate(pin.scheduledTime)),
        escapeCsv('Pending')
      ].join(',');
    });
  } 
  else {
    headers = ['Image URL', 'Title', 'Description', 'Tags', 'Destination Link', 'Board', 'Board ID', 'Scheduled Time', 'Status'];
    rows = pins.map(pin => {
      const tagsString = (pin.tags || []).join(', ');
      const boardId = boardIdMap && pin.board ? (boardIdMap[pin.board] || '') : '';
      return [
        escapeCsv(pin.imageUrl),
        escapeCsv(pin.title),
        escapeCsv(pin.description),
        escapeCsv(tagsString),
        escapeCsv(pin.destinationLink),
        escapeCsv(pin.board),
        escapeBoardId(boardId),
        escapeCsv(formatDate(pin.scheduledTime)),
        escapeCsv('Pending')
      ].join(',');
    });
  }

  // BOM \uFEFF ensures Excel treats the CSV as UTF-8
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `easy-pin-export-${format}-${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- EXPORT TO JSON (NEW) ---
export const exportToJSON = (pins: Pin[], customSettings?: CsvExportSettings, boardIdMap?: Record<string, string>) => {
    // Determine keys based on settings or defaults
    const titleKey = getHeader(customSettings?.titleHeader, 'Title');
    const descKey = getHeader(customSettings?.descriptionHeader, 'Description');
    const linkKey = getHeader(customSettings?.linkHeader, 'Link');
    const imageKey = getHeader(customSettings?.imageHeader, 'Image');
    const boardKey = getHeader(customSettings?.boardHeader, 'Board');
    const boardIdKey = getHeader(customSettings?.boardIdHeader, 'Board ID');
    const tagsKey = getHeader(customSettings?.tagsHeader, 'Tags');
    const dateKey = getHeader(customSettings?.dateHeader, 'Date');
    const statusKey = getHeader(customSettings?.statusHeader, 'Status');

    const data = pins.map(pin => {
        const boardId = boardIdMap && pin.board ? (boardIdMap[pin.board] || '') : '';
        return {
            [titleKey]: pin.title,
            [descKey]: pin.description,
            [linkKey]: pin.destinationLink,
            [imageKey]: pin.imageUrl,
            [boardKey]: pin.board,
            [boardIdKey]: boardId,
            [tagsKey]: pin.tags,
            [dateKey]: formatDate(pin.scheduledTime),
            [statusKey]: 'Pending'
        };
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `easy-pin-export-${new Date().toISOString().slice(0,10)}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const sendBatchToWebhook = async (webhookUrl: string, pins: Pin[], csvSettings?: CsvExportSettings, boardIdMap?: Record<string, string>, sendIndividually: boolean = false): Promise<boolean> => {
    try {
        const titleHeader = getHeader(csvSettings?.titleHeader, 'Title');
        const descriptionHeader = getHeader(csvSettings?.descriptionHeader, 'Description');
        const linkHeader = getHeader(csvSettings?.linkHeader, 'Source Url');
        const imageHeader = getHeader(csvSettings?.imageHeader, 'Image Url');
        const boardHeader = getHeader(csvSettings?.boardHeader, 'Board');
        const boardIdHeader = getHeader(csvSettings?.boardIdHeader, 'Board ID');
        const tagsHeader = getHeader(csvSettings?.tagsHeader, 'Keywords');
        const dateHeader = getHeader(csvSettings?.dateHeader, 'Schedule Date');
        
        const statusHeaderRaw = csvSettings?.statusHeader;
        const statusHeader = (statusHeaderRaw && statusHeaderRaw.trim() !== '') ? statusHeaderRaw : 'Status';

        const payloadObjects = pins.map(pin => {
            const boardId = boardIdMap && pin.board ? (boardIdMap[pin.board] || '') : '';
            return {
                [titleHeader]: pin.title,
                [descriptionHeader]: pin.description,
                [linkHeader]: pin.destinationLink,
                [imageHeader]: pin.imageUrl, // This MUST be a http link now
                [boardHeader]: pin.board,
                [boardIdHeader]: boardId,
                [tagsHeader]: (pin.tags || []).join(', '),
                [dateHeader]: formatDate(pin.scheduledTime),
                [statusHeader]: 'Pending'
            };
        });

        const sendRequest = async (bodyData: any) => {
             const body = JSON.stringify(bodyData);
             
             // 1. Try Standard JSON
             try {
                const res = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                });
                if (res.ok) return true;
             } catch (e) {
                console.warn("Webhook JSON fetch failed. Trying text/plain...", e);
             }

             // 2. Try text/plain (Simple Request)
             try {
                 const res2 = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: body
                 });
                 if (res2.ok) return true;
             } catch (e) {
                 console.warn("Webhook text/plain fetch failed. Trying no-cors...", e);
             }

             // 3. Try no-cors (Opaque)
             // This is often needed for Google Apps Script or strict CORS servers
             // We can't verify success, but it usually works if endpoint exists
             try {
                 await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: body,
                    mode: 'no-cors'
                 });
                 console.log("Sent via no-cors mode (opaque response). Assuming success.");
                 return true;
             } catch(e) {
                 throw new Error("All webhook connection attempts failed. Check CORS or URL.");
             }
        };

        if (sendIndividually) {
             for (const item of payloadObjects) {
                 await sendRequest(item);
                 // Small delay to prevent rate limiting
                 await new Promise(r => setTimeout(r, 200)); 
             }
             return true;
        } else {
             return await sendRequest(payloadObjects);
        }
        
    } catch (e) {
        console.error("Webhook Send Error:", e);
        throw e;
    }
};

export const exportToGoogleSheet = async (webhookUrl: string, pins: Pin[], csvSettings?: CsvExportSettings, boardIdMap?: Record<string, string>): Promise<boolean> => {
    // 1. Prepare Data using the JSON structure logic
    const titleKey = getHeader(csvSettings?.titleHeader, 'Title');
    const descKey = getHeader(csvSettings?.descriptionHeader, 'Description');
    const linkKey = getHeader(csvSettings?.linkHeader, 'Link');
    const imageKey = getHeader(csvSettings?.imageHeader, 'Image');
    const boardKey = getHeader(csvSettings?.boardHeader, 'Board');
    const boardIdKey = getHeader(csvSettings?.boardIdHeader, 'Board ID');
    const tagsKey = getHeader(csvSettings?.tagsHeader, 'Tags');
    const dateKey = getHeader(csvSettings?.dateHeader, 'Date');
    const statusKey = getHeader(csvSettings?.statusHeader, 'Status');

    const data = pins.map(pin => {
        const boardId = boardIdMap && pin.board ? (boardIdMap[pin.board] || '') : '';
        return {
            [titleKey]: pin.title,
            [descKey]: pin.description,
            [linkKey]: pin.destinationLink,
            [imageKey]: pin.imageUrl,
            [boardKey]: pin.board,
            [boardIdKey]: boardId,
            [tagsKey]: (pin.tags || []).join(', '), // Flatten tags for sheets
            [dateKey]: formatDate(pin.scheduledTime),
            [statusKey]: 'Pending'
        };
    });

    // 2. Send to Google Apps Script (BATCHED "SMART" SENDING)
    // GAS limit is often execution time or payload size. 
    // Sending in chunks of 20 ensures we don't hit payload limits.
    
    const CHUNK_SIZE = 20;
    
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        
        try {
            const params = new URLSearchParams();
            params.append('payload', JSON.stringify(chunk));

            await fetch(webhookUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            
            // Artificial delay to prevent hitting concurrent execution limits in GAS
            if (i + CHUNK_SIZE < data.length) {
                await new Promise(r => setTimeout(r, 800));
            }
        } catch (e) {
            console.error("Google Sheet Export Error in Chunk " + i, e);
            throw new Error(`Failed to send chunk ${i/CHUNK_SIZE + 1}. Ensure script is deployed as 'Anyone'.`);
        }
    }
    
    return true;
};

export interface ParsedContent {
  title: string;
  description: string;
  tags: string[];
}

export const parseContentPool = (text: string): ParsedContent[] => {
  const rawBlocks = text.split(/(?:\r?\n)+(?=\d+)|(?:\r?\n){2,}/).filter(b => b.trim());

  return rawBlocks.map(block => {
    const titleMatch = block.match(/Title:\s*([\s\S]*?)(?=(?:Description:|Tags:|$))/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const descMatch = block.match(/Description:\s*([\s\S]*?)(?=(?:Tags:|$))/i);
    const description = descMatch ? descMatch[1].trim() : '';

    const tagsMatch = block.match(/Tags:\s*([\s\S]*)/i);
    let tags: string[] = [];
    if (tagsMatch) {
      const rawTags = tagsMatch[1].trim();
      tags = rawTags.split(/[,\s]+/).filter(t => t.startsWith('#') || t.length > 0);
    }

    if (!title && !description) {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length > 0) {
        return {
          title: lines[0],
          description: lines.slice(1).join(' '),
          tags: []
        };
      }
    }

    return { title, description, tags };
  }).filter(item => item.title || item.description);
};
