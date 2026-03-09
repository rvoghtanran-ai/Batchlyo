
import React, { useState, useEffect } from 'react';
import { X, Save, Key, Zap, Sparkles, Bot, BrainCircuit, CheckCircle2, Circle, Cpu, Image, Globe, Plus, Trash2, Cloud, Sheet, Copy, Check, ChevronDown, ChevronRight, Server, Box, ExternalLink, Pencil, ArrowUp, ArrowDown } from 'lucide-react';
import { AIServiceProvider, WebhookAccount, ImageHostProvider, ImageHostSettings } from '../types';
import { aiService } from '../services/aiService';
import { v4 as uuidv4 } from 'uuid';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  userPlan?: string;
}

const GAS_CODE = `function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var jsonData;
    
    // 1. Try parsing raw body (JSON)
    if (e.postData && e.postData.contents) {
      try { jsonData = JSON.parse(e.postData.contents); } catch(e){}
    }
    
    // 2. Try parsing form parameter 'payload' (More reliable for no-cors)
    if (!jsonData && e.parameter && e.parameter.payload) {
      try { jsonData = JSON.parse(e.parameter.payload); } catch(e){}
    }

    if (jsonData) {
      // Ensure it's an array
      if (!Array.isArray(jsonData)) jsonData = [jsonData];
      
      if (jsonData.length > 0) {
        // A. Handle Headers
        var headers = [];
        if (sheet.getLastRow() === 0) {
          headers = Object.keys(jsonData[0]);
          sheet.appendRow(headers);
        } else {
          headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        }
        
        // B. Map Data to Headers
        var rows = jsonData.map(item => {
          return headers.map(h => {
             var val = item[h];
             return (val === undefined || val === null) ? "" : String(val);
          });
        });
        
        // C. Append Rows
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      }
    }
    
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch(e) {
    return ContentService.createTextOutput("Error: " + e.toString());
  } finally {
    lock.releaseLock();
  }
}`;

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, userPlan = 'starter' }) => {
  const [activeProvider, setActiveProvider] = useState<AIServiceProvider>(AIServiceProvider.GEMINI);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [cfAccountId, setCfAccountId] = useState('');
  const [customModelId, setCustomModelId] = useState('');
  
  // Image Hosting State
  const [imgSettings, setImgSettings] = useState<ImageHostSettings>({
      provider: ImageHostProvider.IMGBB,
      apiKey: '',
      cloudName: '',
      uploadPreset: ''
  });

  // Webhook Accounts State
  const [webhookAccounts, setWebhookAccounts] = useState<WebhookAccount[]>([]);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountUrl, setNewAccountUrl] = useState('');
  
  // Edit State
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  
  // GAS Guide State
  const [showGasGuide, setShowGasGuide] = useState(false);
  const [copiedGas, setCopiedGas] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'ai' | 'hosting' | 'webhooks'>('ai');

  // Load current settings when opened
  useEffect(() => {
    if (isOpen) {
      setActiveProvider(aiService.getProvider());
      
      // Load AI keys
      const savedKeys = localStorage.getItem('easyPin_apiKeys');
      if (savedKeys) {
         try {
            setApiKeys(JSON.parse(savedKeys));
         } catch(e) { setApiKeys({}); }
      }

      // Load Cloudflare Account ID
      setCfAccountId(aiService.getCloudflareAccountId() || '');

      // Load Custom Model ID
      setCustomModelId(aiService.getCustomModelId() || '');

      // Load Image Host Settings
      const savedImgSettings = localStorage.getItem('easyPin_imgHostSettings');
      if (savedImgSettings) {
          try { setImgSettings(JSON.parse(savedImgSettings)); } catch(e){}
      } else {
          // Migration: Check for old ImgBB key
          const oldKey = localStorage.getItem('easyPin_imgbbKey');
          if (oldKey) {
              setImgSettings({ provider: ImageHostProvider.IMGBB, apiKey: oldKey });
          }
      }
      
      // Load Webhook Accounts
      const savedAccounts = localStorage.getItem('easyPin_webhookAccounts');
      if (savedAccounts) {
        try { setWebhookAccounts(JSON.parse(savedAccounts)); } catch(e) {}
      } else {
        // Migration: Check for old single URL
        const oldUrl = localStorage.getItem('easyPin_webhookUrl');
        if (oldUrl) {
           setWebhookAccounts([{ id: uuidv4(), name: 'Default Account', url: oldUrl }]);
        }
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    // Clean keys
    const cleanedApiKeys: Record<string, string> = {};
    Object.entries(apiKeys).forEach(([k, v]) => {
      if (typeof v === 'string') {
        cleanedApiKeys[k] = v.trim();
      }
    });

    aiService.setProvider(activeProvider);
    aiService.setApiKeys(cleanedApiKeys);
    aiService.setCloudflareAccountId(cfAccountId.trim());
    aiService.setCustomModelId(customModelId.trim());
    
    // Save Image Settings
    localStorage.setItem('easyPin_imgHostSettings', JSON.stringify(imgSettings));
    if (imgSettings.provider === ImageHostProvider.IMGBB && imgSettings.apiKey) {
        localStorage.setItem('easyPin_imgbbKey', imgSettings.apiKey);
    }

    // Save Accounts
    localStorage.setItem('easyPin_webhookAccounts', JSON.stringify(webhookAccounts));
    
    onSave();
    onClose();
  };

  const handleKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({...prev, [provider]: value}));
  };

  // --- Account Management Logic ---
  const [slotError, setSlotError] = useState<string | null>(null);

  const getAccountLimit = () => {
    if (userPlan === 'agency') return 1000;
    if (userPlan === 'pro') return 5;
    return 1; // Starter
  };

  const handleAddAccount = () => {
    const limit = getAccountLimit();
    if (webhookAccounts.length >= limit) {
      setSlotError(`Your ${userPlan} plan is limited to ${limit} account slot${limit > 1 ? 's' : ''}. Upgrade for more.`);
      return;
    }

    if (newAccountName.trim() && newAccountUrl.trim()) {
      setWebhookAccounts(prev => [...prev, {
        id: uuidv4(),
        name: newAccountName.trim(),
        url: newAccountUrl.trim()
      }]);
      setNewAccountName('');
      setNewAccountUrl('');
      setSlotError(null);
    }
  };

  const handleDeleteAccount = (id: string) => {
    setWebhookAccounts(prev => prev.filter(a => a.id !== id));
  };

  const handleStartEdit = (account: WebhookAccount) => {
      setEditingAccountId(account.id);
      setEditName(account.name);
      setEditUrl(account.url);
  };

  const handleSaveEdit = () => {
      if (editingAccountId && editName.trim() && editUrl.trim()) {
          setWebhookAccounts(prev => prev.map(acc => {
              if (acc.id === editingAccountId) {
                  return { ...acc, name: editName.trim(), url: editUrl.trim() };
              }
              return acc;
          }));
          setEditingAccountId(null);
      }
  };

  const handleCancelEdit = () => {
      setEditingAccountId(null);
  };

  const moveAccount = (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === webhookAccounts.length - 1) return;
      
      const newAccounts = [...webhookAccounts];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Swap
      [newAccounts[index], newAccounts[targetIndex]] = [newAccounts[targetIndex], newAccounts[index]];
      setWebhookAccounts(newAccounts);
  };

  // --------------------------------

  const handleCopyGas = () => {
    navigator.clipboard.writeText(GAS_CODE);
    setCopiedGas(true);
    setTimeout(() => setCopiedGas(false), 2000);
  };

  const getProviderIcon = (p: string) => {
    switch(p) {
      case AIServiceProvider.GROQ: return <Zap className="w-4 h-4 text-orange-500" />;
      case AIServiceProvider.GEMINI: return <Sparkles className="w-4 h-4 text-blue-400" />;
      case AIServiceProvider.OPENAI: return <Bot className="w-4 h-4 text-emerald-500" />;
      case AIServiceProvider.CLAUDE: return <BrainCircuit className="w-4 h-4 text-amber-600" />;
      case AIServiceProvider.CLOUDFLARE: return <Cloud className="w-4 h-4 text-orange-400" />;
      case AIServiceProvider.OPENROUTER: return <Globe className="w-4 h-4 text-indigo-400" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getProviderHelpUrl = (p: string) => {
      switch(p) {
          case AIServiceProvider.GROQ: return 'https://console.groq.com/docs/models';
          case AIServiceProvider.GEMINI: return 'https://aistudio.google.com/';
          case AIServiceProvider.OPENAI: return 'https://platform.openai.com/docs/models';
          case AIServiceProvider.CLAUDE: return 'https://docs.anthropic.com/en/docs/about-claude/models';
          case AIServiceProvider.CLOUDFLARE: return 'https://developers.cloudflare.com/workers-ai/models/';
          case AIServiceProvider.OPENROUTER: return 'https://openrouter.ai/docs/models';
          default: return '';
      }
  };

  const getImageHostIcon = (p: ImageHostProvider) => {
      switch(p) {
          case ImageHostProvider.CLOUDINARY: return <Cloud className="w-5 h-5 text-blue-500" />;
          case ImageHostProvider.IMGBB: return <Image className="w-5 h-5 text-pink-500" />;
          case ImageHostProvider.FREEIMAGE: return <Server className="w-5 h-5 text-green-500" />;
          default: return <Image className="w-5 h-5" />;
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border w-[650px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-panel p-5 border-b border-border flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text-main tracking-tight flex items-center gap-2">
               <Cpu className="w-5 h-5 text-accent-purple" />
               Command Center
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Configure AI, Hosting & Automation.</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col h-full overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-2 bg-panel border-b border-border">
                <button 
                    onClick={() => setActiveTab('ai')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-card text-text-main shadow-sm border border-border' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                >
                    <Bot className="w-3.5 h-3.5" /> AI Providers
                </button>
                <button 
                    onClick={() => setActiveTab('hosting')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'hosting' ? 'bg-card text-text-main shadow-sm border border-border' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                >
                    <Image className="w-3.5 h-3.5" /> Image Hosting
                </button>
                <button 
                    onClick={() => setActiveTab('webhooks')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'webhooks' ? 'bg-card text-text-main shadow-sm border border-border' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                >
                    <Globe className="w-3.5 h-3.5" /> Webhooks
                </button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar bg-panel flex-1">
          
              {/* AI Providers Section */}
              {activeTab === 'ai' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                     <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Artificial Intelligence</h3>
                     <div className="grid gap-2">
                       {Object.values(AIServiceProvider).map((p) => {
                  const isActive = activeProvider === p;
                  const key = apiKeys[p] || '';
                  const isCloudflare = p === AIServiceProvider.CLOUDFLARE;
                  const isGemini = p === AIServiceProvider.GEMINI;
                  const isPollinations = p === AIServiceProvider.POLLINATIONS;

                  let placeholderText = "API Key...";
                  if (isGemini) placeholderText = "Use System Default or Enter Key...";
                  if (isCloudflare) placeholderText = "Cloudflare API Token (Workers AI)...";

                  if (isPollinations) return null;

                  return (
                    <div key={p}>
                        <div 
                           className={`relative rounded-lg border transition-all duration-200 p-2.5 flex items-center gap-3 ${
                              isActive 
                              ? 'bg-card border-accent-purple/50 shadow-sm' 
                              : 'bg-panel border-border hover:border-text-muted/20'
                           }`}
                        >
                           <button onClick={() => setActiveProvider(p)} className="flex-shrink-0 focus:outline-none" title="Set as Active Provider">
                              {isActive 
                                 ? <CheckCircle2 className="w-4 h-4 text-accent-purple" /> 
                                 : <Circle className="w-4 h-4 text-text-muted hover:text-text-secondary" />
                              }
                           </button>

                           <div className="w-32 flex items-center gap-2 flex-shrink-0">
                              <div className={`p-1.5 rounded-md bg-panel border border-border ${isActive ? 'shadow-inner' : ''}`}>
                                 {getProviderIcon(p)}
                              </div>
                              <span className={`text-xs font-bold ${isActive ? 'text-text-main' : 'text-text-secondary'}`}>{p}</span>
                           </div>

                           <div className="flex-1 relative group">
                              <input
                                 type="password"
                                 value={key}
                                 onChange={(e) => handleKeyChange(p, e.target.value)}
                                 placeholder={placeholderText}
                                 className="w-full bg-panel border border-border rounded px-3 py-1.5 text-[11px] text-text-main placeholder-text-muted focus:outline-none focus:border-text-muted/50 focus:bg-card transition-all font-mono h-8 pr-8"
                              />
                              {getProviderHelpUrl(p) && (
                                  <a href={getProviderHelpUrl(p)} target="_blank" rel="noreferrer" className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent-purple transition-colors">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                              )}
                           </div>
                       </div>

                       {/* Cloudflare Account ID - Always Show if Cloudflare */}
                       {isCloudflare && (
                           <div className="ml-[144px] mt-2 animate-in fade-in slide-in-from-top-1">
                               <div className="relative">
                                    <input
                                        type="text"
                                        value={cfAccountId}
                                        onChange={(e) => setCfAccountId(e.target.value)}
                                        placeholder="Cloudflare Account ID (Required for Images)"
                                        className="w-full bg-panel border border-border rounded px-3 py-1.5 text-[11px] text-text-main placeholder-text-muted focus:outline-none focus:border-text-muted/50 focus:bg-card transition-all font-mono h-8"
                                    />
                                    <Cloud className={`absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 ${cfAccountId.length > 5 ? 'text-orange-400' : 'text-text-muted'}`} />
                               </div>
                           </div>
                       )}

                       {/* Custom Model - Only if Active and Supported */}
                       {isActive && (p === AIServiceProvider.GROQ || p === AIServiceProvider.OPENAI || p === AIServiceProvider.OPENROUTER || isCloudflare) && (
                          <div className="ml-[144px] mt-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                               <div className="relative">
                                   <input
                                        type="text"
                                        value={customModelId}
                                        onChange={(e) => setCustomModelId(e.target.value)}
                                        placeholder={p === AIServiceProvider.GROQ ? "Custom Model (e.g. meta-llama/llama-4...)" : "Custom Model ID (Optional)"}
                                        className="w-full bg-panel border border-border rounded px-3 py-1.5 text-[11px] text-text-main placeholder-text-muted focus:outline-none focus:border-text-muted/50 focus:bg-card transition-all font-mono h-8 pr-20"
                                   />
                                   <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <Box className={`w-3 h-3 ${customModelId.length > 5 ? 'text-accent-purple' : 'text-text-muted'}`} />
                                   </div>
                               </div>
                          </div>
                       )}
                    </div>
                  );
               })}
             </div>
          </div>
          )}

          {/* Image Hosting Section */}
          {activeTab === 'hosting' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
             <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Image Hosting</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                 {Object.values(ImageHostProvider).map(p => (
                     <button
                        key={p}
                        onClick={() => setImgSettings(prev => ({...prev, provider: p}))}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left ${
                            imgSettings.provider === p
                            ? 'bg-card border-accent-blue text-text-main shadow-lg shadow-blue-500/10'
                            : 'bg-panel border-border text-text-muted hover:text-text-secondary hover:border-text-muted/20'
                        }`}
                     >
                        {getImageHostIcon(p)}
                        <span className="text-[10px] font-bold">{p}</span>
                     </button>
                 ))}
             </div>

             <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                 {imgSettings.provider === ImageHostProvider.IMGBB && (
                     <div className="relative">
                        <label className="text-[10px] font-bold text-text-muted uppercase mb-1 block">ImgBB API Key</label>
                        <input
                             type="password"
                             value={imgSettings.apiKey || ''}
                             onChange={(e) => setImgSettings(prev => ({...prev, apiKey: e.target.value}))}
                             placeholder="Enter Key"
                             className="w-full bg-panel border border-border rounded px-3 py-2 text-xs text-text-main focus:outline-none focus:border-pink-500/50"
                        />
                     </div>
                 )}
                 {imgSettings.provider === ImageHostProvider.FREEIMAGE && (
                     <div className="relative">
                        <label className="text-[10px] font-bold text-text-muted uppercase mb-1 block">FreeImage.host API Key</label>
                        <input
                             type="password"
                             value={imgSettings.apiKey || ''}
                             onChange={(e) => setImgSettings(prev => ({...prev, apiKey: e.target.value}))}
                             placeholder="Enter Key"
                             className="w-full bg-panel border border-border rounded px-3 py-2 text-xs text-text-main focus:outline-none focus:border-green-500/50"
                        />
                     </div>
                 )}
                 {imgSettings.provider === ImageHostProvider.CLOUDINARY && (
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                             <label className="text-[10px] font-bold text-text-muted uppercase mb-1 block">Cloud Name</label>
                             <input
                                  type="text"
                                  value={imgSettings.cloudName || ''}
                                  onChange={(e) => setImgSettings(prev => ({...prev, cloudName: e.target.value}))}
                                  placeholder="dxyz..."
                                  className="w-full bg-panel border border-border rounded px-3 py-2 text-xs text-text-main focus:outline-none focus:border-blue-500/50"
                             />
                        </div>
                        <div>
                             <label className="text-[10px] font-bold text-text-muted uppercase mb-1 block">Upload Preset (Unsigned)</label>
                             <input
                                  type="text"
                                  value={imgSettings.uploadPreset || ''}
                                  onChange={(e) => setImgSettings(prev => ({...prev, uploadPreset: e.target.value}))}
                                  placeholder="my_preset"
                                  className="w-full bg-panel border border-border rounded px-3 py-2 text-xs text-text-main focus:outline-none focus:border-blue-500/50"
                             />
                        </div>
                     </div>
                 )}
             </div>
          </div>
          )}

          {/* Automation Accounts Section (IMPROVED) */}
          {activeTab === 'webhooks' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
             <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Automation Accounts</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Destinations (Make, Zapier, Sheets).</p>
                </div>
                
                <button
                    onClick={() => setShowGasGuide(!showGasGuide)}
                    className="text-[10px] flex items-center gap-1.5 px-2 py-1 rounded-md border border-green-500/20 bg-green-500/5 text-green-400 hover:bg-green-500/10 transition-colors"
                >
                    <Sheet className="w-3 h-3" />
                    {showGasGuide ? "Hide" : "Setup Guide"}
                </button>
             </div>
             
             {showGasGuide && (
                 <div className="bg-panel rounded-xl border border-green-500/20 p-4 animate-in fade-in slide-in-from-top-2">
                     <h4 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-2">
                         <Sheet className="w-4 h-4" /> Google Apps Script Setup
                     </h4>
                     <ol className="text-[10px] text-text-muted list-decimal list-inside space-y-1 mb-3">
                         <li>Open your Google Sheet &gt; Extensions &gt; Apps Script.</li>
                         <li>Paste the code & Deploy as Web App (Access: <strong>Anyone</strong>).</li>
                     </ol>
                     <div className="relative">
                         <pre className="text-[9px] font-mono bg-black/50 p-3 rounded-lg text-text-secondary whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar border border-border">
                             {GAS_CODE}
                         </pre>
                         <button onClick={handleCopyGas} className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 transition-colors">
                             {copiedGas ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                         </button>
                     </div>
                 </div>
             )}

             <div className="bg-card border border-border rounded-lg overflow-hidden">
                  {/* Add New */}
                  <div className="p-2 bg-panel border-b border-border flex flex-col gap-2">
                     <div className="flex gap-2">
                         <input 
                            type="text" 
                            value={newAccountName}
                            onChange={(e) => { setNewAccountName(e.target.value); setSlotError(null); }}
                            placeholder="Name"
                            className="w-1/3 bg-panel border border-border rounded px-2 py-1.5 text-xs text-text-main focus:outline-none focus:border-emerald-500 h-8"
                         />
                         <input 
                            type="text" 
                            value={newAccountUrl}
                            onChange={(e) => { setNewAccountUrl(e.target.value); setSlotError(null); }}
                            placeholder="https://..."
                            className="flex-1 bg-panel border border-border rounded px-2 py-1.5 text-xs text-text-main focus:outline-none focus:border-emerald-500 font-mono h-8"
                         />
                         <button 
                            onClick={handleAddAccount}
                            disabled={!newAccountName || !newAccountUrl}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded disabled:opacity-50 transition-colors h-8 flex items-center justify-center"
                         >
                            <Plus className="w-4 h-4" />
                         </button>
                     </div>
                     {slotError && (
                         <div className="px-2 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded text-[10px] text-orange-400 font-bold flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-200">
                             <Zap className="w-3 h-3" /> {slotError}
                         </div>
                     )}
                  </div>

                 {/* List (Editable & Reorderable) */}
                 <div className="max-h-48 overflow-y-auto custom-scrollbar">
                     {webhookAccounts.length === 0 ? (
                        <div className="p-4 text-center text-[10px] text-text-muted italic">No accounts configured.</div>
                     ) : (
                        webhookAccounts.map((acc, index) => (
                            <div key={acc.id} className="p-2 flex items-center gap-2 border-b border-border last:border-0 hover:bg-panel group">
                                
                                {/* Reordering Arrows */}
                                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => moveAccount(index, 'up')}
                                        disabled={index === 0}
                                        className="text-text-muted hover:text-text-main disabled:opacity-30"
                                    >
                                        <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button 
                                        onClick={() => moveAccount(index, 'down')}
                                        disabled={index === webhookAccounts.length - 1}
                                        className="text-text-muted hover:text-text-main disabled:opacity-30"
                                    >
                                        <ArrowDown className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Icon */}
                                <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                    {acc.url.includes('script.google.com') ? <Sheet className="w-3 h-3 text-green-500" /> : <Globe className="w-3 h-3 text-emerald-500" />}
                                </div>

                                {/* Edit Mode vs View Mode */}
                                {editingAccountId === acc.id ? (
                                    <div className="flex-1 flex gap-2 animate-in fade-in">
                                        <input 
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-1/3 bg-panel border border-emerald-500/50 rounded px-2 py-1 text-xs text-text-main focus:outline-none"
                                        />
                                        <input 
                                            value={editUrl}
                                            onChange={(e) => setEditUrl(e.target.value)}
                                            className="flex-1 bg-panel border border-emerald-500/50 rounded px-2 py-1 text-xs text-text-main focus:outline-none font-mono"
                                        />
                                        <button onClick={handleSaveEdit} className="text-green-500 hover:text-green-400"><Check className="w-4 h-4" /></button>
                                        <button onClick={handleCancelEdit} className="text-text-muted hover:text-text-main"><X className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-text-main truncate">{acc.name}</div>
                                        <div className="text-[9px] text-text-muted truncate font-mono max-w-[250px]">{acc.url}</div>
                                    </div>
                                )}

                                {/* Actions */}
                                {editingAccountId !== acc.id && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleStartEdit(acc)} className="text-text-muted hover:text-blue-400 p-1.5"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDeleteAccount(acc.id)} className="text-text-muted hover:text-red-500 p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                )}
                            </div>
                        ))
                     )}
                 </div>
             </div>
          </div>
          )}

        </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-panel flex justify-end">
          <button onClick={handleSave} className="bg-accent-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-white/5">
            <Save className="w-3.5 h-3.5" />
            SAVE & CLOSE
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
