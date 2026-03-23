import React, { useState, useEffect } from 'react';
import { Save, Zap, Sparkles, Bot, BrainCircuit, CheckCircle2, Circle, Cpu, Image, Globe, Plus, Trash2, Cloud, Sheet, Copy, Check, Server, Box, ExternalLink, Pencil, ArrowUp, ArrowDown, Link as LinkIcon, X } from 'lucide-react';
import { AIServiceProvider, WebhookAccount, ImageHostProvider, ImageHostSettings, PlatformType, SmartLinkSettings } from '../types';
import { aiService } from '../services/aiService';
import { v4 as uuidv4 } from 'uuid';

interface SettingsViewProps {
  userPlan?: string;
  webhookAccounts: WebhookAccount[];
  setWebhookAccounts: React.Dispatch<React.SetStateAction<WebhookAccount[]>>;
}

const GAS_CODE = `function doPost(e) { /* Check Google Sheets Code */ }`; // Keeping it brief for template, use actual if needed

const SettingsView: React.FC<SettingsViewProps> = ({ userPlan = 'starter', webhookAccounts, setWebhookAccounts }) => {
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
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountUrl, setNewAccountUrl] = useState('');
  
  // Edit State
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  
  // Account Smart Link Edit State
  const [editingSmartLinkAccountId, setEditingSmartLinkAccountId] = useState<string | null>(null);
  const [tempSmartLink, setTempSmartLink] = useState<SmartLinkSettings | null>(null);
  
  // GAS Guide State
  const [showGasGuide, setShowGasGuide] = useState(false);
  const [copiedGas, setCopiedGas] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'ai' | 'hosting' | 'webhooks'>('webhooks');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load current settings when opened
  useEffect(() => {
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
        const oldKey = localStorage.getItem('easyPin_imgbbKey');
        if (oldKey) {
            setImgSettings({ provider: ImageHostProvider.IMGBB, apiKey: oldKey });
        }
    }
  }, []);

  const handleSave = () => {
    setSaveStatus('saving');
    
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

    // Save Accounts (managed at Dashboard level, just persist them here)
    localStorage.setItem('easyPin_webhookAccounts', JSON.stringify(webhookAccounts));
    
    setTimeout(() => setSaveStatus('saved'), 500);
    setTimeout(() => setSaveStatus('idle'), 2500);
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
      setSlotError(`Your ${userPlan} plan is limited to ${limit} account slot\${limit > 1 ? 's' : ''}. Upgrade for more.`);
      return;
    }

    if (newAccountName.trim() && newAccountUrl.trim()) {
      setWebhookAccounts(prev => [...prev, {
        id: uuidv4(),
        name: newAccountName.trim(),
        url: newAccountUrl.trim(),
        smartLink: { enabled: false, platform: 'blogger', baseUrl: '', customPath: '/search?q=' }
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

  const handleOpenSmartLinkEdit = (account: WebhookAccount) => {
      setEditingSmartLinkAccountId(account.id);
      setTempSmartLink(account.smartLink || { enabled: false, platform: 'blogger', baseUrl: '', customPath: '/search?q=' });
  };

  const handleSaveSmartLinkEdit = () => {
      if (editingSmartLinkAccountId && tempSmartLink) {
          setWebhookAccounts(prev => prev.map(acc => {
              if (acc.id === editingSmartLinkAccountId) {
                  return { ...acc, smartLink: tempSmartLink };
              }
              return acc;
          }));
          setEditingSmartLinkAccountId(null);
          setTempSmartLink(null);
      }
  };

  const moveAccount = (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === webhookAccounts.length - 1) return;
      
      const newAccounts = [...webhookAccounts];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
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
      case AIServiceProvider.GROQ: return <Zap className="w-5 h-5 text-orange-500" />;
      case AIServiceProvider.GEMINI: return <Sparkles className="w-5 h-5 text-blue-400" />;
      case AIServiceProvider.OPENAI: return <Bot className="w-5 h-5 text-emerald-500" />;
      case AIServiceProvider.CLAUDE: return <BrainCircuit className="w-5 h-5 text-amber-600" />;
      case AIServiceProvider.CLOUDFLARE: return <Cloud className="w-5 h-5 text-orange-400" />;
      case AIServiceProvider.OPENROUTER: return <Globe className="w-5 h-5 text-indigo-400" />;
      default: return <Bot className="w-5 h-5" />;
    }
  };

  const getImageHostIcon = (p: ImageHostProvider) => {
      switch(p) {
          case ImageHostProvider.CLOUDINARY: return <Cloud className="w-6 h-6 text-blue-500" />;
          case ImageHostProvider.IMGBB: return <Image className="w-6 h-6 text-pink-500" />;
          case ImageHostProvider.FREEIMAGE: return <Server className="w-6 h-6 text-green-500" />;
          default: return <Image className="w-6 h-6" />;
      }
  };

  return (
    <div className="flex flex-col h-full bg-body overflow-hidden">
        {/* Header */}
        <div className="bg-panel p-5 border-b border-border flex justify-between items-center flex-shrink-0 animate-in fade-in slide-in-from-top-4">
          <div>
            <h2 className="text-xl font-black text-text-main tracking-tight flex items-center gap-2">
               <Cpu className="w-5 h-5 text-accent-purple" />
               Platform Configuration
            </h2>
            <p className="text-xs font-medium text-text-muted mt-0.5 bg-black/5 px-2 py-0.5 rounded inline-block">Manage AI Providers, Remote Automation & Global System Overrides</p>
          </div>
          <button 
             onClick={handleSave} 
             className={`${saveStatus === 'saved' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-accent-blue hover:bg-blue-600'} text-white px-5 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-sm active:scale-95`}
          >
            {saveStatus === 'saving' && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saveStatus === 'saved' && <Check className="w-3.5 h-3.5" />}
            {saveStatus === 'idle' && <Save className="w-3.5 h-3.5" />}
            {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'saved' ? 'SAVED!' : 'APPLY CONFIGURATION'}
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-56 border-r border-border bg-panel p-3 space-y-1">
                <button 
                    onClick={() => setActiveTab('webhooks')}
                    className={`${activeTab === 'webhooks' ? 'bg-card text-text-main shadow-sm border border-border underline decoration-accent-blue decoration-2 underline-offset-4' : 'text-text-muted hover:text-text-main hover:bg-white/5 border border-transparent'} w-full px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2.5`}
                >
                    <Globe className="w-4 h-4" /> Automations & Routing
                </button>
                <button 
                    onClick={() => setActiveTab('ai')}
                    className={`${activeTab === 'ai' ? 'bg-card text-text-main shadow-sm border border-border underline decoration-accent-purple decoration-2 underline-offset-4' : 'text-text-muted hover:text-text-main hover:bg-white/5 border border-transparent'} w-full px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2.5`}
                >
                    <Bot className="w-4 h-4" /> AI Providers
                </button>
                <button 
                    onClick={() => setActiveTab('hosting')}
                    className={`${activeTab === 'hosting' ? 'bg-card text-text-main shadow-sm border border-border underline decoration-pink-500 decoration-2 underline-offset-4' : 'text-text-muted hover:text-text-main hover:bg-white/5 border border-transparent'} w-full px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2.5`}
                >
                    <Image className="w-4 h-4" /> Image Hosting
                </button>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-body">
          
              {/* Automation Accounts Section (IMPROVED) */}
              {activeTab === 'webhooks' && (
              <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4">
                 <div className="flex justify-between items-end border-b border-border pb-3">
                    <div>
                        <h3 className="text-lg font-black text-text-main flex items-center gap-2">
                            <Globe className="w-4 h-4 text-accent-blue" />
                            Workspace Integrations
                        </h3>
                        <p className="text-xs font-semibold text-text-muted mt-0.5">Configure Webhooks (Make/Zapier) and dedicated Smart Routing links.</p>
                    </div>
                 </div>
                 
                 <div className="bg-card border border-border rounded-lg shadow-sm border-t-2 border-t-accent-blue overflow-hidden">
                      {/* Add New */}
                      <div className="p-4 bg-panel border-b border-border flex flex-col gap-3">
                         <label className="text-[10px] font-black text-text-muted uppercase tracking-wider flex items-center gap-1.5"><Plus className="w-3 h-3 text-accent-blue" /> Register New Pipeline</label>
                         <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                             <div className="md:col-span-4">
                                 <input 
                                    type="text" 
                                    value={newAccountName}
                                    onChange={(e) => { setNewAccountName(e.target.value); setSlotError(null); }}
                                    placeholder="Account Name (e.g. My Website)"
                                    className="w-full h-9 bg-card border border-border rounded-md px-3 text-xs text-text-main focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-blue-500/20 shadow-inner"
                                 />
                             </div>
                             <div className="md:col-span-5">
                                 <input 
                                    type="text" 
                                    value={newAccountUrl}
                                    onChange={(e) => { setNewAccountUrl(e.target.value); setSlotError(null); }}
                                    placeholder="Webhook URL (https://...)"
                                    className="w-full h-9 bg-card border border-border rounded-md px-3 text-xs text-text-main focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-blue-500/20 font-mono shadow-inner"
                                 />
                             </div>
                             <div className="md:col-span-3 flex">
                                 <button 
                                    onClick={handleAddAccount}
                                    disabled={!newAccountName || !newAccountUrl}
                                    className="w-full h-9 bg-accent-blue hover:bg-blue-600 text-white font-bold rounded-md text-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10"
                                 >
                                    <Plus className="w-3.5 h-3.5" /> Add Pipeline
                                 </button>
                             </div>
                         </div>
                         {slotError && (
                             <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-md text-[10px] text-orange-400 font-bold flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-200">
                                 <Zap className="w-3 h-3" /> {slotError}
                             </div>
                         )}
                      </div>

                     {/* List (Editable & Reorderable) */}
                     <div className="custom-scrollbar">
                         {webhookAccounts.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center mb-3">
                                    <Globe className="w-6 h-6 text-text-muted opacity-50" />
                                </div>
                                <h4 className="text-sm font-bold text-text-main">No Automations Registered</h4>
                                <p className="text-xs text-text-muted mt-1 max-w-xs">Connect your webhooks above to enable bulk publishing and automatic pinning flows.</p>
                            </div>
                         ) : (
                            webhookAccounts.map((acc, index) => (
                                <div key={acc.id} className="p-3 flex items-start gap-3 border-b border-border last:border-0 hover:bg-white/5 transition-colors group">
                                    
                                    {/* Reordering Arrows */}
                                    <div className="flex flex-col gap-0.5 opacity-20 group-hover:opacity-100 transition-opacity pt-0.5">
                                        <button onClick={() => moveAccount(index, 'up')} disabled={index === 0} className="text-text-muted hover:text-text-main disabled:opacity-30 p-0.5 border border-border rounded hover:bg-card">
                                            <ArrowUp className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => moveAccount(index, 'down')} disabled={index === webhookAccounts.length - 1} className="text-text-muted hover:text-text-main disabled:opacity-30 p-0.5 border border-border rounded hover:bg-card">
                                            <ArrowDown className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {/* Icon & Details */}
                                    <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                                        <Globe className="w-4 h-4 text-accent-blue" />
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                                        {/* Core Details Edit View vs Static View */}
                                        {editingAccountId === acc.id ? (
                                            <div className="flex gap-2 animate-in fade-in bg-card p-2 rounded-md border border-border shadow-sm">
                                                <input 
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-1/3 h-8 bg-panel border border-border rounded px-2 text-xs text-text-main focus:border-accent-blue"
                                                    placeholder="Name"
                                                />
                                                <input 
                                                    value={editUrl}
                                                    onChange={(e) => setEditUrl(e.target.value)}
                                                    className="flex-1 h-8 bg-panel border border-border rounded px-2 text-xs text-text-main focus:border-accent-blue font-mono"
                                                    placeholder="URL"
                                                />
                                                <button onClick={handleSaveEdit} className="text-green-500 hover:text-green-400 bg-green-500/10 px-2 rounded hover:bg-green-500/20"><Check className="w-4 h-4" /></button>
                                                <button onClick={handleCancelEdit} className="text-text-muted hover:text-text-main bg-white/5 px-2 rounded hover:bg-white/10"><X className="w-4 h-4" /></button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center h-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-sm font-bold text-text-main flex items-center gap-2">
                                                        {acc.name}
                                                        {acc.smartLink?.enabled && <span className="bg-accent-purple/20 text-accent-purple text-[9px] px-1.5 py-0.5 rounded border border-accent-purple/30 uppercase tracking-wider font-bold">Smart Routed</span>}
                                                    </div>
                                                    <div className="text-[10px] text-text-muted font-mono truncate max-w-[200px] border-l border-border pl-3">{acc.url}</div>
                                                </div>
                                                
                                                {/* Toolbar Actions */}
                                                <div className="flex gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenSmartLinkEdit(acc)} className="text-text-muted hover:text-accent-purple bg-panel border border-border px-2.5 h-7 rounded-md text-[11px] font-bold flex items-center gap-1.5 shadow-sm hover:shadow-purple-500/10">
                                                        <LinkIcon className="w-3 h-3" /> Smart Link
                                                    </button>
                                                    <button onClick={() => handleStartEdit(acc)} className="text-text-muted hover:text-accent-blue bg-panel border border-border w-7 h-7 flex items-center justify-center rounded-md shadow-sm">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDeleteAccount(acc.id)} className="text-text-muted hover:text-accent-red bg-panel border border-border w-7 h-7 flex items-center justify-center rounded-md shadow-sm">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Smart Link Configuration Sub-Panel (Opened) */}
                                        {editingSmartLinkAccountId === acc.id && tempSmartLink && (
                                            <div className="bg-panel border border-accent-purple/30 rounded-md p-4 mt-2 shadow-sm animate-in slide-in-from-top-2">
                                                <div className="flex justify-between items-center mb-3 border-b border-border pb-2">
                                                    <h4 className="text-[11px] uppercase tracking-wider font-black text-text-main flex items-center gap-1.5">
                                                        <LinkIcon className="w-3.5 h-3.5 text-accent-purple" /> 
                                                        Auto-Smart Link Routing
                                                    </h4>
                                                    <button 
                                                        onClick={() => setTempSmartLink({...tempSmartLink, enabled: !tempSmartLink.enabled})}
                                                        className={`relative w-8 h-4 rounded-full transition-all ${tempSmartLink.enabled ? 'bg-accent-purple shadow-[0_0_8px_rgba(168,85,247,0.3)]' : 'bg-gray-700'}`}
                                                    >
                                                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all ${tempSmartLink.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>

                                                {tempSmartLink.enabled ? (
                                                    <div className="space-y-3 animate-in fade-in">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Platform Preset</label>
                                                                <select 
                                                                    value={tempSmartLink.platform}
                                                                    onChange={(e) => setTempSmartLink({...tempSmartLink, platform: e.target.value as PlatformType})}
                                                                    className="w-full h-8 bg-card border border-border rounded-md px-2 text-xs text-text-main focus:outline-none focus:border-accent-purple appearance-none"
                                                                >
                                                                    <option value="blogger">Blogger</option>
                                                                    <option value="wordpress">WordPress</option>
                                                                    <option value="shopify">Shopify</option>
                                                                    <option value="etsy">Etsy</option>
                                                                    <option value="custom">Custom</option>
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Base Domain URL</label>
                                                                <input
                                                                    type="text"
                                                                    value={tempSmartLink.baseUrl}
                                                                    onChange={(e) => setTempSmartLink({...tempSmartLink, baseUrl: e.target.value})}
                                                                    placeholder="https://mywebsite.com"
                                                                    className="w-full h-8 bg-card border border-border rounded-md px-2 text-xs text-text-main focus:outline-none focus:border-accent-purple font-mono"
                                                                />
                                                            </div>
                                                        </div>

                                                        {tempSmartLink.platform === 'custom' && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Custom Search Path</label>
                                                            <input
                                                                type="text"
                                                                value={tempSmartLink.customPath}
                                                                onChange={(e) => setTempSmartLink({...tempSmartLink, customPath: e.target.value})}
                                                                placeholder="/search?q="
                                                                className="w-full h-8 bg-card border border-border rounded-md px-2 text-xs text-text-main focus:outline-none focus:border-accent-purple font-mono"
                                                            />
                                                        </div>
                                                        )}

                                                        <div className="flex justify-end gap-2 pt-2 border-t border-border mt-2">
                                                            <button onClick={() => setEditingSmartLinkAccountId(null)} className="h-7 px-3 font-bold text-xs text-text-muted hover:text-text-main transition-colors">Cancel</button>
                                                            <button onClick={handleSaveSmartLinkEdit} className="h-7 bg-accent-purple hover:bg-purple-600 text-white px-4 rounded-md font-bold text-xs shadow-sm transition-all flex items-center gap-1.5">
                                                                <Save className="w-3.5 h-3.5" /> Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] text-text-muted italic">Disabled. Uses direct URLs or global overrides.</p>
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setEditingSmartLinkAccountId(null)} className="h-7 px-3 font-bold text-xs text-text-muted hover:text-text-main transition-colors">Cancel</button>
                                                            <button onClick={handleSaveSmartLinkEdit} className="h-7 bg-panel border border-border hover:bg-white/5 text-text-main px-3 rounded-md font-bold text-xs shadow-sm transition-all">
                                                                Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                         )}
                     </div>
                 </div>
              </div>
              )}

              {/* AI Providers Section */}
              {activeTab === 'ai' && (
                  <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4">
                     <div className="flex justify-between items-end border-b border-border pb-3">
                        <div>
                            <h3 className="text-lg font-black text-text-main flex items-center gap-2">
                                <Bot className="w-4 h-4 text-text-main" />
                                Model Orchestration
                            </h3>
                            <p className="text-xs font-semibold text-text-muted mt-0.5">Configure Language Models for intelligent scraping and generation tasks.</p>
                        </div>
                     </div>

                     <div className="grid gap-2">
                       {Object.values(AIServiceProvider).map((p) => {
                          const isActive = activeProvider === p;
                          const key = apiKeys[p] || '';
                          const isCloudflare = p === AIServiceProvider.CLOUDFLARE;
                          const isPollinations = p === AIServiceProvider.POLLINATIONS;

                          let placeholderText = "Enter API Key...";
                          if (p === AIServiceProvider.GEMINI) placeholderText = "Use System Default or Override with Key...";
                          if (isCloudflare) placeholderText = "Cloudflare API Token (Required for AI Images)...";

                          if (isPollinations) return null; // Handled silently

                          return (
                            <div key={p} className={`bg-card rounded-lg border transition-all duration-300 overflow-hidden ${
                                isActive ? 'border-accent-purple bg-accent-purple/5 shadow-none' : 'border-border hover:border-text-muted/30 shadow-none'
                            }`}>
                                <div className="p-3.5 flex flex-col gap-3">
                                    {/* Header Section */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => setActiveProvider(p)} 
                                                className={`flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors focus:outline-none flex-shrink-0 ${
                                                    isActive ? 'border-accent-purple bg-accent-purple/20' : 'border-border hover:border-text-muted bg-panel'
                                                }`}
                                                title="Set as Default Orchestrator"
                                            >
                                                {isActive && <div className="w-2.5 h-2.5 bg-accent-purple rounded-full"></div>}
                                            </button>
                                            <div className={`p-1.5 rounded-lg border border-border flex-shrink-0 bg-panel`}>
                                                {getProviderIcon(p)}
                                            </div>
                                            <span className={`text-sm font-bold tracking-wide ${isActive ? 'text-text-main' : 'text-text-secondary'}`}>{p}</span>
                                        </div>
                                    </div>

                                    {/* Inputs Section */}
                                    <div className="pl-11 flex flex-col gap-2">
                                        <div className="relative w-full">
                                            <input
                                                type="password"
                                                value={key}
                                                onChange={(e) => handleKeyChange(p, e.target.value)}
                                                placeholder={placeholderText}
                                                className={`w-full h-9 bg-panel border rounded-md px-3 text-xs text-text-main placeholder-text-muted/50 focus:outline-none focus:border-text-muted font-mono transition-all ${isActive ? 'border-border shadow-none' : 'border-transparent bg-body'}`}
                                            />
                                        </div>
                                        {/* Cloudflare Extra Field */}
                                        {isCloudflare && (
                                            <div className="relative w-full">
                                                <input
                                                    type="text"
                                                    value={cfAccountId}
                                                    onChange={(e) => setCfAccountId(e.target.value)}
                                                    placeholder="Cloudflare Account ID (Required)"
                                                    className="w-full h-9 bg-panel border border-border rounded-md px-3 text-xs text-text-main placeholder-text-muted/50 focus:outline-none focus:border-text-muted font-mono transition-all shadow-none"
                                                />
                                            </div>
                                        )}
                                        {/* Custom Model Override */}
                                        {isActive && (p === AIServiceProvider.GROQ || p === AIServiceProvider.OPENAI || p === AIServiceProvider.OPENROUTER || isCloudflare) && (
                                            <div className="relative w-full mt-1 animate-in fade-in slide-in-from-top-1 flex items-center gap-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-text-muted flex-shrink-0">Custom Model:</label>
                                                <input
                                                    type="text"
                                                    value={customModelId}
                                                    onChange={(e) => setCustomModelId(e.target.value)}
                                                    placeholder={p === AIServiceProvider.GROQ ? "e.g. meta-llama/llama-3.3-70b-versatile" : "Model Overlay ID"}
                                                    className="w-full h-8 bg-transparent border-b border-border text-xs text-text-main placeholder-text-muted/40 focus:outline-none focus:border-text-secondary font-mono transition-all shadow-none rounded-none px-1"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                          );
                       })}
                     </div>
                  </div>
              )}

              {/* Image Hosting Section */}
              {activeTab === 'hosting' && (
              <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4">
                 <div className="flex justify-between items-end border-b border-border pb-3">
                    <div>
                        <h3 className="text-lg font-black text-text-main flex items-center gap-2">
                            <Image className="w-4 h-4 text-text-main" />
                            Storage Protocol
                        </h3>
                        <p className="text-xs font-semibold text-text-muted mt-0.5">Select where AI generated and scraped assets are permanently stored before distribution.</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                     {Object.values(ImageHostProvider).map(p => (
                         <button
                            key={p}
                            onClick={() => setImgSettings(prev => ({...prev, provider: p}))}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                                imgSettings.provider === p
                                ? 'bg-card border-pink-500 text-text-main shadow-[0_0_10px_rgba(236,72,153,0.1)] shadow-inner transform -translate-y-[1px]'
                                : 'bg-panel border-border text-text-muted hover:text-text-secondary hover:border-text-muted/30'
                            }`}
                         >
                            <div className={`p-2 rounded-lg ${imgSettings.provider === p ? 'bg-pink-500/10' : 'bg-black/20'}`}>
                                {getImageHostIcon(p)}
                            </div>
                            <span className="text-xs font-bold">{p}</span>
                         </button>
                     ))}
                 </div>

                 <div className="bg-card border-l-4 border-l-pink-500 border-t border-r border-b border-border rounded-lg p-4 shadow-sm">
                     {imgSettings.provider === ImageHostProvider.IMGBB && (
                         <div className="space-y-1.5 ">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">ImgBB Access Token</label>
                            <input
                                 type="password"
                                 value={imgSettings.apiKey || ''}
                                 onChange={(e) => setImgSettings(prev => ({...prev, apiKey: e.target.value}))}
                                 placeholder="Enter Private Key from ImgBB Dashboard"
                                 className="w-full h-9 bg-panel border border-border rounded-md px-3 text-xs text-text-main focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20 font-mono"
                            />
                         </div>
                     )}
                     {imgSettings.provider === ImageHostProvider.FREEIMAGE && (
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">FreeImage.host Identity Key</label>
                            <input
                                 type="password"
                                 value={imgSettings.apiKey || ''}
                                 onChange={(e) => setImgSettings(prev => ({...prev, apiKey: e.target.value}))}
                                 placeholder="Enter Key"
                                 className="w-full h-9 bg-panel border border-border rounded-md px-3 text-xs text-text-main focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 font-mono"
                            />
                         </div>
                     )}
                     {imgSettings.provider === ImageHostProvider.CLOUDINARY && (
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Cloud Name Identifier</label>
                                 <input
                                      type="text"
                                      value={imgSettings.cloudName || ''}
                                      onChange={(e) => setImgSettings(prev => ({...prev, cloudName: e.target.value}))}
                                      placeholder="dxyz..."
                                      className="w-full h-9 bg-panel border border-border rounded-md px-3 text-xs text-text-main focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono"
                                 />
                            </div>
                            <div className="space-y-1.5">
                                 <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Unsigned Upload Preset</label>
                                 <input
                                      type="text"
                                      value={imgSettings.uploadPreset || ''}
                                      onChange={(e) => setImgSettings(prev => ({...prev, uploadPreset: e.target.value}))}
                                      placeholder="upload_preset_v1"
                                      className="w-full h-9 bg-panel border border-border rounded-md px-3 text-xs text-text-main focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono"
                                 />
                            </div>
                         </div>
                     )}
                 </div>
              </div>
              )}

            </div>
        </div>
    </div>
  );
};

export default SettingsView;
