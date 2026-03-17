import React, { useState, useMemo } from 'react';
import { Flame, Sparkles, TrendingUp, Search, Zap, Loader2, Copy, Check, Radar, CheckSquare, Square, Send, Tag, Trash2, Globe, ExternalLink } from 'lucide-react';

// ─── Types ───
interface KeywordData {
    id: string;
    term: string;
    source: 'pinterest' | 'ideas' | 'aesthetic' | 'trending' | 'diy' | 'beginner' | 'inspiration';
}

interface TrendingKeywordsState {
    seed: string;
    results: { keywords: KeywordData[] } | null;
    selectedKeywords: Set<string>;
}

interface TrendingKeywordsViewProps {
    onSendToAIStudio: (keyword: string) => void;
    onInjectKeywords?: (keywords: string[]) => void;
    persistedState: TrendingKeywordsState;
    onStateChange: (state: TrendingKeywordsState) => void;
}

// ─── AI Prompt Builder ───
const buildAdvancedPrompt = (keyword: string): string => {
    const seeds = [
        `An amateur iPhone 13 snapshot of ${keyword}. Casual home environment, slightly messy background with real-life clutter visible. Candid overhead angle, slightly off-center composition, one corner slightly out of focus. Natural daylight from a nearby window mixed with warm indoor lamp. Slight motion blur on edges, visible noise grain from low light, color temperature leaning warm yellow. No filters, no editing, no HDR, no professional lighting. Authentic texture on surfaces, dust particles visible in light beam. Shot feels like someone quickly took a photo to share with friends. --style raw --no professional, 3d, animated, illustration, render, cartoon, digital art, smooth, airbrushed`,
        `A quick candid phone photo of ${keyword}. Taken with slightly shaky hands, natural imperfections everywhere. Kitchen counter or living room table as backdrop with random everyday objects partially visible. Soft uneven ambient lighting, slight lens flare from window. The image has that authentic social media feel — not curated, not staged, just real life captured in a moment. Visible jpeg compression, warm white balance slightly off, shadows a bit crushed. --style raw --no professional, 3d, animated, illustration, render, cartoon, digital art, smooth, airbrushed, perfect lighting`,
        `Amateur lifestyle photograph of ${keyword}. Shot on smartphone, portrait mode with imperfect depth separation. Cozy real-world setting with authentic textured backgrounds — wood grain, fabric wrinkles, fingerprints on surfaces. Mixed lighting: warm tungsten with cool daylight bleeding in. Slight overexposure on highlights, muted shadows, natural skin tones with zero retouching. Feels like a genuine Pinterest user's personal photo, not a brand shoot. Mild chromatic aberration on edges. --style raw --no professional, 3d, animated, illustration, render, digital art, smooth, perfect`
    ];
    return seeds[Math.floor(Math.random() * seeds.length)];
};

