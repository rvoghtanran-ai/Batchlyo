
import React, { useRef, useState } from 'react';
import { UploadCloud, Search, Sparkles, Image as ImageIcon, Globe, Briefcase, ChevronDown, Settings, Bot, Loader2, FileArchive, FileImage, FileText, HelpCircle, Lock, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, AlertTriangle } from 'lucide-react';
import { AspectRatio, WebhookAccount, AIServiceProvider, GlobalSettings } from '../types';

interface SidebarProps {
  // Generation Props
  prompt: string;
  setPrompt: (val: string) => void;
  imgCount: number;
  setImgCount: (val: number) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (val: AspectRatio) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  
  // New: Upload Loading State
  isUploading: boolean;

  // New Image Provider Props
  imageGenProvider: AIServiceProvider;
  setImageGenProvider: (val: AIServiceProvider) => void;

  onUpload: (files: FileList | null) => void;
  
  webhookAccounts: WebhookAccount[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  onOpenSettings: () => void; // Added for 0 account fallback

  // New Scraper Props
  isScraping: boolean;
  onScrape: (url: string) => void;

  // Permissions
  userPlan?: 'starter' | 'pro' | 'agency';
  usage?: { exportedPins: number };

  // Collapse State
  isOpen: boolean;
  onToggle: () => void;

  // Global Settings
  globalSettings: GlobalSettings | null;
}

const Sidebar: React.FC<SidebarProps> = ({
  prompt,
  setPrompt,
  imgCount,
  setImgCount,
  aspectRatio,
  setAspectRatio,
  onGenerate,
  isGenerating,
  isUploading,
  imageGenProvider,
  setImageGenProvider,
  onUpload,
  webhookAccounts = [],
  activeAccountId,
  setActiveAccountId,
  onOpenSettings,
  isScraping,
  onScrape,
  userPlan = 'starter',
  usage,
  isOpen,
  onToggle,
  globalSettings
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scrapeUrl, setScrapeUrl] = useState('');

  const canUseAI = userPlan !== 'starter';
  const canUseAdvancedModels = userPlan === 'agency';
  
  const isScrapingEnabled = globalSettings?.features?.enableScraping ?? true;
  const isImageGenEnabled = globalSettings?.features?.enableImageGeneration ?? true;

  // Usage Limits
  const getLimit = () => {
      if (userPlan === 'agency') return 50000;
      if (userPlan === 'pro') return 5000;
      return 300; // Starter
  };
  const limit = getLimit();
  const currentUsage = usage?.exportedPins || 0;
  const usagePercent = Math.min(100, (currentUsage / limit) * 100);
  const isNearLimit = usagePercent > 80;

  // Safe access to webhookAccounts array
  const safeAccounts = Array.isArray(webhookAccounts) ? webhookAccounts : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          onUpload(e.target.files);
      }
      // Reset value so the same file can be selected again if needed
      e.target.value = '';
  };


  // Account Slot Limits
  const getAccountLimit = () => {
    if (userPlan === 'agency') return 1000; 
    if (userPlan === 'pro') return 5;
    return 1; // Starter
  };
  const accountLimit = getAccountLimit();
  const overAccountLimit = safeAccounts.length > accountLimit;

  return (
    <aside className="w-96 border-r border-border bg-panel p-6 flex flex-col gap-6 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar shadow-2xl z-10 flex-shrink-0 transition-all duration-300">
      
      <div className="flex justify-between items-center px-2">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Tools</h2>
      </div>

      {/* --- Workspace / Account Selector (Robust Design) --- */}
      <div className={`bg-card border p-5 rounded-2xl relative shadow-lg ${overAccountLimit ? 'border-orange-500/50' : 'border-emerald-500/50'}`}>
          
          <div className="flex justify-between items-center mb-3">
            <label className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${overAccountLimit ? 'text-orange-500' : 'text-emerald-500'}`}>
               <Briefcase className="w-4 h-4" /> Active Project
            </label>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${overAccountLimit ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                {safeAccounts.length} / {userPlan === 'agency' ? '∞' : accountLimit} SLOTS
            </span>
          </div>

          {safeAccounts.length > 0 ? (
            <div className="relative group/select">
                <select 
                    value={activeAccountId}
                    onChange={(e) => setActiveAccountId(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl py-3 px-10 text-sm text-text-main focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer hover:border-text-muted/40 transition-colors font-bold shadow-inner"
                >
                    <option value="" className="bg-card text-text-main">Global View (All)</option>
                    {safeAccounts.map(acc => (
                        <option key={acc.id} value={acc.id} className="bg-card text-text-main">{acc.name}</option>
                    ))}
                </select>
                <Globe className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${overAccountLimit ? 'text-orange-500' : 'text-emerald-500'}`} />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                
                {overAccountLimit && (
                    <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <p className="text-[10px] text-orange-400 font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" /> Slot limit exceeded! Upgrade to Pro for 5 accounts.
                        </p>
                    </div>
                )}
            </div>
          ) : (
            <button 
                onClick={onOpenSettings}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
            >
                <Settings className="w-4 h-4" />
                SETUP ACCOUNTS
            </button>
          )}
          
          {/* Active Status Text - Explicit Confirmation */}
          {safeAccounts.length > 0 && (
            <div className="mt-2 text-center">
                <p className="text-[10px] text-text-muted">
                    Pins & Boards restricted to: <span className="text-emerald-400 font-bold">{activeAccountId ? safeAccounts.find(a => a.id === activeAccountId)?.name : 'Global View'}</span>
                </p>
            </div>
          )}
      </div>
      
      {/* --- CONTENT SOURCES SECTION --- */}
      <div className="space-y-4 pb-6 border-b border-border">
        
        {/* TAB 1: SCRAPER (RESTORED) */}
        <div className={`space-y-1.5 ${!isScrapingEnabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
           <h3 className="text-xs font-bold text-text-main uppercase tracking-wider mb-2 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-orange-500" />
              Web Scraper
              {!isScrapingEnabled && <span className="text-[9px] text-red-400 border border-red-500/30 px-1 rounded bg-red-500/10">DISABLED</span>}
              <div className="group relative">
                    <HelpCircle className="w-3 h-3 text-text-muted hover:text-text-main cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-charcoal-900 border border-border p-2 rounded text-[9px] text-text-muted hidden group-hover:block z-50 pointer-events-none shadow-xl">
                        Enter any website URL (e.g. Etsy product, Blog post) to extract high-quality images automatically.
                    </div>
               </div>
           </h3>
           <div className="flex gap-2">
              <div className="flex-1 relative">
                 <input
                    id="url-input"
                    type="text"
                    value={scrapeUrl}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                    placeholder="https://site.com/product"
                    disabled={!isScrapingEnabled}
                    className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2.5 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-orange-500 transition-colors disabled:cursor-not-allowed"
                    onKeyDown={(e) => e.key === 'Enter' && onScrape(scrapeUrl)}
                 />
                 <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              </div>
              <button 
                 onClick={() => onScrape(scrapeUrl)}
                 disabled={isScraping || !scrapeUrl || !isScrapingEnabled}
                 className="bg-orange-600 hover:bg-orange-500 text-white px-3 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 title="Scrape Images"
              >
                 {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
           </div>
        </div>

        {/* TAB 2: AI IMAGE GENERATOR */}
        <div className={`space-y-1.5 pt-4 border-t border-border ${(!canUseAI || !isImageGenEnabled) ? 'opacity-60 grayscale' : ''}`}>
          <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
                AI Image Generator
                {!isImageGenEnabled && <span className="text-[9px] text-red-400 border border-red-500/30 px-1 rounded bg-red-500/10">DISABLED</span>}
              </h3>
              {!canUseAI && <span className="text-[9px] font-bold bg-white/10 px-2 rounded text-text-muted border border-border flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> PRO</span>}
          </div>
          
          {/* Prompt Input */}
          <div className="space-y-1.5">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={!canUseAI || !isImageGenEnabled}
                placeholder={isImageGenEnabled ? "Describe the image you want to generate..." : "AI Generation is currently disabled by admin."}
                className="w-full h-24 bg-card border border-border rounded-lg py-2.5 px-3 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-accent-blue/50 focus:bg-main transition-all resize-none custom-scrollbar disabled:cursor-not-allowed"
              />
          </div>

          {/* New Row: AI Model Selector */}
          <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1.5">
                  <Bot className="w-3 h-3" /> Model
              </label>
              <div className="relative">
                  <select
                      value={imageGenProvider}
                      onChange={(e) => setImageGenProvider(e.target.value as AIServiceProvider)}
                      disabled={!canUseAI || !isImageGenEnabled}
                      className="w-full bg-card border border-border rounded-lg py-2 pl-3 pr-8 text-xs text-text-main focus:outline-none focus:border-accent-blue appearance-none cursor-pointer disabled:cursor-not-allowed"
                  >
                      <option value={AIServiceProvider.GEMINI}>Google Gemini (Imagen)</option>
                      <option value={AIServiceProvider.POLLINATIONS}>Pollinations.ai (Free/No Key)</option>
                      <option value={AIServiceProvider.OPENROUTER}>OpenRouter (Stable Diffusion/Flux)</option>
                      {canUseAdvancedModels ? (
                          <option value={AIServiceProvider.CLOUDFLARE}>Cloudflare (Flux Schnell)</option>
                      ) : (
                          <option disabled>Cloudflare (Agency Only)</option>
                      )}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              </div>
          </div>

          {/* Configuration Row */}
          <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Aspect Ratio</label>
                  <select 
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                      disabled={!canUseAI || !isImageGenEnabled}
                      className="w-full bg-card border border-border rounded-lg py-2 px-2 text-xs text-text-main focus:outline-none focus:border-accent-blue disabled:cursor-not-allowed"
                  >
                      <option value="1:1">Square (1:1)</option>
                      <option value="9:16">Portrait (9:16)</option>
                      <option value="16:9">Landscape (16:9)</option>
                      <option value="3:4">Pinterest (3:4)</option>
                  </select>
              </div>
              <div className="w-20 space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Count</label>
                  <select 
                      value={imgCount}
                      onChange={(e) => setImgCount(Number(e.target.value))}
                      disabled={!canUseAI || !isImageGenEnabled}
                      className="w-full bg-card border border-border rounded-lg py-2 px-2 text-xs text-text-main focus:outline-none focus:border-accent-blue disabled:cursor-not-allowed"
                  >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                  </select>
              </div>
          </div>

          {/* Generate Button */}
          <button
              onClick={onGenerate}
              disabled={isGenerating || !prompt.trim() || !canUseAI || !isImageGenEnabled}
              className="w-full bg-accent-blue hover:bg-blue-600 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
          >
              {isGenerating ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  GENERATING...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  GENERATE IMAGES
                </>
              )}
          </button>
        </div>

        {/* Local Upload */}
        <div className="pt-4 border-t border-border">
            <h3 className="text-xs font-bold text-text-main uppercase tracking-wider mb-2 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-indigo-500" />
                Quick Upload
            </h3>
            <input
                id="file-upload"
                type="file"
                multiple
                accept="image/*,.zip,application/zip,application/x-zip-compressed,.csv,text/csv"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />
            <div
                onClick={() => fileInputRef.current?.click()}
                className={`
                    relative group cursor-pointer
                    border-2 border-dashed border-border rounded-xl
                    bg-main/[0.02] hover:bg-main/[0.04]
                    transition-all duration-300
                    flex flex-col items-center justify-center
                    p-6 gap-3
                    ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-accent-blue/50'}
                `}
            >
                {isUploading ? (
                    <>
                        <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
                        <p className="text-xs font-bold text-accent-blue animate-pulse">Processing Files...</p>
                    </>
                ) : (
                    <>
                        <div className="flex gap-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-blue-500/20">
                                <FileImage className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-yellow-500/20">
                                <FileArchive className="w-5 h-5 text-yellow-400" />
                            </div>
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-xs font-bold text-text-muted group-hover:text-text-main transition-colors">
                                Click to Upload Files
                            </p>
                            <p className="text-[10px] text-text-muted">
                                Supports .JPG, .PNG, .ZIP & .CSV
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* Usage Stats - Bottom */}
        <div className="mt-auto pt-6 border-t border-border">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className={`w-3 h-3 ${isNearLimit ? 'text-orange-500 animate-pulse' : 'text-text-muted'}`} />
                    Monthly Usage
                </h3>
                <span className={`text-[10px] font-mono font-bold ${isNearLimit ? 'text-orange-400' : 'text-text-secondary'}`}>
                    {currentUsage} / {limit.toLocaleString()}
                </span>
            </div>
            <div className="w-full h-1.5 bg-card border border-border rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${isNearLimit ? 'bg-orange-500' : 'bg-emerald-500'}`}
                    style={{ width: `${usagePercent}%` }}
                />
            </div>
            {isNearLimit && (
                <p className="text-[9px] text-orange-400 mt-1.5 font-bold text-center">
                    Approaching limit! Upgrade for more.
                </p>
            )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
