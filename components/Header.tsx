import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Link as LinkIcon, Activity, Zap, FileText, Shield, LogOut, User, ChevronDown, Sparkles, BarChart3, Crown, Sun, Moon, Book, CreditCard, LifeBuoy, MessageSquare, Settings, Search, Bell } from 'lucide-react';
import { Logo } from './Logo';
import { AIServiceProvider, UserProfile } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  currentProvider: AIServiceProvider;
  onReset: () => void;
  onOpenCsvSettings: () => void;
  onOpenAdmin: () => void; 
  stats: {
    requests: number;
    lastLatency: number;
    errors: number;
  };
  user?: FirebaseUser;
  userProfile?: UserProfile | null; // Added detailed profile
  isAdmin?: boolean; 
  onLogout?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentProvider, onReset, onOpenCsvSettings, onOpenAdmin, stats, user, userProfile, isAdmin, onLogout, isDarkMode, onToggleTheme }) => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Helper to color code latency
  const getLatencyColor = (ms: number) => {
    if (ms === 0) return 'text-text-muted';
    if (ms < 1000) return 'text-green-400';
    if (ms < 3000) return 'text-yellow-400';
    return 'text-red-400';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Usage Calculations
  const plan = userProfile?.subscription?.plan || 'starter';
  const usageCount = userProfile?.usage?.exportedPins || 0;
  
  let limit = 50;
  if (plan === 'pro') limit = 1000;
  if (plan === 'agency') limit = 10000;
  
  const percentage = Math.min(100, (usageCount / limit) * 100);

  const getPlanBadge = () => {
      switch(plan) {
          case 'agency': return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1"><Crown className="w-3 h-3" /> AGENCY</span>;
          case 'pro': return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1"><Sparkles className="w-3 h-3" /> PRO</span>;
          default: return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">STARTER</span>;
      }
  };

  return (
    <header className="h-20 bg-main flex items-center justify-between px-6 sticky top-0 z-50 transition-colors duration-300">
      
      {/* Left: Logo Area */}
      <div 
        className="flex items-center gap-3 cursor-pointer group w-64" 
        onClick={() => window.location.href = '/'}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center relative overflow-hidden">
          {/* Mocking the leaf/apple logo from screenshot */}
          <div className="absolute inset-0 bg-accent-green opacity-20"></div>
          <Sparkles className="w-5 h-5 text-accent-green" />
        </div>
        <h1 className="text-lg font-bold text-text-main">
          Batchlyo <span className="font-medium text-text-muted">Dashboard</span>
        </h1>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-2xl px-8">
          <div className="flex items-center bg-panel border border-border shadow-sm rounded-xl px-4 py-2.5">
              <Search className="w-5 h-5 text-text-main/70 mr-3" />
              <input 
                  type="text" 
                  placeholder="Search keywords, boards, or pins..." 
                  className="w-full bg-transparent border-none outline-none text-sm font-medium text-text-main placeholder:text-text-muted"
              />
              <button className="p-1 rounded-md hover:bg-main text-text-muted transition-colors">
                  X
              </button>
          </div>
      </div>

      {/* Right: Credits, Notifications, Profile */}
      <div className="flex items-center gap-6">
        
        {/* Credits Counter */}
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-main">
                Credits: <span className="font-bold">{usageCount.toLocaleString()}</span> <span className="text-text-muted">/ {plan === 'agency' ? '∞' : limit.toLocaleString()}</span>
            </span>
            <button 
                onClick={() => navigate('/pricing')}
                className="w-6 h-6 rounded-md bg-main hover:bg-border flex items-center justify-center text-text-muted transition-colors border border-border"
            >
                +
            </button>
        </div>

        {/* Action Icons (Replacing the old messy settings) */}
        <div className="flex items-center gap-2">
            <button className="p-2 text-text-muted hover:text-text-main transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-yellow rounded-full border-2 border-main"></span>
            </button>
        </div>
        
        {/* Separator */}
        <div className="h-8 w-[1px] bg-border mx-2"></div>

        {/* User Profile / Dropdown */}
        {user && onLogout && (
            <div className="relative" ref={profileRef}>
                <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2.5 p-1 h-10 rounded-full transition-all group border border-border/50 bg-card/30 backdrop-blur-sm hover:bg-card/80 hover:border-indigo-500/50 shadow-sm"
                >
                    <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-black text-white border border-white/20 shadow-lg group-hover:scale-105 transition-transform duration-300 ring-2 ring-indigo-500/10">
                            {user.email?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-panel rounded-full shadow-sm"></div>
                    </div>
                    <div className="text-left hidden sm:block pr-1">
                        <p className="text-[11px] font-black text-text-main leading-tight tracking-tight">{user.displayName || 'Account'}</p>
                        <div className="flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                            <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">{plan}</p>
                        </div>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 mr-1 text-text-muted group-hover:text-text-main transition-all duration-300 ${isProfileOpen ? 'rotate-180 translate-y-[-1px]' : ''}`} />
                </button>

                {isProfileOpen && (
                    <div className="absolute top-[calc(100%+8px)] right-0 w-72 bg-panel border border-border/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in zoom-in slide-in-from-top-2 duration-300 z-[100] origin-top-right backdrop-blur-xl">
                        
                        {/* User Info Header - Premium Design */}
                        <div className="p-5 border-b border-border/50 relative overflow-hidden group/header">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl"></div>
                            
                            <div className="flex justify-between items-start relative z-10">
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-black text-text-main tracking-tight">{user.displayName || 'User'}</h4>
                                    <p className="text-[10px] text-text-muted font-medium break-all opacity-80">{user.email}</p>
                                </div>
                                <div className="hover:scale-110 transition-transform duration-300">
                                    {getPlanBadge()}
                                </div>
                            </div>
                            
                            {/* Usage Bar - Redesigned */}
                            <div className="mt-5 relative z-10">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.1em] text-text-muted mb-2 px-0.5">
                                    <span className="flex items-center gap-1.5"><BarChart3 className="w-2.5 h-2.5" /> Usage</span>
                                    <span className="text-text-main">{usageCount} / {plan === 'agency' ? '∞' : limit}</span>
                                </div>
                                <div className="h-2 w-full bg-border/40 rounded-full overflow-hidden p-[1.5px] border border-border/20 shadow-inner">
                                    <div 
                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_10px_rgba(99,102,241,0.4)] transition-all duration-1000 ease-out relative overflow-hidden group-hover/header:brightness-110" 
                                        style={{ width: `${percentage}%` }}
                                    >
                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] w-full h-full animate-[shimmer_2s_infinite]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Menu Items */}
                        <div className="p-2 space-y-0.5 max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar overscroll-behavior-contain" style={{ scrollbarGutter: 'stable' }}>
                            <p className="px-3 py-2 text-[10px] font-black text-text-muted uppercase tracking-widest opacity-50">General</p>
                            
                            {isAdmin && (
                                <button 
                                    onClick={() => { onOpenAdmin(); setIsProfileOpen(false); }}
                                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-white hover:bg-red-500/10 flex items-center gap-3 transition-all group"
                                >
                                    <div className="p-2 rounded-lg bg-red-500/5 group-hover:bg-red-500/20 text-red-500 transition-colors border border-red-500/10">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <span>Admin Console</span>
                                </button>
                            )}

                            <button 
                                onClick={() => { navigate('/pricing'); setIsProfileOpen(false); }}
                                className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-white hover:bg-indigo-500/5 flex items-center gap-3 transition-all group border border-transparent hover:border-border/50"
                            >
                                <div className="p-2 rounded-lg bg-card group-hover:bg-indigo-500/10 text-text-muted group-hover:text-indigo-400 transition-colors border border-border/40 group-hover:border-indigo-500/20">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="leading-none">Billing & Subscription</p>
                                    <p className="text-[9px] text-text-muted font-normal mt-1 opacity-70">Manage your payments</p>
                                </div>
                            </button>

                            <p className="px-3 py-2 mt-2 text-[10px] font-black text-text-muted uppercase tracking-widest opacity-50">Preferences</p>
                            
                            {onToggleTheme && (
                                <button 
                                    onClick={onToggleTheme}
                                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-white hover:bg-card flex items-center gap-3 transition-all group border border-transparent"
                                >
                                    <div className="p-2 rounded-lg bg-card text-text-muted group-hover:bg-yellow-500/10 group-hover:text-yellow-500 transition-colors border border-border/40">
                                        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                    </div>
                                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                                </button>
                            )}

                            <p className="px-3 py-2 mt-2 text-[10px] font-black text-text-muted uppercase tracking-widest opacity-50">Support</p>

                            <button 
                                onClick={() => { navigate('/docs'); setIsProfileOpen(false); }}
                                className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-white hover:bg-indigo-500/5 flex items-center gap-3 transition-all group border border-transparent hover:border-border/50"
                            >
                                <div className="p-2 rounded-lg bg-card group-hover:bg-indigo-500/10 text-text-muted group-hover:text-indigo-400 transition-colors border border-border/40">
                                    <Book className="w-4 h-4" />
                                </div>
                                <span>Documentation</span>
                            </button>

                            <button 
                                onClick={() => { navigate('/support'); setIsProfileOpen(false); }}
                                className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-white hover:bg-indigo-500/5 flex items-center gap-3 transition-all group border border-transparent hover:border-border/50"
                            >
                                <div className="p-2 rounded-lg bg-card group-hover:bg-indigo-500/10 text-text-muted group-hover:text-indigo-400 transition-colors border border-border/40">
                                    <LifeBuoy className="w-4 h-4" />
                                </div>
                                <span>Support Center</span>
                            </button>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-3 bg-card/50 border-t border-border/50 backdrop-blur-sm">
                            <button 
                                onClick={() => { onLogout(); setIsProfileOpen(false); }}
                                className="w-full py-2.5 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-red-500/10 via-red-500/20 to-red-500/10 border border-red-500/30 hover:border-red-500 hover:from-red-500 hover:to-red-600 transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-red-900/10"
                            >
                                <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                                Sign Out Account
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </header>
  );
};

export default Header;
