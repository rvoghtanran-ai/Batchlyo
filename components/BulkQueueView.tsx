import React, { useRef, useState } from 'react';
import { 
    CheckSquare, Square, Trash2, Eraser, RefreshCw, StopCircle, 
    Sparkles, Lock, Wand2, Globe, ChevronDown, Loader2, Settings, 
    Sheet, Download, FileJson, CheckCircle2, AlertTriangle, Layers, Tag, X 
} from 'lucide-react';
import PinCard from './PinCard';
import { Pin, Board, WebhookAccount, UserProfile } from '../types';

interface BulkQueueViewProps {
    filterBoard: string;
    setFilterBoard: (val: string) => void;
    displayedPins: Pin[];
    allSelected: boolean;
    handleSelectAll: () => void;
    selectedCount: number;
    handleDeleteSelected: () => void;
    handleClearInfo: () => void;
    isProcessingAI: boolean;
    errorCount: number;
    handleToggleAutoAI: (retry?: boolean) => void;
    handleSpinContent: () => void;
    pins: Pin[];
    isSpinning: boolean;
    isAdmin: boolean;
    userProfile?: UserProfile;
    activeAccountId: string;
    setActiveAccountId: (id: string) => void;
    webhookMenuRef: React.RefObject<HTMLDivElement>;
    isSendingWebhook: boolean;
    handleCancelExport: () => void;
    showWebhookMenu: boolean;
    setShowWebhookMenu: (val: boolean) => void;
    webhookAccounts: WebhookAccount[];
    onOpenSettings: () => void;
    selectedWebhookId: string;
    setSelectedWebhookId: (val: string) => void;
    handleSendToWebhook: () => void;
    exportMenuRef: React.RefObject<HTMLDivElement>;
    isExportingCsv: boolean;
    showExportMenu: boolean;
    setShowExportMenu: (val: boolean) => void;
    handleExport: (format: 'default' | 'publer' | 'json' | 'custom') => void;
    activeTab: 'all' | 'ready' | 'error' | 'draft';
    setActiveTab: (val: 'all' | 'ready' | 'error' | 'draft') => void;
    readyCount: number;
    availableBoards: string[];
    groupedPins: Record<string, Pin[]>;
    visiblePins: Pin[];
    handleDeletePin: (id: string) => void;
    handleToggleSelect: (id: string) => void;
    handleEditPin: (pin: Pin) => void;
    visibleCount: number;
    setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
    activeKeywords?: string[];
    onClearKeywords?: () => void;
}

