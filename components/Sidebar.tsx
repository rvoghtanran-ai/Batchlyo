
import React, { useRef, useState } from 'react';
import { Orbit, Boxes, Dna, Flame, Radar, CloudLightning, HardDriveDownload, SlidersHorizontal, Sparkles, ChevronRight } from 'lucide-react';
import { AspectRatio, WebhookAccount, AIServiceProvider, GlobalSettings } from '../types';

interface SidebarProps {
  activeNavTab: string;
  onNavChange: (tab: string) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeNavTab,
  onNavChange,
  onOpenSettings,
  isOpen,
  onToggle,
}) => {
  return (
    <aside className="w-[240px] border-r border-border bg-panel flex flex-col h-[calc(100vh-80px)] shadow-sm z-10 flex-shrink-0 transition-all duration-300">
      
      <div className="flex-1 py-6 space-y-1">
          {/* Menu Items */}
          <button 
            onClick={() => onNavChange('dashboard')}
            className={`w-full flex items-center px-6 py-3 text-[14px] transition-all group ${activeNavTab === 'dashboard' ? 'text-text-main bg-gradient-to-r from-blue-500/10 to-transparent border-l-4 border-blue-500 font-bold' : 'text-text-muted font-semibold hover:text-text-main hover:bg-white/5 border-l-4 border-transparent'}`}
          >
              <div className="w-5 text-center mr-3"><Orbit className={`w-5 h-5 transition-all ${activeNavTab === 'dashboard' ? 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-blue-500/40 group-hover:text-blue-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]'}`} /></div>
              Dashboard
          </button>
          
          <button 
            onClick={() => onNavChange('workspace')}
            className={`w-full flex items-center px-6 py-3 text-[14px] transition-all group ${activeNavTab === 'workspace' ? 'text-text-main bg-gradient-to-r from-purple-500/10 to-transparent border-l-4 border-purple-500 font-bold' : 'text-text-muted font-semibold hover:text-text-main hover:bg-white/5 border-l-4 border-transparent'}`}
          >
              <div className="w-5 text-center mr-3"><Boxes className={`w-5 h-5 transition-all ${activeNavTab === 'workspace' ? 'text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'text-purple-500/40 group-hover:text-purple-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]'}`} /></div>
              Workspace
          </button>
          
          <button 
            onClick={() => onNavChange('generator')}
            className={`w-full flex items-center px-6 py-3 text-[14px] transition-all group ${activeNavTab === 'generator' ? 'text-text-main bg-gradient-to-r from-emerald-500/10 to-transparent border-l-4 border-emerald-500 font-bold' : 'text-text-muted font-semibold hover:text-text-main hover:bg-white/5 border-l-4 border-transparent'}`}
          >
              <div className="w-5 text-center mr-3"><Dna className={`w-5 h-5 transition-all ${activeNavTab === 'generator' ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'text-emerald-500/40 group-hover:text-emerald-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]'}`} /></div>
              Pin Generator
          </button>
          
          <button 
            onClick={() => onNavChange('keywords')}
            className={`w-full flex items-center px-6 py-3 text-[14px] transition-all group ${activeNavTab === 'keywords' ? 'text-text-main bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 font-bold' : 'text-text-muted font-semibold hover:text-text-main hover:bg-white/5 border-l-4 border-transparent'}`}
          >
              <div className="w-5 text-center mr-3"><Flame className={`w-5 h-5 transition-all ${activeNavTab === 'keywords' ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'text-amber-500/40 group-hover:text-amber-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`} /></div>
              Trending Keywords
          </button>

          <button 
            onClick={() => onNavChange('analysis')}
            className={`w-full flex items-center px-6 py-3 text-[14px] transition-all group ${activeNavTab === 'analysis' ? 'text-text-main bg-gradient-to-r from-rose-500/10 to-transparent border-l-4 border-rose-500 font-bold' : 'text-text-muted font-semibold hover:text-text-main hover:bg-white/5 border-l-4 border-transparent'}`}
          >
              <div className="w-5 text-center mr-3"><Radar className={`w-5 h-5 transition-all ${activeNavTab === 'analysis' ? 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'text-rose-500/40 group-hover:text-rose-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`} /></div>
              Competitor Analysis
          </button>

          <button 
            onClick={() => onNavChange('upload')}
            className={`w-full flex items-center px-6 py-3 text-[14px] transition-all group ${activeNavTab === 'upload' ? 'text-text-main bg-gradient-to-r from-pink-500/10 to-transparent border-l-4 border-pink-500 font-bold' : 'text-text-muted font-semibold hover:text-text-main hover:bg-white/5 border-l-4 border-transparent'}`}
          >
              <div className="w-5 text-center mr-3"><CloudLightning className={`w-5 h-5 transition-all ${activeNavTab === 'upload' ? 'text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]' : 'text-pink-500/40 group-hover:text-pink-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.4)]'}`} /></div>
              Bulk Upload
          </button>

          <button 
            onClick={() => onNavChange('export')}
            className={`w-full flex items-center px-6 py-3 text-[14px] transition-all group ${activeNavTab === 'export' ? 'text-text-main bg-gradient-to-r from-cyan-500/10 to-transparent border-l-4 border-cyan-500 font-bold' : 'text-text-muted font-semibold hover:text-text-main hover:bg-white/5 border-l-4 border-transparent'}`}
          >
              <div className="w-5 text-center mr-3"><HardDriveDownload className={`w-5 h-5 transition-all ${activeNavTab === 'export' ? 'text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-cyan-500/40 group-hover:text-cyan-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]'}`} /></div>
              <span className="flex items-center gap-1.5">CSV Export</span>
          </button>

          <button 
            onClick={() => onNavChange('settings')}
            className={`w-full flex items-center px-6 py-3 text-[14px] transition-all group mt-4 ${activeNavTab === 'settings' ? 'text-text-main bg-gradient-to-r from-gray-500/10 to-transparent border-l-4 border-gray-500 font-bold' : 'text-text-muted font-semibold hover:text-text-main hover:bg-white/5 border-l-4 border-transparent'}`}
          >
              <div className="w-5 text-center mr-3"><SlidersHorizontal className={`w-5 h-5 transition-all ${activeNavTab === 'settings' ? 'text-gray-400 drop-shadow-[0_0_8px_rgba(156,163,175,0.6)]' : 'text-gray-400/40 group-hover:text-gray-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(156,163,175,0.4)]'}`} /></div>
              Settings
          </button>
      </div>

      {/* Get Pro Card */}
      <div className="px-5 mb-8">
          <button 
              onClick={onOpenSettings}
              className="w-full bg-card hover:bg-main border border-border rounded-2xl p-4 flex items-center justify-between group transition-all"
          >
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-yellow/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-accent-yellow" />
                  </div>
                  <div className="text-left">
                      <p className="text-sm font-bold text-text-main">Get Pro</p>
                      <p className="text-[10px] text-text-muted">Free Trial Available</p>
                  </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-main transition-transform group-hover:translate-x-1" />
          </button>
      </div>
    </aside>
  );
};

export default Sidebar;
