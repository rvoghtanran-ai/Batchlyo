
import { AIServiceProvider, Pin, AspectRatio } from '../types';
import { urlToBase64, resizeImageForAI } from './utils';
import { GoogleGenAI } from "@google/genai";

interface AIStats {
  requests: number;
  errors: number;
  lastLatency: number;
}

export class AIService {
  private currentProvider: AIServiceProvider = AIServiceProvider.GEMINI;
  private apiKeys: Record<string, string> = {};
  private selectedModelId: string = ''; 
  private cloudflareAccountId: string = ''; 
  private customModelId: string = ''; // NEW: Store custom user model
  
  // Stats Tracker
  private stats: AIStats = {
    requests: 0,
    errors: 0,
    lastLatency: 0
  };

  // Content History to prevent repetition
  private history: { titles: string[], descriptions: string[] } = { titles: [], descriptions: [] };

  constructor() {
    // Load Provider
    const savedProvider = localStorage.getItem('easyPin_provider');
    if (savedProvider) {
      this.currentProvider = savedProvider as AIServiceProvider;
    }

    // Load Keys
    const savedKeys = localStorage.getItem('easyPin_apiKeys');
    if (savedKeys) {
      try {
        this.apiKeys = JSON.parse(savedKeys);
      } catch (e) {
        this.apiKeys = {};
      }
    }

    // Load Cloudflare Account ID
    const savedCfId = localStorage.getItem('easyPin_cloudflareAccountId');
    if (savedCfId) {
        this.cloudflareAccountId = savedCfId;
    }

    // Load Custom Model ID
    const savedModel = localStorage.getItem('easyPin_customModelId');
    if (savedModel) {
        this.customModelId = savedModel;
    }
  }

  public setProvider(provider: AIServiceProvider) {
    this.currentProvider = provider;
    this.selectedModelId = ''; 
    localStorage.setItem('easyPin_provider', provider);
  }

  public getProvider(): AIServiceProvider {
    return this.currentProvider;
  }

  public setApiKeys(keys: Record<string, string>) {
    this.apiKeys = keys;
    this.selectedModelId = ''; 
    localStorage.setItem('easyPin_apiKeys', JSON.stringify(keys));
  }

  public setCloudflareAccountId(id: string) {
      this.cloudflareAccountId = id;
      localStorage.setItem('easyPin_cloudflareAccountId', id);
  }

  public getCloudflareAccountId(): string {
      return this.cloudflareAccountId;
  }

  // NEW: Setter for Custom Model
  public setCustomModelId(modelId: string) {
      this.customModelId = modelId.trim();
      localStorage.setItem('easyPin_customModelId', this.customModelId);
  }

  public getCustomModelId(): string {
      return this.customModelId;
  }

  public getApiKey(provider?: AIServiceProvider): string {
    const target = provider || this.currentProvider;
    
    // Pollinations needs no key
    if (target === AIServiceProvider.POLLINATIONS) return 'free';

    // 1. Prefer User Key (from Settings/LocalStorage)
    if (this.apiKeys[target] && this.apiKeys[target].trim().length > 0) {
        return this.apiKeys[target];
    }

    // 2. Fallback to System Key (Gemini Only)
    if (target === AIServiceProvider.GEMINI) {
      return process.env.API_KEY || '';
    }
    
    return '';
  }

  public getStats(): AIStats {
    return this.stats;
  }

  public clearHistory() {
    this.history = { titles: [], descriptions: [] };
  }

  // --- SMART FAILOVER HELPER ---
  public getOtherAvailableProviders(): AIServiceProvider[] {
      const allProviders = Object.values(AIServiceProvider);
      const alternatives: AIServiceProvider[] = [];
      
      for (const p of allProviders) {
          if (p === this.currentProvider) continue;
          if (p === AIServiceProvider.POLLINATIONS) continue; 
          if (p === AIServiceProvider.CLOUDFLARE && !this.cloudflareAccountId) continue;

          const key = this.apiKeys[p];
          if (key && key.length > 5) {
              alternatives.push(p);
          }
          // Gemini Env fallback
          if (p === AIServiceProvider.GEMINI && process.env.API_KEY) {
              alternatives.push(p);
          }
      }
      return [...new Set(alternatives)];
  }