// Source tag configuration
const SOURCE_CONFIG: Record<string, { label: string; color: string; tip: string }> = {
    pinterest:   { label: 'Pinterest',    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', tip: 'Sourced from "pinterest + keyword" searches — what users search when looking for Pinterest content' },
    ideas:       { label: 'Ideas',        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', tip: 'Sourced from "keyword + ideas" searches — idea-based queries popular on Pinterest' },
    aesthetic:   { label: 'Aesthetic',    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', tip: 'Sourced from "keyword + aesthetic" searches — visual/aesthetic content queries' },
    trending:    { label: 'Trending',     color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', tip: 'Sourced from "keyword + trending" searches — currently popular queries' },
    diy:         { label: 'DIY',          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', tip: 'Sourced from "keyword + DIY" searches — do-it-yourself project queries' },
    beginner:    { label: 'Beginner',     color: 'text-teal-400 bg-teal-500/10 border-teal-500/20', tip: 'Sourced from "keyword + for beginners" — tutorials & guides queries' },
    inspiration: { label: 'Inspo',        color: 'text-pink-400 bg-pink-500/10 border-pink-500/20', tip: 'Sourced from "keyword + inspiration" — visual inspiration searches' },
};

// Categorize a raw keyword based on which query it likely came from
const categorizeKeyword = (kw: string, seed: string): KeywordData['source'] => {
    const lower = kw.toLowerCase();
    if (lower.includes('pinterest')) return 'pinterest';
    if (lower.includes('aesthetic')) return 'aesthetic';
    if (lower.includes('beginner') || lower.includes('step by step') || lower.includes('how to')) return 'beginner';
    if (lower.includes('diy') || lower.includes('handmade') || lower.includes('homemade')) return 'diy';
    if (lower.includes('trending') || lower.includes('trend') || lower.includes('2025') || lower.includes('2026')) return 'trending';
    if (lower.includes('inspiration') || lower.includes('inspo') || lower.includes('board')) return 'inspiration';
    return 'ideas';
};

// ─── Component ───
const TrendingKeywordsView: React.FC<TrendingKeywordsViewProps> = ({ onSendToAIStudio, onInjectKeywords, persistedState, onStateChange }) => {
    const seed = persistedState.seed;
    const results = persistedState.results;
    const selectedKeywords = persistedState.selectedKeywords;

    const [isSearching, setIsSearching] = useState(false);
    const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const setSeed = (v: string) => onStateChange({ ...persistedState, seed: v });
    const setSelectedKeywords = (v: Set<string>) => onStateChange({ ...persistedState, selectedKeywords: v });

    const handleSearch = async () => {
        if (!seed.trim()) return;
        setIsSearching(true);
        setError(null);
        onStateChange({ ...persistedState, selectedKeywords: new Set(), results: null });

        try {
            const resp = await fetch(`/api/pinterest/keywords?q=${encodeURIComponent(seed.trim())}`);
            if (!resp.ok) throw new Error('Server error');
            const data = await resp.json();

            if (!data.keywords || data.keywords.length === 0) {
                setError('No keywords found. Try a different seed term.');
                setIsSearching(false);
                return;
            }

            const keywords: KeywordData[] = data.keywords.map((kw: string, i: number) => ({
                id: `kw-${i}`,
                term: kw,
                source: categorizeKeyword(kw, seed),
            }));

            onStateChange({ seed, selectedKeywords: new Set(), results: { keywords } });
        } catch (e: any) {
            console.error('Keyword fetch error:', e);
            setError('Failed to fetch keywords. Make sure the server is running.');
        }
        setIsSearching(false);
    };

    const handleClearResults = () => {
        onStateChange({ seed: '', results: null, selectedKeywords: new Set() });
        setError(null);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKeyword(text);
        setTimeout(() => setCopiedKeyword(null), 2000);
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedKeywords);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedKeywords(next);
    };

    const allKeywords = useMemo(() => results?.keywords || [], [results]);

    const selectAll = () => setSelectedKeywords(new Set(allKeywords.map(k => k.id)));
    const deselectAll = () => setSelectedKeywords(new Set());

    const selectedTerms = useMemo(() => {
        return allKeywords.filter(k => selectedKeywords.has(k.id)).map(k => k.term);
    }, [allKeywords, selectedKeywords]);

    const handleSendSelected = () => {
        if (selectedTerms.length === 0) return;
        onSendToAIStudio(buildAdvancedPrompt(selectedTerms.join(', ')));
    };

    const handleCopySelected = () => {
        if (selectedTerms.length === 0) return;
        navigator.clipboard.writeText(selectedTerms.join(', '));
        setCopiedKeyword('__all__');
        setTimeout(() => setCopiedKeyword(null), 2000);
    };

    const handleSearchPinterest = (term: string) => {
        window.open(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(term)}`, '_blank');
    };

    // Group keywords by source category
    const grouped = useMemo(() => {
        const groups: Record<string, KeywordData[]> = {};
        for (const kw of allKeywords) {
            if (!groups[kw.source]) groups[kw.source] = [];
            groups[kw.source].push(kw);
        }
        return groups;
    }, [allKeywords]);

    const SourceBadge = ({ source }: { source: string }) => {
        const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.ideas;
        return <span title={cfg.tip} className={`inline-flex items-center gap-0.5 text-[7px] font-black uppercase px-1.5 py-px rounded-full border whitespace-nowrap cursor-help ${cfg.color}`}>{cfg.label}</span>;
    };

    const KeywordRow = ({ data }: { data: KeywordData }) => {
        const isSelected = selectedKeywords.has(data.id);
        return (
            <div className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-amber-500/5 border-amber-500/30' : 'bg-[#18181c] border-[#25252a] hover:border-[#35353e]'}`}
                 onClick={() => toggleSelect(data.id)}>
                <div className="flex-shrink-0" title={isSelected ? 'Click to deselect' : 'Click to select for bulk actions'}>
                    {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-amber-500" /> : <Square className="w-3.5 h-3.5 text-[#35353e] group-hover:text-text-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                    <span className="font-bold text-white text-[12px] leading-tight block">{data.term}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <SourceBadge source={data.source} />
                        <span className="text-[8px] text-text-muted/40 font-semibold">Real search suggestion</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleSearchPinterest(data.term)} title="Open this keyword on Pinterest to verify volume and competition" className="w-6 h-6 flex items-center justify-center rounded bg-[#222228] hover:bg-rose-500/20 text-text-muted hover:text-rose-400 transition-colors border border-[#2a2a30]">
                        <ExternalLink className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleCopy(data.term)} title="Copy keyword to clipboard" className="w-6 h-6 flex items-center justify-center rounded bg-[#222228] hover:bg-[#2e2e36] text-text-muted hover:text-white transition-colors border border-[#2a2a30]">
                        {copiedKeyword === data.term ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button onClick={() => onSendToAIStudio(buildAdvancedPrompt(data.term))} title="Generate realistic image prompt from this keyword" className="w-6 h-6 flex items-center justify-center rounded bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white transition-all">
                        <Sparkles className="w-3 h-3" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="relative h-full w-full bg-main overflow-y-auto custom-scrollbar">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-main/95 backdrop-blur-sm border-b border-border px-5 py-3">
                <div className="flex items-center gap-4 max-w-full">
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20" title="Keyword Pulse — Real Pinterest search intelligence powered by Google Autocomplete">
                            <Flame className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-white leading-none">Keyword Pulse</h1>
                            <p className="text-[9px] font-semibold text-text-muted flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> Real search suggestions</p>
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 max-w-xl">
                        <div className="flex items-center bg-card border border-[#2a2a30] rounded-lg p-1">
                            <Search className="w-3.5 h-3.5 text-text-muted ml-2 flex-shrink-0" />
                            <input type="text" value={seed}
                                onChange={e => setSeed(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Enter niche (e.g. crochet, meal prep, room decor...)"
                                title="Type a topic and press Enter — fetches real search suggestions from Google"
                                className="flex-1 bg-transparent border-none text-white px-2.5 py-1.5 placeholder:text-text-muted/50 focus:outline-none font-semibold text-[12px] min-w-0"
                            />
                            <button onClick={handleSearch} disabled={isSearching || !seed.trim()} title="Fetch real keyword suggestions from Google Autocomplete"
                                className="bg-amber-500 hover:bg-amber-400 text-black font-black px-4 py-1.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[11px] flex items-center gap-1 flex-shrink-0">
                                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radar className="w-3 h-3" />}
                                {isSearching ? 'Fetching...' : 'Discover'}
                            </button>
                        </div>
                    </div>

                    {results && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[9px] font-bold text-text-muted whitespace-nowrap">{allKeywords.length} found · {selectedKeywords.size} sel.</span>
                            <button onClick={selectedKeywords.size > 0 ? deselectAll : selectAll} title={selectedKeywords.size > 0 ? 'Deselect all' : 'Select all keywords'}
                                className="px-2 py-1 rounded bg-[#222228] hover:bg-[#2e2e36] text-text-muted hover:text-white text-[9px] font-bold border border-[#2a2a30] transition-all whitespace-nowrap">
                                {selectedKeywords.size > 0 ? 'Clear Sel.' : 'All'}
                            </button>
                            <button onClick={handleCopySelected} disabled={selectedKeywords.size === 0} title="Copy selected keywords"
                                className="px-2 py-1 rounded bg-[#222228] hover:bg-[#2e2e36] text-text-muted hover:text-white text-[9px] font-bold border border-[#2a2a30] transition-all disabled:opacity-30 whitespace-nowrap flex items-center gap-1">
                                {copiedKeyword === '__all__' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />} Copy
                            </button>
                            <button onClick={handleSendSelected} disabled={selectedKeywords.size === 0} title="Generate realistic image prompts from selection"
                                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black transition-all disabled:opacity-30 flex items-center gap-1 whitespace-nowrap">
                                <Send className="w-2.5 h-2.5" /> AI Generate
                            </button>
                            {onInjectKeywords && (
                                <button onClick={() => onInjectKeywords(selectedTerms)} disabled={selectedKeywords.size === 0} title="Inject as hashtags into selected pins in Bulk Queue — the auto-fill AI will also use these keywords for SEO"
                                    className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black transition-all disabled:opacity-30 flex items-center gap-1 whitespace-nowrap">
                                    <Tag className="w-2.5 h-2.5" /> Inject
                                </button>
                            )}
                            <button onClick={handleClearResults} title="Clear all keywords and start fresh"
                                className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-[9px] font-black transition-all flex items-center gap-1 whitespace-nowrap border border-rose-500/20">
                                <Trash2 className="w-2.5 h-2.5" /> Clear
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-4 text-rose-400 text-sm font-semibold">{error}</div>
                )}

                {results ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Summary bar */}
                        <div className="bg-card border border-[#2a2a30] rounded-xl p-3 flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <div className="flex-1">
                                <span className="text-[12px] font-black text-white">Found {allKeywords.length} real keyword suggestions for "{seed}"</span>
                                <p className="text-[9px] text-text-muted mt-0.5">Sourced from Google search suggestions — these are terms people actually search. Click <ExternalLink className="w-2.5 h-2.5 inline" /> on any keyword to verify on Pinterest.</p>
                            </div>
                        </div>

                        {/* Grouped keywords */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                            {Object.entries(grouped).map(([source, keywords]) => {
                                const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.ideas;
                                return (
                                    <div key={source} className="bg-card border border-[#2a2a30] rounded-xl p-3 relative overflow-hidden">
                                        <div className={`absolute top-0 left-0 w-full h-[2px] ${cfg.color.split(' ')[0].replace('text-', 'bg-').replace('-400', '-500')}`}></div>
                                        <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-[#2a2a30]">
                                            <span className={`text-[11px] font-black ${cfg.color.split(' ')[0]}`}>{cfg.label}</span>
                                            <span className="text-[8px] text-text-muted font-semibold">{keywords.length} keywords</span>
                                        </div>
                                        <div className="flex flex-col gap-1.5">{keywords.map(kw => <KeywordRow key={kw.id} data={kw} />)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : !isSearching ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <Radar className="w-14 h-14 text-[#222228] mb-4" />
                        <h3 className="text-lg font-black text-text-muted mb-1">Discover Real Keywords</h3>
                        <p className="text-[12px] text-text-muted/50 max-w-sm mb-3">Type any niche and hit <strong>Discover</strong> to fetch real search suggestions from Google. These are actual keywords people search — no fake data.</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {['crochet', 'meal prep', 'room decor', 'outfit ideas', 'nail art', 'wedding', 'garden'].map(ex => (
                                <button key={ex} onClick={() => { setSeed(ex); }}
                                    className="px-3 py-1.5 rounded-lg bg-[#18181c] border border-[#25252a] hover:border-amber-500/30 text-text-muted hover:text-amber-400 text-[11px] font-semibold transition-all">
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
                        <h3 className="text-sm font-black text-text-muted">Fetching real keywords...</h3>
                        <p className="text-[11px] text-text-muted/50">Querying 8 search patterns</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrendingKeywordsView;
export type { TrendingKeywordsState };
