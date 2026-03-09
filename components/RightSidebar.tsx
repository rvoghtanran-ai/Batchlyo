import React, { useState } from 'react';
import { Clock, Calendar, Link, Layers, Ghost, Database, Check, Plus, Trash2, Edit2, ChevronRight, ChevronLeft, Settings, Info, Lock, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Board, WebhookAccount } from '../types';

interface RightSidebarProps {
    isStealthMode: boolean;
    setIsStealthMode: (val: boolean) => void;
    userPlan?: string;
    
    destinationLink: string;
    setDestinationLink: (val: string) => void;
    
    boards: Board[];
    selectedBoardId: string;
    setSelectedBoardId: (val: string) => void;
    onManageBoards: () => void;
    
    scheduleTime: string;
    setScheduleTime: (val: string) => void;
    scheduleInterval: number;
    setScheduleInterval: (val: number) => void;
    
    contentPool: string;
    setContentPool: (val: string) => void;
    
    onApplyAll: () => void;
    selectedCount: number;
    
    webhookAccounts: WebhookAccount[];
    activeAccountId: string;

    // Collapse State
    isOpen: boolean;
    onToggle: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
    isStealthMode, setIsStealthMode, userPlan,
    destinationLink, setDestinationLink,
    boards, selectedBoardId, setSelectedBoardId, onManageBoards,
    scheduleTime, setScheduleTime, scheduleInterval, setScheduleInterval,
    contentPool, setContentPool,
    onApplyAll, selectedCount,
    webhookAccounts, activeAccountId,
    isOpen, onToggle
}) => {

    // Group boards by account for display
    const groupedBoards = React.useMemo(() => {
        const groups: { [key: string]: Board[] } = {};
        // Initialize groups for all accounts
        webhookAccounts.forEach(acc => {
            groups[acc.name] = [];
        });
        // Add 'Unsorted' group
        groups['Unsorted'] = [];

        boards.forEach(board => {
            const acc = webhookAccounts.find(a => a.id === board.accountId);
            if (acc && groups[acc.name]) {
                groups[acc.name].push(board);
            } else {
                groups['Unsorted'].push(board);
            }
        });
        return groups;
    }, [boards, webhookAccounts]);

    return (
        <div className={`w-80 border-l border-border bg-panel flex flex-col transition-all duration-300 ease-in-out z-20 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar shadow-2xl ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none absolute right-0'}`}>
            <div className="p-4 flex justify-between items-center border-b border-border shadow-sm">
                <h2 className="text-xs font-extrabold text-text-main uppercase tracking-widest">Settings</h2>
                <button 
                    onClick={onToggle}
                    className="group relative p-2 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
                    title="Minimize Settings"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative bg-card border border-white/10 p-1.5 rounded-lg shadow-sm group-hover:border-indigo-500/50 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all">
                        <PanelRightClose className="w-4 h-4 text-text-muted group-hover:text-indigo-400" />
                    </div>
                </button>
            </div>

            <div className="flex-1 p-4 space-y-6">
                
                {/* Algorithm Optimization Redesigned */}
                <div className={`p-4 rounded-xl border transition-all duration-300 ${isStealthMode ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'bg-card border-border'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${isStealthMode ? 'bg-emerald-500 text-white' : 'bg-main text-text-muted'}`}>
                                <Ghost className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className={`text-sm font-bold ${isStealthMode ? 'text-emerald-600' : 'text-text-main'}`}>Algorithm Optimization</h3>
                                <p className={`text-[10px] ${isStealthMode ? 'text-emerald-600/80' : 'text-text-main/70'}`}>Content Uniqueness</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={isStealthMode} 
                                onChange={(e) => setIsStealthMode(e.target.checked)} 
                                className="sr-only peer" 
                                disabled={userPlan === 'starter'} 
                            />
                            <div className="w-9 h-5 bg-main peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 border border-border"></div>
                        </label>
                    </div>
                    {userPlan === 'starter' && (
                        <div className="mt-3 text-[10px] text-orange-400 flex items-center gap-1.5 bg-orange-500/10 p-2 rounded-lg border border-orange-500/20">
                            <Lock className="w-3 h-3" /> 
                            <span>Upgrade to Pro to enable</span>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="h-px bg-border"></div>

                {/* Bulk Editor Section */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
                        <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                        Bulk Editor
                    </h3>

                    {/* Destination Link */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-text-main uppercase tracking-tight">Destination Link</label>
                        <div className="relative group">
                            <Link className="absolute left-3 top-2.5 w-3.5 h-3.5 text-text-main/60 group-focus-within:text-indigo-600 transition-colors" />
                            <input 
                                type="text" 
                                value={destinationLink}
                                onChange={(e) => setDestinationLink(e.target.value)}
                                placeholder="https://example.com/post"
                                className="w-full bg-card border border-border rounded-lg py-2 pl-9 pr-3 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Board Selector */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-extrabold text-text-main uppercase tracking-tight">Board</label>
                            <button onClick={onManageBoards} className="text-[10px] text-indigo-600 hover:text-indigo-400 font-bold">Manage</button>
                        </div>
                        <div className="relative group">
                            <Layers className="absolute left-3 top-2.5 w-3.5 h-3.5 text-text-main/60 group-focus-within:text-indigo-600 transition-colors" />
                            <select 
                                value={selectedBoardId}
                                onChange={(e) => setSelectedBoardId(e.target.value)}
                                className="w-full bg-card border border-border rounded-lg py-2 pl-9 pr-3 text-xs text-text-main focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 appearance-none transition-all cursor-pointer"
                            >
                                <option value="">Select Board...</option>
                                {Object.entries(groupedBoards).map(([accountName, accountBoards]) => (
                                    accountBoards.length > 0 && (
                                        <optgroup key={accountName} label={accountName}>
                                            {accountBoards.map(board => (
                                                <option key={board.id} value={board.id}>{board.name}</option>
                                            ))}
                                        </optgroup>
                                    )
                                ))}
                            </select>
                            <div className="absolute right-3 top-2.5 pointer-events-none">
                                <ChevronRight className="w-3 h-3 text-text-muted rotate-90" />
                            </div>
                        </div>
                    </div>

                    {/* Schedule Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold text-text-main uppercase tracking-tight">Start Time</label>
                            <div className="relative group">
                                <Clock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-text-main/60 group-focus-within:text-indigo-600 transition-colors" />
                                <input 
                                    type="datetime-local" 
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    className="w-full bg-card border border-border rounded-lg py-2 pl-8 pr-2 text-[10px] text-text-main focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold text-text-main uppercase tracking-tight">Interval (Min)</label>
                            <div className="relative group">
                                <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-text-main/60 group-focus-within:text-indigo-600 transition-colors" />
                                <input 
                                    type="number" 
                                    min="1"
                                    value={scheduleInterval}
                                    onChange={(e) => setScheduleInterval(parseInt(e.target.value) || 1)}
                                    className="w-full bg-card border border-border rounded-lg py-2 pl-8 pr-2 text-[10px] text-text-main focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content Pool */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-extrabold text-text-main uppercase tracking-tight">Content Pool</label>
                            <span className="text-[9px] text-text-main/60 font-bold">One per line</span>
                        </div>
                        <div className="relative group">
                            <Database className="absolute left-3 top-3 w-3.5 h-3.5 text-text-main/60 group-focus-within:text-indigo-600 transition-colors" />
                            <textarea 
                                value={contentPool}
                                onChange={(e) => setContentPool(e.target.value)}
                                placeholder="Title | Description | Link"
                                className="w-full bg-card border border-border rounded-lg py-2 pl-9 pr-3 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all min-h-[100px] resize-y custom-scrollbar"
                            />
                        </div>
                    </div>

                    {/* Apply Button */}
                    <button 
                        onClick={onApplyAll}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 group"
                    >
                        <Check className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        APPLY TO {selectedCount > 0 ? `SELECTED (${selectedCount})` : 'ALL'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RightSidebar;