  // --- IMAGE GENERATION ---
  public async generateImages(prompt: string, count: number, aspectRatio: AspectRatio, provider?: AIServiceProvider): Promise<string[]> {
      const startTime = Date.now();
      const activeProvider = provider || this.currentProvider;
      let lastError: any = null;

      try {
          if (activeProvider === AIServiceProvider.POLLINATIONS) {
              return await this.generateImagesPollinations(prompt, count, aspectRatio, startTime);
          }

          if (activeProvider === AIServiceProvider.CLOUDFLARE) {
              return await this.generateImagesCloudflare(prompt, count, aspectRatio, startTime);
          }

          if (activeProvider === AIServiceProvider.OPENROUTER) {
              return await this.generateImagesOpenRouter(prompt, count, aspectRatio, startTime);
          }

          const apiKey = this.getApiKey(AIServiceProvider.GEMINI);
          if (!apiKey) throw new Error("Gemini API Key is required for Image Generation.");

          const ai = new GoogleGenAI({ apiKey });
          const model = 'gemini-2.5-flash-image';

          const generatedImages: string[] = [];
          for (let i = 0; i < count; i++) {
              try {
                  const response = await ai.models.generateContent({
                      model: model,
                      contents: { parts: [{ text: prompt }] },
                      config: { imageConfig: { aspectRatio: aspectRatio } }
                  });

                  let foundImage = false;
                  if (response.candidates?.[0]?.content?.parts) {
                      for (const part of response.candidates[0].content.parts) {
                          if (part.inlineData && part.inlineData.data) {
                              generatedImages.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
                              foundImage = true;
                              break;
                          }
                      }
                  }
                  if (!foundImage) {
                      console.warn("[AI] Gemini: No image data in response", response);
                  }
                  
                  // Add delay between generations to avoid rate limits
                  if (i < count - 1) await new Promise(r => setTimeout(r, 2000));
              } catch (e) {
                  console.error("[AI] Gemini Generation Error:", e);
                  lastError = e;
                  // Stop on error to prevent quota issues
                  break;
              }
          }
          
          if (generatedImages.length === 0) {
              throw lastError || new Error("Gemini failed to generate any images. Check console for details.");
          }

          this.stats.requests += 1;
          this.stats.lastLatency = Date.now() - startTime;
          return generatedImages;

      } catch (e) {
          this.stats.errors += 1;
          throw e;
      }
  }

