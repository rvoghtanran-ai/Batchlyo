import React from 'react';
import { Sparkles, Wand2, Loader2, ImageIcon, Trash2, ArrowRight } from 'lucide-react';
import { AspectRatio, AIServiceProvider } from '../types';

interface AIStudioViewProps {
    prompt: string;
    setPrompt: (value: string) => void;
    aspectRatio: AspectRatio;
    setAspectRatio: React.Dispatch<React.SetStateAction<AspectRatio>>;
    imageProvider: AIServiceProvider;
    setImageProvider: React.Dispatch<React.SetStateAction<AIServiceProvider>>;
    imgCount: number;
    setImgCount: (value: number) => void;
    handleGenerateImages: () => void;
    isGenerating: boolean;
    pendingImages: string[];
    setPendingImages: React.Dispatch<React.SetStateAction<string[]>>;
    handleConfirmImport: (images: string[], clearPending?: boolean) => void;
    isImporting: boolean;
}

export const AIStudioView: React.FC<AIStudioViewProps> = ({
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    imageProvider,
    setImageProvider,
    imgCount,
    setImgCount,
    handleGenerateImages,
    isGenerating,
    pendingImages,
    setPendingImages,
    handleConfirmImport,
    isImporting
}) => {
    return (
        <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500 h-full w-full bg-body overflow-hidden">
            <div className="relative z-10 h-full flex flex-col p-4 sm:p-5">
                
                {/* Header */}
                <div className="mb-4 flex items-center gap-3 shrink-0">
                    <Sparkles className="w-8 h-8 text-accent-purple" />
                    <div>
                        <h2 className="text-2xl font-black text-text-main tracking-tight flex items-center gap-2">
                            PinForge <span className="text-accent-purple">Pro</span>
                        </h2>
                        <p className="text-[13px] font-bold text-text-muted mt-0.5">Generate high-converting Pinterest assets using AI.</p>
                    </div>
                </div>
                
                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                    
                    {/* Left Column - Controls */}
                    <div className="lg:col-span-4 flex flex-col min-h-0 gap-4">
                        {/* Master Prompt */}
                        <div className="flex flex-col shrink-0 gap-1.5">
                            <label className="text-[14px] font-black text-text-main">
                                Master Prompt
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Generate high-converting cozy cabin, autumn pins, hearth..."
                                className="w-full h-24 bg-card rounded-2xl p-3.5 text-[14px] font-bold leading-relaxed text-text-main focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/50 transition-all resize-none shadow-inner placeholder:text-text-muted/50 border border-border outline-none"
                            />
                        </div>
                        
                        {/* Canvas Ratio */}
                        <div className="flex flex-col shrink-0 gap-1.5">
                             <label className="text-[14px] font-black text-text-main">Canvas Ratio</label>
                             <div className="flex flex-wrap gap-2">
                                {[
                                    { val: '1:1', label: '1:1' },
                                    { val: '3:4', label: '3:4' },
                                    { val: '3:5', label: '3:5' },
                                    { val: '9:16', label: '9:16' },
                                    { val: '16:9', label: '16:9' }
                                ].map((ratio) => (
                                    <button 
                                        key={ratio.val}
                                        onClick={() => setAspectRatio(ratio.val as AspectRatio)}
                                        className={`relative px-4 py-2 rounded-xl font-bold text-[13px] transition-all flex items-center justify-center shadow-sm border ${
                                            aspectRatio === ratio.val 
                                            ? 'bg-accent-purple text-white border-accent-purple' 
                                            : 'bg-panel text-text-main hover:bg-card border-border'
                                        }`}
                                    >
                                        {ratio.label}
                                        {aspectRatio === ratio.val && (
                                            <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-card shadow-sm z-10">
                                                <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dropdowns */}
                        <div className="grid grid-cols-2 gap-3 shrink-0">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[14px] font-black text-text-main">AI Model</label>
                                <select
                                    value={imageProvider}
                                    onChange={(e) => setImageProvider(e.target.value as AIServiceProvider)}
                                    className="w-full bg-card rounded-xl p-2.5 text-[13px] font-bold text-text-main shadow-inner appearance-none cursor-pointer border border-border outline-none focus:border-accent-purple"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238b9bb4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.8em' }}
                                >
                                    <option value="CLOUDFLARE">Cloudflare</option>
                                    <option value="GEMINI">Google Gemini</option>
                                    <option value="OPENROUTER">OpenRouter</option>
                                    <option value="POLLINATIONS">Pollinations</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[14px] font-black text-text-main">Image Count</label>
                                <select
                                    value={imgCount}
                                    onChange={(e) => setImgCount(parseInt(e.target.value) || 1)}
                                    className="w-full bg-card rounded-xl p-2.5 text-[13px] font-bold text-text-main shadow-inner appearance-none cursor-pointer border border-border outline-none focus:border-accent-purple"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238b9bb4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.8em' }}
                                >
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* Status & Generate (Pushed to bottom naturally via mt-auto) */}
                        <div className="pt-2 flex flex-col gap-4 mt-auto shrink-0 mb-1">
                            <div className="flex justify-between items-center px-1">
                                <div className="flex flex-col">
                                    <label className="text-[13px] font-black text-text-main mb-0.5">Performance Status</label>
                                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[11px] uppercase tracking-wider">
                                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                        Optimized & Ready
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-card text-text-main font-black flex items-center justify-center text-[12px] shadow-inner border border-border">
                                    {imgCount}
                                </div>
                            </div>

                            <button
                                onClick={handleGenerateImages}
                                disabled={isGenerating || !prompt.trim()}
                                className={`w-full h-12 rounded-xl font-black text-[14px] transition-all flex items-center justify-center gap-2 relative overflow-hidden ${
                                    isGenerating 
                                    ? 'bg-accent-purple/50 text-white cursor-wait border-none' 
                                    : prompt.trim() 
                                        ? 'bg-accent-purple hover:bg-purple-600 text-white shadow-md border-none' 
                                        : 'bg-panel text-text-muted border border-border shadow-none pointer-events-none'
                                }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <div className="absolute top-0 left-0 h-full bg-white/20 w-1/3 animate-pulse"></div>
                                    </>
                                ) : (
                                    <>
                                        <span>Generate</span>
                                        <Sparkles className="w-4 h-4 ml-1" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Column - Creative Board */}
                    <div className="lg:col-span-8 lg:pl-6 h-full min-h-0 flex flex-col">
                        <div className="bg-panel rounded-[24px] border border-border flex flex-col p-4 sm:p-5 h-full relative overflow-hidden flex-1 min-h-0">
                            
                            <div className="flex justify-between items-center mb-4 shrink-0">
                                <h3 className="text-[18px] font-black text-text-main tracking-tight flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-accent-purple"></div>
                                    Creative Board
                                </h3>
                                <div className="w-8 h-8 rounded-full bg-card shadow-inner border border-border flex items-center justify-center">
                                    <ImageIcon className="w-4 h-4 text-text-muted" />
                                </div>
                            </div>

                            {pendingImages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                    <div className="w-20 h-20 bg-card border border-border rounded-3xl flex items-center justify-center mb-5 shadow-inner">
                                        <ImageIcon className="w-8 h-8 text-text-muted/50" />
                                    </div>
                                    <h4 className="font-black text-[16px] text-text-main">No Pins Generated Yet</h4>
                                    <p className="text-[13px] font-bold text-text-muted mt-1.5 max-w-[280px]">Your optimized Pinterest assets will appear in this board.</p>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col min-h-0">
                                    
                                    {/* The scrolling container for the generated images */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                                            {pendingImages.map((imgUrl, idx) => (
                                                <div key={idx} className="bg-card rounded-[18px] p-2.5 border border-border shadow-sm flex flex-col transition-all">
                                                    {/* Image Container */}
                                                    <div className="relative rounded-[12px] overflow-hidden bg-body aspect-[3/4] mb-3 group/img border border-border/50">
                                                        <img src={imgUrl} alt="Generated Asset" className="w-full h-full object-cover" />
                                                        
                                                        {/* Title Overlay */}
                                                        <div className="absolute top-0 left-0 w-full p-3 bg-gradient-to-b from-black/80 to-transparent z-10">
                                                            <h5 className="text-white font-bold text-[11px] tracking-wider uppercase drop-shadow-md truncate">Generated Asset {idx + 1}</h5>
                                                        </div>

                                                        {/* Hover Delete Action */}
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-sm z-20">
                                                            <button 
                                                                onClick={() => setPendingImages(prev => prev.filter((_, i) => i !== idx))}
                                                                className="w-10 h-10 bg-white/10 hover:bg-red-500 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all hover:scale-110 border border-white/20 hover:border-red-400"
                                                                title="Discard Image"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="mt-auto">
                                                        <button 
                                                            onClick={() => {
                                                                handleConfirmImport([imgUrl], false);
                                                                setPendingImages(prev => prev.filter(img => img !== imgUrl));
                                                            }}
                                                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-panel border border-border hover:bg-card text-text-main font-bold text-[12px] transition-colors"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-blue"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                                            Save to Queue
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Bar at Bottom */}
                                    {pendingImages.length > 1 && (
                                        <div className="mt-3 pt-3 border-t border-border shrink-0">
                                            <button
                                                onClick={() => handleConfirmImport(pendingImages, true)}
                                                disabled={isImporting}
                                                className="w-full bg-accent-purple hover:bg-purple-600 text-white h-11 rounded-xl font-bold text-[13px] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                                            >
                                                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                                Batch Save All to Queue
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