export const BulkQueueView: React.FC<BulkQueueViewProps> = ({
    filterBoard, setFilterBoard, displayedPins, allSelected, handleSelectAll,
    selectedCount, handleDeleteSelected, handleClearInfo, isProcessingAI,
    errorCount, handleToggleAutoAI, handleSpinContent, pins, isSpinning,
    isAdmin, userProfile, activeAccountId, setActiveAccountId, webhookMenuRef, isSendingWebhook,
    handleCancelExport, showWebhookMenu, setShowWebhookMenu, webhookAccounts,
    onOpenSettings, selectedWebhookId, setSelectedWebhookId,
    handleSendToWebhook, exportMenuRef, isExportingCsv, showExportMenu,
    setShowExportMenu, handleExport, activeTab, setActiveTab, readyCount,
    availableBoards, groupedPins, visiblePins, handleDeletePin, handleToggleSelect,
    handleEditPin, visibleCount, setVisibleCount,
    activeKeywords, onClearKeywords
}) => {
    const parentRef = useRef<HTMLDivElement>(null);

    // --- Pagination Logic ---
    const PAGE_SIZE = 50;
    const [currentPage, setCurrentPage] = useState(1);
    
    // Ensure we reset to page 1 if filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filterBoard]);

    const totalPages = Math.ceil(displayedPins.length / PAGE_SIZE);
    
    // Safety check bound pg
    const safePage = Math.max(1, Math.min(currentPage, totalPages || 1));
    const paginatedPins = displayedPins.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const handleNextPage = () => {
        if (safePage < totalPages) setCurrentPage(p => p + 1);
        if (parentRef.current) parentRef.current.scrollTo(0,0);
    };

    const handlePrevPage = () => {
        if (safePage > 1) setCurrentPage(p => p - 1);
        if (parentRef.current) parentRef.current.scrollTo(0,0);
    };

    return (
        <>
            {/* Active Keywords Banner */}
            {activeKeywords && activeKeywords.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-3">
                    <Tag className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block mb-1">Active Keywords</span>
                        <div className="flex flex-wrap gap-1.5">
                            {activeKeywords.map((kw, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-300">
                                    #{kw.replace(/\s+/g, '')}
                                </span>
                            ))}
                        </div>
                    </div>
                    {onClearKeywords && (
                        <button onClick={onClearKeywords}
                            title="Remove all injected keywords from your pins"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-[9px] font-black uppercase transition-all border border-rose-500/20 flex-shrink-0">
                            <X className="w-3 h-3" /> Clear
                        </button>
                    )}
                </div>
            )}

            <div className="sticky top-0 z-40 bg-main/95 backdrop-blur-md pb-3 pt-2 -mx-2 px-4 border-b border-border shadow-sm mb-6 space-y-3 transition-colors duration-300">
                
                {/* Top Row: Title, Select All, Delete/Clear, and Action Buttons */}
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h2 className="text-lg font-extrabold text-text-main tracking-tight flex items-center gap-2">
                      Bulk Queue
                    </h2>
                    <div className="h-4 w-[1px] bg-border hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                      {displayedPins.length > 0 && (
                          <button 
                          onClick={handleSelectAll}
                          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-main transition-colors bg-card px-3 py-1.5 rounded-lg border border-border hover:border-text-muted shadow-sm"
                          >
                          {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-text-muted" />}
                          {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                      )}
                      {selectedCount > 0 && (
                          <>
                              <button 
                                  onClick={handleDeleteSelected}
                                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-white transition-colors bg-red-500/10 px-2 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500"
                              >
                                  <Trash2 className="w-3 h-3" />
                                  Delete ({selectedCount})
                              </button>
                              <button 
                                  onClick={handleClearInfo}
                                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-400 hover:text-white transition-colors bg-orange-500/10 px-2 py-1.5 rounded-lg border border-orange-500/20 hover:bg-orange-500"
                                  title="Reset pin data to draft"
                              >
                                  <Eraser className="w-3 h-3" />
                                  Clear
                              </button>
                          </>
                      )}
                    </div>
                  </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                    {!isProcessingAI && errorCount > 0 && (
                        <button 
                            onClick={() => handleToggleAutoAI(true)}
                            className="h-9 px-4 rounded-xl font-bold text-[11px] bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 flex items-center gap-1.5 animate-in fade-in transition-colors border border-orange-500/20"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retry ({errorCount})
                        </button>
                    )}
                    <button 
                        onClick={handleSpinContent}
                        disabled={!(selectedCount > 0 || (pins.length > 0 && !isSpinning)) || (!isAdmin && (userProfile?.usage?.remixUsage?.[activeAccountId || 'global'] || 0) >= 1)}
                        className={`
                          h-9 px-4 rounded-xl font-bold text-[12px] flex items-center gap-1.5 transition-all outline-none border
                          ${isSpinning 
                            ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse' 
                            : !isAdmin && (userProfile?.usage?.remixUsage?.[activeAccountId || 'global'] || 0) >= 1
                              ? 'bg-panel border-border shadow-sm text-text-muted cursor-not-allowed'
                              : 'bg-amber-500 hover:bg-amber-400 text-white shadow-md shadow-amber-500/20 border-transparent'
                          }
                          disabled:bg-panel disabled:border-border disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed
                        `}
                        title={!isAdmin && (userProfile?.usage?.remixUsage?.[activeAccountId || 'global'] || 0) >= 1 ? "You've used your one-time remix for this account." : "Remix pins"}
                    >
                      {!isAdmin && (userProfile?.usage?.remixUsage?.[activeAccountId || 'global'] || 0) >= 1 ? <Lock className="w-4 h-4 text-text-muted" /> : isSpinning ? <StopCircle className="w-4 h-4 animate-pulse text-red-500" /> : <Sparkles className="w-4 h-4 text-white" />}
                      {!isAdmin && (userProfile?.usage?.remixUsage?.[activeAccountId || 'global'] || 0) >= 1 ? 'Used' : 'Remix'}
                    </button>
                    <button 
                        onClick={() => handleToggleAutoAI(false)}
                        disabled={pins.length === 0}
                        className={`
                          h-9 px-4 rounded-xl font-bold text-[12px] flex items-center gap-1.5 transition-all outline-none border
                          ${isProcessingAI 
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30' 
                            : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-md shadow-indigo-500/20 border-transparent'
                          }
                          disabled:bg-panel disabled:text-text-muted disabled:border-border disabled:shadow-none disabled:cursor-not-allowed disabled:from-panel disabled:to-panel
                        `}
                    >
                      {isProcessingAI ? (
                          <>
                            <StopCircle className="w-4 h-4 animate-pulse text-red-500" />
                            Stop
                          </>
                      ) : (
                          <>
                            <Wand2 className="w-4 h-4 text-white" />
                            Auto-Fill
                          </>
                      )}
                    </button>
                    <div className="relative" ref={webhookMenuRef}>
                          <button 
                              onClick={isSendingWebhook ? handleCancelExport : () => setShowWebhookMenu(!showWebhookMenu)}
                              disabled={pins.length === 0 || isExportingCsv} 
                              className={`h-9 px-4 rounded-xl font-bold text-[12px] flex items-center gap-1.5 transition-all outline-none border ${
                                  isSendingWebhook
                                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/20 border-transparent'
                              } disabled:bg-panel disabled:border-border disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed`}
                          >
                              {isSendingWebhook ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                    Sending...
                                  </>
                              ) : (
                                  <>
                                    <Globe className="w-4 h-4 text-white" />
                                    Webhook
                                    <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-50" />
                                  </>
                              )}
                          </button>
                          {showWebhookMenu && !isSendingWebhook && (
                               <div className="absolute top-full right-0 mt-2 w-60 bg-[#1a1a20] border border-white/10 rounded-lg shadow-xl z-50 p-2 animate-in fade-in zoom-in duration-200">
                                   {webhookAccounts.length === 0 ? (
                                       <div className="flex flex-col items-center justify-center py-4 text-center">
                                           <p className="text-[11px] text-text-muted font-bold uppercase mb-2">No Accounts Found</p>
                                           <button
                                               onClick={() => {
                                                   setShowWebhookMenu(false);
                                                   onOpenSettings();
                                               }}
                                               className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-2"
                                           >
                                               <Settings className="w-3 h-3" />
                                               Settings
                                           </button>
                                       </div>
                                   ) : (
                                       <>
                                          <p className="text-[11px] text-text-muted font-bold uppercase mb-2 px-2">Select Destination</p>
                                          <div className="space-y-1 mb-3 max-h-40 overflow-y-auto custom-scrollbar">
                                              {webhookAccounts.map(acc => (
                                                  <button
                                                      key={acc.id}
                                                      onClick={() => setSelectedWebhookId(acc.id)}
                                                      className={`w-full text-left px-3 py-2.5 rounded-md text-[12px] font-bold border transition-all flex items-center justify-between group ${
                                                          selectedWebhookId === acc.id 
                                                          ? 'bg-emerald-500/20 border-emerald-500/50 text-white' 
                                                          : 'bg-card border-border text-text-muted hover:border-text-muted hover:text-text-main'
                                                      }`}
                                                  >
                                                      <span className="truncate">{acc.name}</span>
                                                      {acc.url.includes('script.google.com') ? (
                                                          <Sheet className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                      ) : (
                                                          <Globe className="w-3 h-3 text-gray-500 group-hover:text-emerald-500 flex-shrink-0" />
                                                      )}
                                                  </button>
                                              ))}
                                          </div>
                                          <button
                                              onClick={handleSendToWebhook}
                                              disabled={!selectedWebhookId}
                                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-md text-[10px] font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                                          >
                                              <Globe className="w-3 h-3" />
                                              SEND DATA
                                          </button>
                                       </>
                                   )}
                               </div>
                          )}
                    </div>
                    <div className="relative" ref={exportMenuRef}>
                        <button 
                          onClick={isExportingCsv ? handleCancelExport : () => setShowExportMenu(!showExportMenu)}
                          disabled={pins.length === 0 || isSendingWebhook}
                          className={`h-9 px-4 rounded-xl font-bold text-[12px] flex items-center gap-1.5 transition-all outline-none border ${
                              isExportingCsv
                              ? 'bg-red-500/10 border-red-500/30 text-red-500'
                              : 'bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-500/20 border-transparent'
                          } disabled:bg-panel disabled:border-border disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed`}
                        >
                          {isExportingCsv ? (
                            <>
                               <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                               Processing...
                            </>
                          ) : (
                            <>
                               Export
                               <Download className="w-4 h-4 ml-1 text-white" />
                            </>
                          )}
                        </button>
                        {showExportMenu && !isExportingCsv && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-panel border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                                <button onClick={() => handleExport('default')} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-text-main hover:bg-white/5 border-b border-border/50">Standard CSV</button>
                                <button onClick={() => handleExport('publer')} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-text-main hover:bg-white/5 border-b border-border/50 flex flex-col"><span>Publer Strict</span><span className="text-[10px] text-text-muted">Automation Ready</span></button>
                                <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-text-main hover:bg-white/5 border-b border-border/50 flex items-center gap-2"><FileJson className="w-4 h-4 text-amber-500" /> JSON (Raw Data)</button>
                                <button onClick={() => handleExport('custom')} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-text-main hover:bg-white/5">Custom Format</button>
                            </div>
                        )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t border-border/50 pt-3">
                    {/* Status Tabs */}
                    <div className="flex bg-card p-1 rounded-[14px] border border-border shadow-sm">
                        <button onClick={() => setActiveTab('all')} className={`px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-1.5 ${activeTab === 'all' ? 'bg-main text-text-main shadow-sm border border-border/50' : 'text-text-muted hover:text-text-main hover:bg-main/50'}`}>All Pins <span className="opacity-70 text-[10px]">({pins.length})</span></button>
                        <button onClick={() => setActiveTab('ready')} className={`px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-1.5 ${activeTab === 'ready' ? 'bg-emerald-500/10 text-emerald-600 shadow-sm border border-emerald-500/20' : 'text-text-muted hover:text-text-main hover:bg-main/50'}`}><CheckCircle2 className="w-3.5 h-3.5" /> Ready <span className="opacity-70 text-[10px]">({readyCount})</span></button>
                        <button onClick={() => setActiveTab('error')} className={`px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-1.5 ${activeTab === 'error' ? 'bg-red-500/10 text-red-600 shadow-sm border border-red-500/20' : 'text-text-muted hover:text-text-main hover:bg-main/50'}`}><AlertTriangle className="w-3.5 h-3.5" /> Errors <span className="opacity-70 text-[10px]">({errorCount})</span></button>
                    </div>
                    
                    <div className="h-4 w-[1px] bg-border hidden md:block"></div>

                    {/* Board Filter */}
                    {pins.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar flex-nowrap pb-1">
                          <button onClick={() => setFilterBoard('ALL')} className={`shrink-0 px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all border flex items-center gap-1.5 ${filterBoard === 'ALL' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-sm' : 'bg-card border-border text-text-muted hover:text-text-main hover:bg-main'}`}><Layers className="w-3.5 h-3.5 text-blue-500" /> All Boards</button>
                          {availableBoards.map(b => (
                              <button key={b} onClick={() => setFilterBoard(b)} className={`shrink-0 px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all border flex items-center gap-1.5 ${filterBoard === b ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-sm' : 'bg-transparent border-border/50 text-text-muted hover:text-text-main hover:bg-main hover:border-border'}`}>{b === 'Unsorted' ? 'Unsorted' : b} <span className="opacity-70 text-[10px]">({groupedPins[b].length})</span></button>
                          ))}
                      </div>
                    )}
                </div>

                 {/* ACCOUNT SELECTOR */}
                 {webhookAccounts.length > 0 && (
                     <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar w-full bg-card border border-border/80 rounded-[14px] px-2 py-1.5 shadow-sm mb-4">
                         <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar flex-nowrap w-full">
                             <button
                                 onClick={() => setActiveAccountId('')}
                                 className={`shrink-0 px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2 ${!activeAccountId ? 'bg-blue-500/10 text-blue-800 border-blue-500/30' : 'bg-transparent text-text-muted hover:text-text-main hover:bg-main hover:border-border/50'} border border-transparent`}
                             >
                                 <Globe className="w-3.5 h-3.5 opacity-70" /> All Accounts
                             </button>
                             {webhookAccounts.map(account => (
                                 <button
                                     key={account.id}
                                     onClick={() => setActiveAccountId(account.id)}
                                     className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border ${activeAccountId === account.id ? 'bg-blue-500/10 text-blue-800 border-blue-500/30' : 'bg-transparent border-transparent text-text-muted hover:border-border/50 hover:text-text-main hover:bg-main'}`}
                                 >
                                     <div className="w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center font-serif font-bold text-[10px] shadow-sm">P</div>
                                     <span className="opacity-90">@{account.name}</span>
                                 </button>
                             ))}
                         </div>
                     </div>
                 )}
                 {webhookAccounts.length === 0 && (
                     <div className="pt-2">
                       <span className="text-[10px] text-text-muted italic px-2">No integrations added. Manage linked accounts in Settings.</span>
                     </div>
                 )}

            </div>

            {pins.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-text-muted border border-dashed border-border/50 rounded-3xl bg-card/30 backdrop-blur-sm">
                 <div className="w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center mb-6 border border-white/5 shadow-2xl shadow-blue-900/10">
                     <Sparkles className="w-10 h-10 text-blue-400" />
                 </div>
                 <h3 className="text-2xl font-bold text-white mb-2">Your Queue is Empty</h3>
                 <p className="text-sm mt-2 max-w-md text-center text-text-muted leading-relaxed mb-8">
                     Ready to dominate? Enter a URL to scrape images, or upload your own assets to start the automation engine.
                 </p>
                 <div className="flex gap-4">
                     <button onClick={() => document.getElementById('url-input')?.focus()} className="px-6 py-3 bg-accent-blue hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/20">
                         Start Scraping
                     </button>
                     <button onClick={() => document.getElementById('file-upload')?.click()} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-sm transition-all">
                         Upload Files
                     </button>
                 </div>
              </div>
            ) : (
              <div className="pb-20 bg-panel border border-border rounded-2xl p-6 shadow-sm mb-8 relative">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-text-main tracking-tight">Generated Pins Queue</h2>
                      <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-text-muted bg-main px-3 py-1 rounded-full border border-border">Total: {displayedPins.length}</span>
                      </div>
                  </div>
                  <div 
                      ref={parentRef} 
                      className="h-[650px] overflow-auto rounded-xl custom-scrollbar pr-2 pb-10"
                  >
                      {paginatedPins.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 animate-in fade-in duration-300">
                              {paginatedPins.map(pin => (
                                  <PinCard 
                                    key={pin.id} 
                                    pin={pin} 
                                    onDelete={handleDeletePin} 
                                    onToggleSelect={handleToggleSelect} 
                                    onEdit={handleEditPin} 
                                  />
                              ))}
                          </div>
                      ) : (
                          <div className="py-20 text-center text-text-muted">No pins match the current filter.</div>
                      )}
                      
                      {/* Pagination Controls Footer */}
                      {totalPages > 1 && (
                          <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
                             <div className="text-sm text-text-muted font-semibold">
                                Showing {(safePage - 1) * PAGE_SIZE + 1} to {Math.min(safePage * PAGE_SIZE, displayedPins.length)} of {displayedPins.length}
                             </div>
                             <div className="flex items-center gap-2">
                                <button 
                                  onClick={handlePrevPage} 
                                  disabled={safePage === 1}
                                  className="px-4 py-2 rounded-lg bg-card border border-border text-text-main font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-all"
                                >
                                  Previous
                                </button>
                                <span className="px-3 py-2 text-sm font-bold text-text-main bg-main rounded-lg border border-border">
                                  Page {safePage} of {totalPages}
                                </span>
                                <button 
                                  onClick={handleNextPage} 
                                  disabled={safePage === totalPages}
                                  className="px-4 py-2 rounded-lg bg-card border border-border text-text-main font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-all"
                                >
                                  Next
                                </button>
                             </div>
                          </div>
                      )}
                  </div>
               </div>
             )}
        </>
    );
};
