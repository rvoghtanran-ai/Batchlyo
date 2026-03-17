import React, { useState, useMemo } from 'react';
import { Radar, Search, Loader2, Users, Pin, LayoutGrid, Globe, ExternalLink, Copy, Check, Trash2, BookmarkPlus, ShieldCheck, BarChart3, TrendingUp, Zap, Image as ImageIcon, Link2, Clock, Tag, Flame, Calendar, PieChart, Star, Video, Hash } from 'lucide-react';

// ─── Types ───
interface PinData {
    id: string; title: string; description: string; link: string;
    domain: string; image: string; createdAt: string; boardName: string;
    seoTitle: string; dominantColor: string; ratingCount: number;
    reviewCount: number; hasVideo: boolean;
}

interface Analytics {
    avgDaysBetweenPins: number;
    boardDistribution: Record<string, number>;
    topKeywords: { word: string; count: number }[];
    totalPinsScanned: number;
    oldestPinDate: string | null;
    newestPinDate: string | null;
}

interface ProfileData {
    username: string; fullName: string; about: string;
    followerCount: number; pinCount: number; boardCount: number;
    domainUrl: string; profileImg: string; isVerified: boolean;
    pins: PinData[]; analytics: Analytics; scannedAt: string;
}

// ─── Helpers ───
const fmt = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
};

const timeAgo = (date: string): string => {
    if (!date) return '';
    const d = new Date(date);
    const now = Date.now();
    const days = Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
};

