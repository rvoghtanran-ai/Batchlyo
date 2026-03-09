import React, { useState, useEffect } from 'react';
import { X, Save, Link as LinkIcon, Globe } from 'lucide-react';
import { PlatformType, SmartLinkSettings } from '../types';

interface SmartLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SmartLinkModal: React.FC<SmartLinkModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<SmartLinkSettings>({
    enabled: false,
    platform: 'blogger',
    baseUrl: '',
    customPath: '/search?q='
  });

  // Load current settings when opened
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('easyPin_smartLink');
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch (e) {}
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('easyPin_smartLink', JSON.stringify(settings));
    onClose();
  };

  const updateSetting = (field: keyof SmartLinkSettings, value: any) => {
     setSettings(prev => ({...prev, [field]: value}));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#15151a] border border-white/10 w-[550px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#0f0f12] p-6 border-b border-white/5 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-accent-blue" />
              Smart-Link Generator
            </h2>
            <p className="text-xs text-gray-400 mt-1">Configure automated destination links</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          <div className="bg-[#0f0f12] rounded-xl border border-white/5 p-5 space-y-4 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-accent-blue"></div>

             <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wide flex items-center gap-2">
                  <Globe className="w-3 h-3 text-accent-blue" />
                  Auto-Link Status
                </label>
                
                {/* Enable Toggle */}
                <button 
                  onClick={() => updateSetting('enabled', !settings.enabled)}
                  className={`relative w-10 h-5 rounded-full transition-all ${settings.enabled ? 'bg-accent-blue' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${settings.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
             </div>

             {settings.enabled ? (
               <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2">
                   {/* Platform & Base URL */}
                   <div className="space-y-3">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-bold text-gray-500 uppercase">Platform Preset</label>
                         <select 
                            value={settings.platform}
                            onChange={(e) => updateSetting('platform', e.target.value as PlatformType)}
                            className="w-full bg-[#15151a] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent-blue"
                         >
                            <option value="blogger">Blogger</option>
                            <option value="wordpress">WordPress</option>
                            <option value="shopify">Shopify</option>
                            <option value="etsy">Etsy</option>
                            <option value="custom">Custom</option>
                         </select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Base Website URL</label>
                        <input
                            type="text"
                            value={settings.baseUrl}
                            onChange={(e) => updateSetting('baseUrl', e.target.value)}
                            placeholder="https://mywebsite.com"
                            className="w-full bg-[#15151a] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent-blue placeholder-gray-600"
                        />
                      </div>
                   </div>

                   {/* Custom Path (Only if Custom) */}
                   {settings.platform === 'custom' && (
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Custom Search Path</label>
                        <input
                            type="text"
                            value={settings.customPath}
                            onChange={(e) => updateSetting('customPath', e.target.value)}
                            placeholder="/search?q="
                            className="w-full bg-[#15151a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-blue font-mono placeholder-gray-600"
                        />
                     </div>
                   )}
                   
                   {/* Preview Info */}
                   <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-lg p-3">
                       <p className="text-[10px] text-blue-300 leading-relaxed flex items-start gap-2">
                         <LinkIcon className="w-3 h-3 flex-shrink-0 mt-0.5" />
                         <span>
                           AI will generate a unique search term for each pin.
                           <br />
                           <span className="opacity-70">Example:</span> 
                           <span className="font-mono text-white ml-1 break-all">
                             {settings.baseUrl || 'https://site.com'}
                             {settings.platform === 'wordpress' ? '/?s=' : 
                              settings.platform === 'custom' ? settings.customPath : '/search?q='}
                             minimalist
                           </span>
                         </span>
                       </p>
                   </div>
               </div>
             ) : (
                <div className="text-center py-4 text-xs text-gray-500 italic">
                    Enable to automatically generate destination links based on AI content.
                </div>
             )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-[#0f0f12] flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-white/5"
          >
            <Save className="w-4 h-4" />
            SAVE CONFIGURATION
          </button>
        </div>

      </div>
    </div>
  );
};

export default SmartLinkModal;