  private async generateImagesPollinations(prompt: string, count: number, aspectRatio: AspectRatio, startTime: number): Promise<string[]> {
      let width = 1024;
      let height = 1024;
      if (aspectRatio === '9:16') { width = 768; height = 1344; }
      if (aspectRatio === '16:9') { width = 1344; height = 768; }
      if (aspectRatio === '3:4')  { width = 768; height = 1024; }
      if (aspectRatio === '4:3')  { width = 1024; height = 768; }

      const images: string[] = [];
      for (let i = 0; i < count; i++) {
          const seed = Math.floor(Math.random() * 1000000);
          const finalPrompt = `${prompt} (quality: high, detailed) ${seed}`;
          const encodedPrompt = encodeURIComponent(finalPrompt);
          const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&enhance=true`;
          
          try {
              // Try direct fetch first (Pollinations usually supports CORS)
              const res = await fetch(url);
              
              if (res.ok) {
                  const blob = await res.blob();
                  const imgData = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                  });
                  images.push(imgData);
              } else {
                  throw new Error(`Pollinations Fetch failed: ${res.status}`);
              }
          } catch (e) {
              console.error("[AI] Pollinations Direct Error, trying proxy:", e);
              try {
                  // Fallback to corsproxy.io
                  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                  const res = await fetch(proxyUrl);
                  if (res.ok) {
                      const blob = await res.blob();
                      const imgData = await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onloadend = () => resolve(reader.result as string);
                          reader.onerror = reject;
                          reader.readAsDataURL(blob);
                      });
                      images.push(imgData);
                  } else {
                      throw new Error(`Pollinations Proxy Fetch failed: ${res.status}`);
                  }
              } catch (proxyErr) {
                  console.error("[AI] Pollinations Proxy Error:", proxyErr);
                  break; // Stop on error
              }
          }
          
          if (i < count - 1) await new Promise(r => setTimeout(r, 1000));
      }

      if (images.length === 0) throw new Error("Pollinations failed to generate images. Please try again or switch provider.");
      
      this.stats.requests += 1;
      this.stats.lastLatency = Date.now() - startTime;
      return images;
  }

  private async generateImagesCloudflare(prompt: string, count: number, aspectRatio: AspectRatio, startTime: number): Promise<string[]> {
      const apiKey = this.getApiKey(AIServiceProvider.CLOUDFLARE);
      const accountId = this.cloudflareAccountId;
      
      if (!apiKey || !accountId) {
          throw new Error("Cloudflare Credentials Missing. Please set Account ID and API Token in Settings.");
      }

      // Model: Flux-1 Schnell (Fast & Good Quality)
      const model = '@cf/black-forest-labs/flux-1-schnell';
      const targetUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
      const enhancedPrompt = `${prompt} (Aspect Ratio: ${aspectRatio})`;

      console.log(`[AI] Generating Cloudflare Image. Account: ${accountId}, Model: ${model}`);

      const images: string[] = [];
      for (let i = 0; i < count; i++) {
         // Always use local proxy to avoid CORS issues from browser
         try {
             // Use the local proxy endpoint defined in server.ts
             const proxyResponse = await fetch('/api/proxy/cloudflare', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     targetUrl: targetUrl,
                     apiKey: apiKey,
                     body: { prompt: enhancedPrompt }
                 })
             });

             if (!proxyResponse.ok) {
                 const errorText = await proxyResponse.text();
                 console.warn(`[AI] Cloudflare Proxy Error (${proxyResponse.status}): ${errorText}`);
                 throw new Error(`Cloudflare Generation Failed: ${errorText}`);
             }

             const data = await proxyResponse.json();
             if (data.result && data.result.image) {
                 images.push(`data:image/png;base64,${data.result.image}`);
             } else {
                 throw new Error("No image data in Cloudflare response");
             }

         } catch (e: any) {
             console.error("[AI] Cloudflare Generation Error:", e);
             // If it's a permission/auth error, throw it so the user sees the specific message
             if (e.message.includes("Cloudflare Generation Failed")) {
                  throw new Error("Image Generation Failed: Cloudflare Generation Failed. 1. Check Account ID. 2. Use an API TOKEN (not Global Key) with 'Workers AI Read' permissions. 3. Check browser console for CORS errors.");
             }
             throw e;
         }
         
         if (i < count - 1) await new Promise(r => setTimeout(r, 2000));
      }
      
      if (images.length === 0) {
          throw new Error("Image Generation Failed: Cloudflare Generation Failed. 1. Check Account ID. 2. Use an API TOKEN (not Global Key) with 'Workers AI Read' permissions. 3. Check browser console for CORS errors.");
      }

      this.stats.requests += 1;
      this.stats.lastLatency = Date.now() - startTime;
      return images;
  }

  private async generateImagesOpenRouter(prompt: string, count: number, aspectRatio: AspectRatio, startTime: number): Promise<string[]> {
      const apiKey = this.getApiKey(AIServiceProvider.OPENROUTER);
      if (!apiKey) throw new Error("OpenRouter API Key is required.");

      // Use user selected model or default to a known working image model on OpenRouter
      // Note: Not all OpenRouter models support image generation.
      const model = this.customModelId || 'stabilityai/stable-diffusion-xl-base-1.0'; 
      const images: string[] = [];
      const endpoint = 'https://openrouter.ai/api/v1/images/generations';

      console.log(`[AI] Generating OpenRouter Image. Model: ${model}`);

      for (let i = 0; i < count; i++) {
          try {
              const response = await fetch(endpoint, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${apiKey}`,
                      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://batchlyo.com',
                      'X-Title': 'Batchlyo'
                  },
                  body: JSON.stringify({
                      model: model,
                      prompt: prompt,
                      n: 1,
                      size: "1024x1024" 
                  })
              });

              if (!response.ok) {
                  const errorText = await response.text();
                  console.warn(`[AI] OpenRouter Image Error ${response.status}: ${errorText}`);
                  throw new Error(`OpenRouter Error: ${errorText}`);
              }

              const data = await response.json();
              if (data.data && data.data[0]) {
                  if (data.data[0].url) {
                      images.push(data.data[0].url);
                  } else if (data.data[0].b64_json) {
                      images.push(`data:image/png;base64,${data.data[0].b64_json}`);
                  }
              } else {
                  throw new Error("Invalid response from OpenRouter Image API");
              }

          } catch (e: any) {
              console.error("[AI] OpenRouter Image Gen Error:", e);
              // Fallback logic is handled in generateImages wrapper if needed, but here we throw to let the user know specific error if they selected OpenRouter
              throw e;
          }
          
          if (i < count - 1) await new Promise(r => setTimeout(r, 1000));
      }
      
      this.stats.requests += 1;
      this.stats.lastLatency = Date.now() - startTime;
      return images;
  }

  // --- MAIN CONTENT GENERATION ---
  public async generateContent(pin: Pin, availableBoards: string[] = []): Promise<{ updatedPin: Pin, searchTerm: string }> {
    const startTime = Date.now();
    
    // 1. Prepare Base Data
    const fullBase64Url = await urlToBase64(pin.imageUrl);
    const resizedBase64Url = await resizeImageForAI(fullBase64Url);
    const base64Data = resizedBase64Url.split(',')[1];
    const mimeType = resizedBase64Url.substring(resizedBase64Url.indexOf(':') + 1, resizedBase64Url.indexOf(';'));

    // 2. Prepare System Instructions
    let boardInstruction = "";
    if (availableBoards.length > 0) {
      boardInstruction = `
      BOARD MATCHING (Mandatory):
      Pick the BEST match from: ${JSON.stringify(availableBoards)}.
      If no match, pick the closest semantic category.
      `;
    }

    const recentTitles = this.history.titles.slice(-30);
    const avoidanceInstruction = recentTitles.length > 0 
        ? `AVOID titles: ${JSON.stringify(recentTitles)}.` 
        : "";

    const systemInstruction = `
    ROLE: You are an elite, top-tier Social Media SEO Strategist and Copywriter.
    TASK: Analyze the provided image and generate highly engaging, algorithm-optimized metadata that drives massive outbound clicks and saves.
    
    DATA REQUIREMENTS:
    1. search_term: EXACTLY 1 WORD. Must be the most SPECIFIC core subject/noun in the image (e.g., if it's a panda amigurumi, use "panda" NOT "amigurumi". If it's a pizza recipe, use "pizza" NOT "recipe"). Never use adjectives or generic categories.
    2. title: 8-15 words. Must be a scroll-stopping hook. Use power words, emotional triggers, and exact-match keywords. Do NOT use generic titles. Make it sound like a viral article headline. (e.g., "10 Insanely Easy Vegan Meal Prep Ideas for Busy Professionals").
    3. description: Max 250 chars. Start with a strong hook, include secondary keywords naturally. CRITICAL: You MUST end with a strong Call-To-Action (CTA) like "Save this for later!", "Pin this before it's gone!", or "Click to read the full guide!". Must end with 3 highly relevant hashtags.
    4. tags: Array of the 3 hashtags used (without the # symbol).
    5. board: Best matching category.
    
    ${boardInstruction}
    ${avoidanceInstruction}

    CRITICAL INSTRUCTIONS TO PREVENT REPETITION:
    - DO NOT repeat the exact same phrases, titles, or descriptions across different requests.
    - Be highly creative and unique. Vary your sentence structures, vocabulary, and CTAs.
    - Do NOT start every title or description the same way.
    - The content MUST sound human, engaging, and highly clickable. Avoid robotic or generic phrasing.

    OUTPUT FORMAT: Strictly valid JSON matching the exact keys: search_term, title, description, tags, board.
    `;

    // 3. EXECUTION WITH FALLBACKS (The "Force" Logic)
    let result = null;
    let lastError = null;

    // ATTEMPT 1: Primary Model (High Quality)
    try {
        let apiKey = this.getApiKey(this.currentProvider);
        
        // Fallback for Cloudflare -> Gemini
        if (this.currentProvider === AIServiceProvider.CLOUDFLARE && !apiKey && this.getApiKey(AIServiceProvider.GEMINI)) {
             apiKey = "fallback_to_gemini";
        }

        if (!apiKey && this.currentProvider !== AIServiceProvider.POLLINATIONS) { 
            throw new Error(`Missing API Key for ${this.currentProvider}`);
        }

        result = await this.executeProviderCall(this.currentProvider, apiKey, base64Data, mimeType, resizedBase64Url, systemInstruction);
        
    } catch (e: any) {
        console.warn(`[AI] Attempt 1 Failed (${this.currentProvider}):`, e);
        
        // If it's an Auth error, we MUST fail (User needs to fix key)
        if (e.message && (e.message.includes("401") || e.message.includes("Key"))) {
             throw e;
        }

        lastError = e;

        // ATTEMPT 2: Simple/Safe Prompt (Retry)
        try {
            // Small delay to let rate limits settle
            await new Promise(r => setTimeout(r, 1200)); 
            
            const simpleInstruction = `
            Analyze image. Return JSON:
            {
              "title": "Creative Aesthetic Pin Idea",
              "description": "Inspiring visual for your board. Check this out! #inspo #aesthetic #ideas",
              "tags": ["#pizza", "#recipe", "#food"],
              "search_term": "pizza",
              "board": "${availableBoards[0] || 'Food'}"
            }
            Replace values with actual image details if possible. Keep it valid JSON.
            `;
            
            // Try Gemini as standard fallback if available, otherwise stick to current
            const retryProvider = this.getApiKey(AIServiceProvider.GEMINI) ? AIServiceProvider.GEMINI : this.currentProvider;
            const retryKey = this.getApiKey(retryProvider) || "fallback";

            result = await this.executeProviderCall(retryProvider, retryKey, base64Data, mimeType, resizedBase64Url, simpleInstruction);

        } catch (e2) {
            console.warn("[AI] Attempt 2 Failed:", e2);
            
            // ATTEMPT 3: FORCE FALLBACK (The "Nuclear Option")
            // Replaced fallback with error to completely stop auto-filling if APIs fail.
            console.error("AI Generation failed. Stopping process.", e2);
            throw new Error("All AI regeneration attempts failed.");
        }
    }

    if (!result || (!result.title && !result.description)) {
        // Final safety net
        throw new Error("AI returned an empty response.");
    }

    this.stats.requests++;
    this.stats.lastLatency = Date.now() - startTime;
    if (result.title) this.history.titles.push(result.title);
    if (result.description) this.history.descriptions.push(result.description);

    // --- BOARD SELECTION ---
    let finalBoard = result.board;
    
    if (availableBoards.length > 0) {
        const aiBoardRaw = (result.board || '').toLowerCase().trim();
        let match = availableBoards.find(b => b.toLowerCase().trim() === aiBoardRaw);

        if (!match) {
             match = availableBoards.find(b => aiBoardRaw.includes(b.toLowerCase().trim()) || b.toLowerCase().trim().includes(aiBoardRaw));
        }

        if (!match && aiBoardRaw) {
            let bestScore = 0;
            let bestMatch = availableBoards[0];
            const aiWords = aiBoardRaw.split(/\s+/);

            availableBoards.forEach(board => {
                const boardWords = board.toLowerCase().split(/\s+/);
                let score = 0;
                aiWords.forEach((w: string) => { if(boardWords.includes(w)) score++; });
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = board;
                }
            });
            if (bestScore > 0) match = bestMatch;
        }
        finalBoard = match || availableBoards[0] || ''; 
    } else {
        finalBoard = '';
    }

    const updatedPin = {
        ...pin,
        title: result.title,
        description: result.description,
        tags: result.tags,
        board: finalBoard,
        status: 'ready' as const
    };

    return { updatedPin, searchTerm: result.search_term || '' };
  }

  // Helper to route the call based on provider
  private async executeProviderCall(
      provider: AIServiceProvider, 
      apiKey: string, 
      base64Data: string, 
      mimeType: string, 
      fullBase64Url: string,
      instruction: string
  ): Promise<any> {
      let rawResponse: any;

      switch (provider) {
        case AIServiceProvider.GEMINI:
          // Gemini 2.5 Flash is more stable for automation than 3.0 Preview
          rawResponse = await this.callGemini(apiKey, base64Data, mimeType, instruction);
          break;
        
        case AIServiceProvider.GROQ:
        case AIServiceProvider.OPENAI:
        case AIServiceProvider.OPENROUTER:
          let endpoint = 'https://api.openai.com/v1/chat/completions';
          if (provider === AIServiceProvider.GROQ) endpoint = 'https://api.groq.com/openai/v1/chat/completions';
          if (provider === AIServiceProvider.OPENROUTER) endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          
          let model = '';
          if (this.customModelId) {
              model = this.customModelId;
          } else {
              if (provider === AIServiceProvider.GROQ) model = 'llama-3.2-90b-vision-preview';
              else if (provider === AIServiceProvider.OPENROUTER) model = 'anthropic/claude-3.5-sonnet';
              else model = 'gpt-4o';
          }
             
          try {
              rawResponse = await this.callOpenAICompatible(apiKey, fullBase64Url, instruction, model, endpoint);
          } catch (e: any) {
              // Groq Fallback: Try 11b model if 90b fails
              if (provider === AIServiceProvider.GROQ && !this.customModelId) {
                  console.warn("[AI] Groq 90b failed, trying 11b...", e.message);
                  try {
                      rawResponse = await this.callOpenAICompatible(apiKey, fullBase64Url, instruction, 'llama-3.2-11b-vision-preview', endpoint);
                  } catch (e2) {
                      // If Vision fails, try text-only (Llama 3 70b)
                      console.warn("[AI] Groq Vision failed, trying Text-Only...", e2);
                      rawResponse = await this.callOpenAICompatibleTextOnly(apiKey, instruction, 'llama3-70b-8192', endpoint);
                  }
              } else if (provider === AIServiceProvider.OPENROUTER) {
                  // OpenRouter Fallback: Try Text-Only if Vision fails (e.g. model doesn't support images)
                  console.warn("[AI] OpenRouter Vision failed, trying Text-Only...", e.message);
                  try {
                      rawResponse = await this.callOpenAICompatibleTextOnly(apiKey, instruction, model, endpoint);
                  } catch (e2) {
                      throw e; // Throw original error if both fail
                  }
              } else {
                  throw e;
              }
          }
          break;
        
        case AIServiceProvider.CLAUDE:
          rawResponse = await this.callClaude(apiKey, base64Data, mimeType, instruction);
          break;
        
        case AIServiceProvider.CLOUDFLARE:
          if (this.getApiKey(AIServiceProvider.GEMINI)) {
               rawResponse = await this.callGemini(this.getApiKey(AIServiceProvider.GEMINI), base64Data, mimeType, instruction);
          } else {
               rawResponse = await this.callCloudflareTextOnly(apiKey, this.cloudflareAccountId, instruction);
          }
          break;
        
        default:
          throw new Error("Unknown provider selected.");
      }

      // Ensure we have an object, not string
      if (typeof rawResponse === 'string') {
          return this.cleanJson(rawResponse);
      }
      return rawResponse;
  }

  // --- Implementation Methods ---

  private cleanJson(text: string): any {
    try {
        // Remove markdown artifacts
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        // Try to find object notation pattern
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try { return JSON.parse(match[0]); } catch (e2) {}
        }
        throw new Error("Failed to parse JSON response");
    }
  }

  private async callGemini(apiKey: string, base64Data: string, mimeType: string, prompt: string): Promise<any> {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ inlineData: { mimeType: mimeType, data: base64Data } }, { text: prompt }] },
      config: { responseMimeType: "application/json", temperature: 0.7 } 
    });
    return JSON.parse(response.text || '{}');
  }

  private async callOpenAICompatible(apiKey: string, base64Url: string, prompt: string, model: string, endpoint: string): Promise<any> {
    const headers: any = { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
    };
    
    if (endpoint.includes('openrouter.ai')) {
        headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://batchlyo.com';
        headers['X-Title'] = 'Batchlyo';
    }

    const body: any = {
        model: model,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: base64Url } }] }],
        temperature: 0.85
    };

    // Only add response_format for non-OpenRouter endpoints (like OpenAI official) 
    // or if we are sure the model supports it. Many OpenRouter models do NOT support it.
    if (!endpoint.includes('openrouter.ai')) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response structure from API");
    }

    const content = data.choices[0].message.content;
    return this.cleanJson(content);
  }

  private async callOpenAICompatibleTextOnly(apiKey: string, prompt: string, model: string, endpoint: string): Promise<any> {
    const headers: any = { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
    };
    
    if (endpoint.includes('openrouter.ai')) {
        headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://batchlyo.com';
        headers['X-Title'] = 'Batchlyo';
    }

    const body: any = {
        model: model,
        messages: [{ role: "user", content: prompt + "\n\n(Note: I cannot see the image. Generate generic high-quality metadata based on context clues or just be creative.)" }],
        temperature: 0.85
    };

    // Only add response_format for non-OpenRouter endpoints
    if (!endpoint.includes('openrouter.ai')) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response structure from API");
    }

    const content = data.choices[0].message.content;
    return this.cleanJson(content);
  }

  private async callClaude(apiKey: string, base64Data: string, mimeType: string, prompt: string): Promise<any> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mimeType, data: base64Data } }, { type: "text", text: prompt + " Respond with JSON only." }] }]
      })
    });
    if (!response.ok) throw new Error(`Claude API Error: ${response.status}`);
    const data = await response.json();
    return this.cleanJson(data.content[0].text);
  }

  private async callCloudflareTextOnly(apiKey: string, accountId: string, prompt: string): Promise<any> {
     const model = this.customModelId || '@cf/meta/llama-3.1-8b-instruct';
     const targetUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
     const bodyPayload = { 
         messages: [
             { role: 'system', content: 'You are an AI assistant. Output strictly JSON.' },
             { role: 'user', content: prompt + "\n\n(Note: I cannot see the image. Generate generic high-quality metadata.)" }
         ]
     };

     let response;
     try {
         response = await fetch(targetUrl, {
             method: 'POST',
             headers: { 
                 'Authorization': `Bearer ${apiKey}`,
                 'Content-Type': 'application/json' 
             },
             body: JSON.stringify(bodyPayload)
         });
     } catch (e) {
         console.warn("[AI] Cloudflare Text Direct Fetch failed, trying corsproxy.io");
     }

     if (!response || !response.ok) {
         const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
         response = await fetch(proxyUrl, {
             method: 'POST',
             headers: { 
                 'Authorization': `Bearer ${apiKey}`,
                 'Content-Type': 'application/json' 
             },
             body: JSON.stringify(bodyPayload)
         });
     }
     
     if (!response.ok) throw new Error(`Cloudflare Text API Error: ${response.status}`);
     const data = await response.json();
     return this.cleanJson(data.result.response);
  }
  
  public async rewriteContent(pin: Pin, availableBoards: string[] = []): Promise<{ title: string, description: string, board?: string }> {
      const apiKey = this.getApiKey(this.currentProvider);
      if (!apiKey) throw new Error("API Key missing");
      
      const prompt = `
      TASK: You are an elite Social Media Copywriter and SEO Expert. Rewrite this Pinterest content to go viral.
      ORIGINAL TITLE: "${pin.title}"
      ORIGINAL DESCRIPTION: "${pin.description}"
      
      REQUIREMENTS:
      1. TITLE: Engaging, Descriptive, Click-bait but honest (8-15 WORDS). Aim for 50-80 chars. Use power words and emotional triggers.
      2. DESCRIPTION: Max 250 chars. Start with a hook, include the main keyword naturally, and end with a GOD-TIER Call-To-Action (CTA) motivating people to save or click the pin (e.g., "Save this for your next project!", "Click the link to get the full guide!").
      3. OUTPUT: Strictly JSON.
      
      CRITICAL INSTRUCTIONS TO PREVENT REPETITION:
      - DO NOT repeat the exact same phrases, titles, or descriptions.
      - Be highly creative and unique. Vary your sentence structures, vocabulary, and CTAs.
      - Do NOT start every title or description the same way.
      - The content MUST sound human, engaging, and highly clickable. Avoid robotic or generic phrasing.
      
      ${availableBoards.length > 0 ? `Select best board from: ${JSON.stringify(availableBoards)}` : ''}
      `;

      const result = await this.executeProviderCall(
          this.currentProvider, 
          apiKey, 
          "", 
          "", 
          "", 
          prompt + " Return JSON: { \"title\": \"...\", \"description\": \"...\", \"board\": \"...\" }"
      );
      
      if (availableBoards.length > 0 && result.board) {
         const match = availableBoards.find(b => b.toLowerCase().trim() === result.board?.toLowerCase().trim());
         if (match) result.board = match;
         else result.board = availableBoards[0];
      }
      return result;
  }

  public async categorizeImage(imageUrl: string, availableBoards: string[] = []): Promise<string> {
      try {
          const fullBase64Url = await urlToBase64(imageUrl);
          const resizedBase64Url = await resizeImageForAI(fullBase64Url);
          const base64Data = resizedBase64Url.split(',')[1];
          const mimeType = resizedBase64Url.substring(resizedBase64Url.indexOf(':') + 1, resizedBase64Url.indexOf(';'));

          let apiKey = this.getApiKey(this.currentProvider);
          if (this.currentProvider === AIServiceProvider.CLOUDFLARE && !apiKey && this.getApiKey(AIServiceProvider.GEMINI)) {
               apiKey = "fallback_to_gemini";
          }
          if (!apiKey && this.currentProvider !== AIServiceProvider.POLLINATIONS) { 
              return availableBoards[0] || 'Unsorted';
          }

          const prompt = `
          TASK: Analyze this image and categorize it into the most appropriate Pinterest board.
          ${availableBoards.length > 0 ? `AVAILABLE BOARDS: ${JSON.stringify(availableBoards)}` : 'If no boards are provided, invent a 1-2 word category.'}
          OUTPUT: Strictly JSON. Return ONLY the board name.
          `;

          const result = await this.executeProviderCall(
              this.currentProvider, 
              apiKey, 
              base64Data, 
              mimeType, 
              resizedBase64Url, 
              prompt + " Return JSON: { \"board\": \"...\" }"
          );

          if (availableBoards.length > 0 && result.board) {
             const match = availableBoards.find(b => b.toLowerCase().trim() === result.board?.toLowerCase().trim());
             if (match) return match;
             
             // Fuzzy match
             const aiBoardRaw = result.board.toLowerCase().trim();
             const fuzzyMatch = availableBoards.find(b => aiBoardRaw.includes(b.toLowerCase().trim()) || b.toLowerCase().trim().includes(aiBoardRaw));
             if (fuzzyMatch) return fuzzyMatch;
             
             return availableBoards[0];
          }
          
          return result.board || 'Unsorted';
      } catch (e) {
          console.warn("[AI] Categorization failed:", e);
          return availableBoards[0] || 'Unsorted';
      }
  }
}

export const aiService = new AIService();