const getStrength = (followers: number) => {
    if (followers >= 500_000) return { label: 'DOMINANT', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    if (followers >= 100_000) return { label: 'STRONG', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (followers >= 10_000) return { label: 'GROWING', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (followers >= 1_000) return { label: 'RISING', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    return { label: 'STARTER', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
};

const freqLabel = (days: number): { text: string; color: string } => {
    if (days <= 1) return { text: 'Daily Poster', color: 'text-emerald-400' };
    if (days <= 3) return { text: 'Very Active', color: 'text-emerald-400' };
    if (days <= 7) return { text: 'Weekly Poster', color: 'text-amber-400' };
    if (days <= 14) return { text: 'Bi-Weekly', color: 'text-amber-400' };
    if (days <= 30) return { text: 'Monthly', color: 'text-rose-400' };
    return { text: 'Inactive', color: 'text-rose-400' };
};

// ─── Component ───
const CompetitorAnalysisView: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<ProfileData[]>([]);
    const [savedCompetitors, setSavedCompetitors] = useState<ProfileData[]>(() => {
        try { return JSON.parse(localStorage.getItem('batchlyo_competitors') || '[]'); } catch { return []; }
    });
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Record<string, string>>({});

    const handleScan = async () => {
        const username = query.trim().replace(/^@/, '').replace(/\/$/, '').split('/').pop() || '';
        if (!username) return;
        if (profiles.find(p => p.username.toLowerCase() === username.toLowerCase())) return;
        if (profiles.length >= 3) { setError('Max 3 competitors. Remove one first.'); return; }

        setIsLoading(true);
        setError(null);
        try {
            const resp = await fetch(`/api/pinterest/profile?username=${encodeURIComponent(username)}`);
            if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || `Error ${resp.status}`);
            const profile: ProfileData = await resp.json();
            if (profile.followerCount === 0 && profile.pinCount === 0 && profile.pins.length === 0) throw new Error(`"${username}" not found or private`);
            setProfiles(prev => [...prev, profile]);
            setActiveTab(prev => ({ ...prev, [username]: 'pins' }));
            setQuery('');
        } catch (e: any) { setError(e.message); }
        setIsLoading(false);
    };

    const removeProfile = (u: string) => setProfiles(prev => prev.filter(p => p.username !== u));
    const saveCompetitor = (p: ProfileData) => {
        const next = [...savedCompetitors.filter(s => s.username !== p.username), p];
        setSavedCompetitors(next);
        localStorage.setItem('batchlyo_competitors', JSON.stringify(next));
    };
    const removeSaved = (u: string) => {
        const next = savedCompetitors.filter(s => s.username !== u);
        setSavedCompetitors(next);
        localStorage.setItem('batchlyo_competitors', JSON.stringify(next));
    };
    const loadSaved = (p: ProfileData) => {
        if (profiles.length >= 3) { setError('Max 3. Remove one first.'); return; }
        if (!profiles.find(x => x.username === p.username)) {
            setProfiles(prev => [...prev, p]);
            setActiveTab(prev => ({ ...prev, [p.username]: 'pins' }));
        }
    };
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 2000);
    };

    const getTab = (u: string) => activeTab[u] || 'pins';
    const setTab = (u: string, t: string) => setActiveTab(prev => ({ ...prev, [u]: t }));

    // ─── Profile Card ───
    const ProfileCard = ({ profile: p }: { profile: ProfileData }) => {
        const strength = getStrength(p.followerCount);
        const pinBoardRatio = p.boardCount > 0 ? (p.pinCount / p.boardCount).toFixed(1) : '—';
        const followerPinRatio = p.pinCount > 0 ? Math.round(p.followerCount / p.pinCount) : 0;
        const freq = p.analytics?.avgDaysBetweenPins ? freqLabel(p.analytics.avgDaysBetweenPins) : null;
        const tab = getTab(p.username);
        const boards = p.analytics?.boardDistribution ? Object.entries(p.analytics.boardDistribution).sort((a, b) => b[1] - a[1]) : [];
        const keywords = p.analytics?.topKeywords || [];
        const isSaved = savedCompetitors.some(s => s.username === p.username);

        return (
            <div className="bg-card border border-[#2a2a30] rounded-xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-rose-500/5 to-transparent p-4 border-b border-[#2a2a30]">
                    <div className="flex items-start gap-3">
                        {p.profileImg ? <img src={p.profileImg} alt="" className="w-11 h-11 rounded-full border-2 border-[#2a2a30] flex-shrink-0 object-cover" />
                            : <div className="w-11 h-11 rounded-full bg-[#25252a] flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5 text-text-muted" /></div>}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-[12px] font-black text-white truncate">{p.fullName}</h3>
                                {p.isVerified && <ShieldCheck className="w-3 h-3 text-blue-400 flex-shrink-0" />}
                                <span className={`text-[7px] font-black uppercase px-1.5 py-px rounded-full border whitespace-nowrap ${strength.color}`}>{strength.label}</span>
                            </div>
                            <div className="text-[9px] text-text-muted font-semibold">@{p.username}</div>
                            {p.about && <p className="text-[9px] text-text-muted/60 mt-0.5 line-clamp-1">{p.about}</p>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => saveCompetitor(p)} className={`w-6 h-6 flex items-center justify-center rounded border transition-all ${isSaved ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-[#222228] border-[#2a2a30] text-text-muted hover:text-white'}`}><BookmarkPlus className="w-3 h-3" /></button>
                            <button onClick={() => removeProfile(p.username)} className="w-6 h-6 flex items-center justify-center rounded bg-[#222228] border border-[#2a2a30] text-text-muted hover:text-rose-400 transition-all"><Trash2 className="w-3 h-3" /></button>
                        </div>
                    </div>
                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-1.5 mt-3">
                        {([
                            [Users, 'Followers', fmt(p.followerCount)],
                            [Pin, 'Pins', fmt(p.pinCount)],
                            [LayoutGrid, 'Boards', fmt(p.boardCount)],
                            [Clock, 'Frequency', freq ? `~${p.analytics.avgDaysBetweenPins}d` : '—'],
                        ] as [any, string, string][]).map(([Icon, label, val]) => (
                            <div key={label} className="bg-[#15151a] rounded-md px-2 py-1.5 text-center">
                                <div className="text-[13px] font-black text-white leading-none">{val}</div>
                                <div className="text-[7px] font-bold text-text-muted uppercase mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="px-3 py-2 flex flex-wrap gap-1 border-b border-[#2a2a30]">
                    <a href={`https://www.pinterest.com/${p.username}/`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white text-[8px] font-bold transition-all">
                        <ExternalLink className="w-2.5 h-2.5" /> Profile</a>
                    {p.domainUrl && <a href={`https://${p.domainUrl}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white text-[8px] font-bold transition-all">
                        <Globe className="w-2.5 h-2.5" /> {p.domainUrl}</a>}
                    {p.about && <button onClick={() => handleCopy(p.about)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#222228] text-text-muted hover:text-white text-[8px] font-bold transition-all">
                        {copiedText === p.about ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />} Bio</button>}
                </div>

                {/* Tab bar */}
                <div className="flex border-b border-[#2a2a30]">
                    {([['pins', Pin, 'Pins'], ['strategy', BarChart3, 'Strategy'], ['keywords', Hash, 'Keywords'], ['boards', PieChart, 'Boards']] as [string, any, string][]).map(([key, Icon, label]) => (
                        <button key={key} onClick={() => setTab(p.username, key)}
                            className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[9px] font-bold transition-all ${tab === key ? 'text-white border-b-2 border-amber-500 bg-amber-500/5' : 'text-text-muted hover:text-white'}`}>
                            <Icon className="w-3 h-3" /> {label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[420px]">
                    {/* PINS TAB */}
                    {tab === 'pins' && (
                        <div className="p-2.5 space-y-1.5">
                            <div className="text-[8px] font-black text-text-muted uppercase px-1 mb-1">
                                {p.pins.length} Recent Pins • Sorted by latest first
                            </div>
                            {p.pins.map((pin, i) => (
                                <div key={pin.id} className="group flex items-center gap-2 bg-[#18181c] border border-[#25252a] rounded-lg p-2 hover:border-[#35353e] transition-all">
                                    <span className="text-[8px] font-black text-text-muted/30 w-4 text-right flex-shrink-0">#{i + 1}</span>
                                    {pin.image && <img src={pin.image} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0 border border-[#25252a]" loading="lazy" />}
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[10px] font-bold text-white block truncate">{pin.title || 'Untitled'}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                            {pin.createdAt && <span className="text-[7px] text-text-muted/50 flex items-center gap-0.5"><Calendar className="w-2 h-2" />{timeAgo(pin.createdAt)}</span>}
                                            {pin.boardName && <span className="text-[7px] text-amber-400/60 flex items-center gap-0.5"><LayoutGrid className="w-2 h-2" />{pin.boardName}</span>}
                                            {pin.ratingCount > 0 && <span className="text-[7px] text-yellow-400/70 flex items-center gap-0.5"><Star className="w-2 h-2" />{pin.ratingCount}</span>}
                                            {pin.hasVideo && <span className="text-[7px] text-purple-400/70 flex items-center gap-0.5"><Video className="w-2 h-2" />Video</span>}
                                            {pin.domain && <span className="text-[7px] text-text-muted/30 flex items-center gap-0.5 truncate"><Link2 className="w-2 h-2" />{pin.domain}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <button onClick={() => handleCopy(pin.title)} title="Copy title" className="w-5 h-5 flex items-center justify-center rounded bg-[#222228] text-text-muted hover:text-white transition-colors"><Copy className="w-2.5 h-2.5" /></button>
                                        {pin.link && <a href={pin.link} target="_blank" rel="noopener noreferrer" title="Visit destination" className="w-5 h-5 flex items-center justify-center rounded bg-[#222228] text-text-muted hover:text-blue-400 transition-colors"><ExternalLink className="w-2.5 h-2.5" /></a>}
                                    </div>
                                </div>
                            ))}
                            {p.pins.length === 0 && <div className="text-center py-10 text-text-muted text-[11px]">No pins found</div>}
                        </div>
                    )}

                    {/* STRATEGY TAB */}
                    {tab === 'strategy' && (
                        <div className="p-3 space-y-3">
                            <div className="bg-[#15151a] border border-[#1e1e22] rounded-lg p-3 space-y-2">
                                <div className="text-[9px] font-black text-text-muted uppercase">Profile Strength</div>
                                {([
                                    ['Pin/Board Ratio', `${pinBoardRatio} pins/board`, Number(pinBoardRatio) > 50 ? 'text-emerald-400' : Number(pinBoardRatio) > 10 ? 'text-amber-400' : 'text-rose-400', 'Average pins per board — higher means deeper content'],
                                    ['Follower Efficiency', followerPinRatio > 0 ? `${fmt(followerPinRatio)} followers/pin` : '—', followerPinRatio > 100 ? 'text-emerald-400' : followerPinRatio > 10 ? 'text-amber-400' : 'text-rose-400', 'High ratio = their content goes viral easily'],
                                    ['Posting Frequency', freq ? `Every ~${p.analytics.avgDaysBetweenPins} days (${freq.text})` : '—', freq?.color || 'text-text-muted', 'How often they publish new pins'],
                                    ['Website', p.domainUrl || 'None', p.domainUrl ? 'text-emerald-400' : 'text-text-muted', 'Monetization signal'],
                                    ['Verified Merchant', p.isVerified ? '✓ Verified' : '✗ No', p.isVerified ? 'text-blue-400' : 'text-text-muted', 'Pinterest merchant verification'],
                                    ['Content Span', p.analytics?.oldestPinDate && p.analytics?.newestPinDate ? `${timeAgo(p.analytics.oldestPinDate)} → ${timeAgo(p.analytics.newestPinDate)}` : '—', 'text-text-muted', 'Timerange of scanned pins'],
                                ] as [string, string, string, string][]).map(([label, value, color, tip]) => (
                                    <div key={label} title={tip} className="flex items-center justify-between py-1 border-b border-[#1e1e22] last:border-0 cursor-help">
                                        <span className="text-[10px] font-semibold text-text-muted">{label}</span>
                                        <span className={`text-[10px] font-black ${color}`}>{value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* What to steal */}
                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                                <div className="text-[9px] font-black text-amber-400 uppercase mb-2 flex items-center gap-1"><Flame className="w-3 h-3" /> Strategy Takeaways</div>
                                <div className="space-y-1.5 text-[10px] text-text-muted">
                                    {p.followerCount > 100000 && <p>• <strong className="text-white">High authority account</strong> — study their pin titles and descriptions for SEO patterns</p>}
                                    {p.analytics?.avgDaysBetweenPins <= 3 && <p>• <strong className="text-white">Very active poster</strong> — they pin frequently which boosts algorithmic visibility</p>}
                                    {p.analytics?.avgDaysBetweenPins > 14 && <p>• <strong className="text-white">Infrequent poster</strong> — you can outpace them with consistent daily pinning</p>}
                                    {Number(pinBoardRatio) > 30 && <p>• <strong className="text-white">Deep boards</strong> — they pack many pins per board, signaling topic authority to Pinterest</p>}
                                    {p.domainUrl && <p>• <strong className="text-white">Drives traffic to website</strong> — they monetize via {p.domainUrl}, study their funnel</p>}
                                    {!p.domainUrl && <p>• <strong className="text-white">No website linked</strong> — opportunity: you can outrank them by linking to your own site</p>}
                                    {boards.length > 0 && <p>• <strong className="text-white">Top board: "{boards[0][0]}"</strong> — consider creating a similar board in your niche</p>}
                                    <p>• <strong className="text-white">Copy their top keywords</strong> — switch to the Keywords tab to see what words they use most</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* KEYWORDS TAB */}
                    {tab === 'keywords' && (
                        <div className="p-3">
                            <div className="text-[8px] font-black text-text-muted uppercase mb-2">Top Keywords from their Pin Titles & Descriptions</div>
                            {keywords.length > 0 ? (
                                <div className="space-y-1">
                                    {keywords.map((kw, i) => {
                                        const maxCount = keywords[0].count;
                                        const pct = Math.round((kw.count / maxCount) * 100);
                                        return (
                                            <div key={kw.word} className="flex items-center gap-2 group">
                                                <span className="text-[8px] text-text-muted/30 font-bold w-4 text-right">{i + 1}</span>
                                                <div className="flex-1 relative bg-[#18181c] rounded overflow-hidden h-7 border border-[#25252a]">
                                                    <div className="absolute left-0 top-0 bottom-0 bg-amber-500/10 rounded" style={{ width: `${pct}%` }}></div>
                                                    <div className="relative flex items-center justify-between px-2 h-full">
                                                        <span className="text-[10px] font-bold text-white">{kw.word}</span>
                                                        <span className="text-[8px] font-black text-amber-400">{kw.count}×</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleCopy(kw.word)} className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 bg-[#222228] text-text-muted hover:text-white transition-all">
                                                    {copiedText === kw.word ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <button onClick={() => handleCopy(keywords.map(k => k.word).join(', '))}
                                        className="w-full mt-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black text-[9px] font-black transition-all flex items-center justify-center gap-1">
                                        {copiedText === keywords.map(k => k.word).join(', ') ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy All Keywords
                                    </button>
                                </div>
                            ) : <div className="text-center py-10 text-text-muted text-[11px]">No keyword data</div>}
                        </div>
                    )}

                    {/* BOARDS TAB */}
                    {tab === 'boards' && (
                        <div className="p-3">
                            <div className="text-[8px] font-black text-text-muted uppercase mb-2">Board Distribution (from scanned pins)</div>
                            {boards.length > 0 ? (
                                <div className="space-y-1">
                                    {boards.map(([name, count]) => {
                                        const pct = Math.round((count / p.pins.length) * 100);
                                        return (
                                            <div key={name} className="flex items-center gap-2 group">
                                                <div className="flex-1 relative bg-[#18181c] rounded overflow-hidden h-7 border border-[#25252a]">
                                                    <div className="absolute left-0 top-0 bottom-0 bg-blue-500/10 rounded" style={{ width: `${pct}%` }}></div>
                                                    <div className="relative flex items-center justify-between px-2 h-full">
                                                        <span className="text-[10px] font-bold text-white truncate">{name}</span>
                                                        <span className="text-[8px] font-black text-blue-400 flex-shrink-0">{count} pins · {pct}%</span>
                                                    </div>
                                                </div>
                                                <a href={`https://www.pinterest.com/${p.username}/${name.toLowerCase().replace(/\s+/g, '-')}/`} target="_blank" rel="noopener noreferrer"
                                                    className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 bg-[#222228] text-text-muted hover:text-blue-400 transition-all">
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : <div className="text-center py-10 text-text-muted text-[11px]">No board data from scanned pins</div>}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="relative h-full w-full bg-main overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-main/95 backdrop-blur-sm border-b border-border px-5 py-3">
                <div className="flex items-center gap-4 max-w-full">
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                            <Radar className="w-4 h-4 text-rose-500" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-white leading-none">Competitor Intel</h1>
                            <p className="text-[9px] font-semibold text-text-muted">Real Pinterest profile analysis</p>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 max-w-lg">
                        <div className="flex items-center bg-card border border-[#2a2a30] rounded-lg p-1">
                            <Search className="w-3.5 h-3.5 text-text-muted ml-2 flex-shrink-0" />
                            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()}
                                placeholder="Enter Pinterest username (e.g. ohsweetbasil)"
                                className="flex-1 bg-transparent border-none text-white px-2.5 py-1.5 placeholder:text-text-muted/50 focus:outline-none font-semibold text-[12px] min-w-0" />
                            <button onClick={handleScan} disabled={isLoading || !query.trim() || profiles.length >= 3}
                                className="bg-rose-500 hover:bg-rose-400 text-white font-black px-4 py-1.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[11px] flex items-center gap-1 flex-shrink-0">
                                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radar className="w-3 h-3" />}
                                {isLoading ? 'Scanning...' : 'Scan'}
                            </button>
                        </div>
                    </div>
                    {profiles.length > 0 && (
                        <button onClick={() => setProfiles([])} className="px-2.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-[9px] font-black transition-all flex items-center gap-1 border border-rose-500/20 flex-shrink-0">
                            <Trash2 className="w-2.5 h-2.5" /> Clear All
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mx-5 mt-4 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-[12px] font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
            )}

            <div className="p-5">
                {profiles.length > 0 ? (
                    <div className="space-y-4">
                        {/* Profile Cards Grid */}
                        <div className={`grid gap-4 ${profiles.length === 1 ? 'grid-cols-1 max-w-2xl' : profiles.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                            {profiles.map(p => <ProfileCard key={p.username} profile={p} />)}
                        </div>

                        {/* Head-to-Head for 2+ */}
                        {profiles.length >= 2 && (
                            <div className="bg-card border border-[#2a2a30] rounded-xl p-4">
                                <div className="text-[11px] font-black text-white mb-3 flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Head-to-Head
                                </div>
                                <table className="w-full text-[11px]">
                                    <thead><tr className="border-b border-[#2a2a30]">
                                        <th className="text-left text-text-muted font-bold py-2 pr-4">Metric</th>
                                        {profiles.map(p => <th key={p.username} className="text-right text-white font-black py-2 px-2">@{p.username}</th>)}
                                    </tr></thead>
                                    <tbody>
                                        {([['Followers', 'followerCount'], ['Total Pins', 'pinCount'], ['Boards', 'boardCount']] as [string, keyof ProfileData][]).map(([label, key]) => {
                                            const vals = profiles.map(p => Number(p[key]) || 0);
                                            const max = Math.max(...vals);
                                            return (<tr key={label} className="border-b border-[#1e1e22]">
                                                <td className="text-text-muted font-semibold py-2 pr-4">{label}</td>
                                                {profiles.map((p, i) => <td key={p.username} className={`text-right py-2 px-2 font-black ${vals[i] === max ? 'text-emerald-400' : 'text-text-muted'}`}>{fmt(vals[i])} {vals[i] === max && '👑'}</td>)}
                                            </tr>);
                                        })}
                                        <tr className="border-b border-[#1e1e22]">
                                            <td className="text-text-muted font-semibold py-2 pr-4">Post Frequency</td>
                                            {profiles.map(p => {
                                                const d = p.analytics?.avgDaysBetweenPins || 0;
                                                const f = d ? freqLabel(d) : null;
                                                return <td key={p.username} className={`text-right py-2 px-2 font-black ${f?.color || 'text-text-muted'}`}>{d ? `~${d}d` : '—'}</td>;
                                            })}
                                        </tr>
                                        <tr><td className="text-text-muted font-semibold py-2 pr-4">Website</td>
                                            {profiles.map(p => <td key={p.username} className="text-right py-2 px-2 font-bold">{p.domainUrl ? <span className="text-emerald-400">✓</span> : <span className="text-text-muted/40">✗</span>}</td>)}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Radar className="w-14 h-14 text-[#222228] mb-4" />
                            <h3 className="text-lg font-black text-text-muted mb-1">Scan Any Pinterest Competitor</h3>
                            <p className="text-[12px] text-text-muted/50 max-w-md mb-4">Enter a username to pull their real profile stats, recent pins with dates and boards, keyword analysis, posting frequency, and strategy insights. Compare up to 3 side-by-side.</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {['ohsweetbasil', 'buzzfeed', 'etsy', 'allrecipes', 'nike'].map(ex => (
                                    <button key={ex} onClick={() => setQuery(ex)} className="px-3 py-1.5 rounded-lg bg-[#18181c] border border-[#25252a] hover:border-rose-500/30 text-text-muted hover:text-rose-400 text-[11px] font-semibold transition-all">@{ex}</button>
                                ))}
                            </div>
                        </div>
                        {savedCompetitors.length > 0 && (
                            <div className="bg-card border border-[#2a2a30] rounded-xl p-4">
                                <div className="text-[11px] font-black text-white mb-3 flex items-center gap-1.5"><BookmarkPlus className="w-3.5 h-3.5 text-amber-500" /> Saved ({savedCompetitors.length})</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {savedCompetitors.map(s => (
                                        <div key={s.username} className="flex items-center gap-2.5 bg-[#18181c] border border-[#25252a] rounded-lg p-2.5 group hover:border-[#35353e] transition-all">
                                            {s.profileImg ? <img src={s.profileImg} alt="" className="w-8 h-8 rounded-full border border-[#25252a] object-cover flex-shrink-0" />
                                                : <div className="w-8 h-8 rounded-full bg-[#25252a] flex items-center justify-center flex-shrink-0"><Users className="w-3.5 h-3.5 text-text-muted" /></div>}
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[11px] font-bold text-white block truncate">{s.fullName}</span>
                                                <span className="text-[9px] text-text-muted">@{s.username} · {fmt(s.followerCount)}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                <button onClick={() => loadSaved(s)} className="w-6 h-6 flex items-center justify-center rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white transition-all"><Radar className="w-3 h-3" /></button>
                                                <button onClick={() => removeSaved(s.username)} className="w-6 h-6 flex items-center justify-center rounded bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-all"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompetitorAnalysisView;
