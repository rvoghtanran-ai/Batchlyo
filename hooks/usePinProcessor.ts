import { useState, useRef, useEffect } from 'react';
import { Pin, UserProfile, Board } from '../types';
import { aiService } from '../services/aiService';
import { applyStealthFilters, generateSmartUTM } from '../services/utils';

// NO-AI SPINNER LOGIC DICTIONARIES
const SPINNER_HOOKS = ["Best Ideas", "Top Picks", "Trending Now", "Must Try", "Inspiration", "Guide", "2024", "Viral", "Aesthetic"];
const SPINNER_SEPARATORS = [" | ", " - ", " // ", " : ", " • ", " ~ "];
const SPINNER_EMOJIS = ["✨", "🔥", "💡", "🌿", "⭐", "📌", "🎨", "❤️", "🙌"];
const SPINNER_CTAS = [
    "Save this pin for later!", 
    "Pin this to your board!", 
    "Check out the link for more.", 
    "Click to read the full guide.", 
    "Don't forget to save this!", 
    "Visit our site for details.",
    "Follow for more inspiration."
];
const SPINNER_ADJECTIVES = ["Amazing", "Stunning", "Simple", "Creative", "Unique", "Beautiful", "Awesome", "Great"];

export const remixTextLocal = (pin: Pin) => {
    let newTitle = pin.title;
    let newDesc = pin.description;

    if (newTitle) {
        const hasEmoji = /[\u{1F300}-\u{1F6FF}]/u.test(newTitle);
        let cleanTitle = newTitle.replace(/ \| .*$/, '').replace(/ - .*$/, '');
        const randomSep = SPINNER_SEPARATORS[Math.floor(Math.random() * SPINNER_SEPARATORS.length)];
        const randomHook = SPINNER_HOOKS[Math.floor(Math.random() * SPINNER_HOOKS.length)];
        const randomEmoji = SPINNER_EMOJIS[Math.floor(Math.random() * SPINNER_EMOJIS.length)];
        newTitle = `${!hasEmoji ? randomEmoji + ' ' : ''}${cleanTitle}${randomSep}${randomHook}`;
    }

    if (newDesc) {
        let sentences = newDesc.split('. ').filter(s => s.trim().length > 0);
        if (sentences.length > 1) {
            const lastSentence = sentences[sentences.length - 1];
            if (lastSentence.length < 50) sentences.pop();
            for (let i = sentences.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sentences[i], sentences[j]] = [sentences[j], sentences[i]];
            }
        }
        const randomAdj = SPINNER_ADJECTIVES[Math.floor(Math.random() * SPINNER_ADJECTIVES.length)];
        if (sentences.length > 0 && !sentences[0].includes(randomAdj)) {
            sentences[0] = sentences[0] + ` (${randomAdj}!)`;
        }
        const randomCTA = SPINNER_CTAS[Math.floor(Math.random() * SPINNER_CTAS.length)];
        newDesc = sentences.join('. ') + '. ' + randomCTA;
    }
    return { title: newTitle, description: newDesc };
};

interface UsePinProcessorProps {
    pins: Pin[];
    setPins: React.Dispatch<React.SetStateAction<Pin[]>>;
    selectedCount: number;
    activeAccountId?: string;
    boards: Board[];
    isStealthMode: boolean;
    isAdmin: boolean;
    userProfile: UserProfile | null;
    destinationLink: string;
    isAutoSmartLink: boolean;
    getSmartLinkSettings: (accountId?: string) => any;
    trackUsage: (metric: any, amount?: number, accountId?: string) => Promise<void>;
    addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    setAiStats: React.Dispatch<React.SetStateAction<any>>;
    activeKeywords?: string[];
}

export function usePinProcessor({
    pins, setPins, selectedCount, activeAccountId, boards, isStealthMode, isAdmin,
    userProfile, destinationLink, isAutoSmartLink, getSmartLinkSettings, trackUsage, addToast, setAiStats,
    activeKeywords
}: UsePinProcessorProps) {
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);
    const abortProcessingRef = useRef<boolean>(false);

    // Cleanup async operations on unmount
    useEffect(() => {
        return () => {
            abortProcessingRef.current = true;
        };
    }, []);

    const handleSpinContent = async () => {
        if (isSpinning) {
            abortProcessingRef.current = true;
            setIsSpinning(false);
            return;
        }
        
        const targetPins = selectedCount > 0 ? pins.filter(p => p.selected) : pins;
        if (targetPins.length === 0) return;

        setIsSpinning(true);
        abortProcessingRef.current = false;

        const validBoards = activeAccountId ? boards.filter(b => b.accountId === activeAccountId) : boards;
        const validBoardNames = validBoards.map(b => b.name);
        const smartLinkSettings = getSmartLinkSettings();

        const userPlan = userProfile?.subscription?.plan || 'starter';
        if (!isAdmin && userPlan === 'starter') {
            const accountId = activeAccountId || 'global';
            const usageCount = userProfile?.usage?.remixUsage?.[accountId] || 0;
            if (usageCount >= 1) {
                addToast("Starter Limit: Upgrade to Pro for unlimited Remixes per account.", 'warning');
                setIsSpinning(false);
                return;
            }
        }

        let successAtLeastOne = false;
        for (const pin of targetPins) {
            if (abortProcessingRef.current) break;
            setPins(prev => prev.map(p => p.id === pin.id ? { ...p, status: 'processing' } : p));
            
            try {
                const basePinForRemix = {
                    ...pin,
                    title: pin.originalTitle || pin.title,
                    description: pin.originalDescription || pin.description,
                    tags: pin.originalTags || pin.tags
                };
                const textUpdates = remixTextLocal(basePinForRemix);
                let finalPin = { ...pin, ...textUpdates };

                const accId = activeAccountId || 'default';
                
                if (finalPin.originalImageUrl?.startsWith('data:')) {
                    const remixedImage = await applyStealthFilters(finalPin.originalImageUrl);
                    finalPin = { 
                        ...finalPin, 
                        imageUrl: remixedImage,
                        accountOptimizedImages: {
                            ...(finalPin.accountOptimizedImages || {}),
                            [accId]: remixedImage
                        }
                    };
                }

                finalPin.accountMetadata = {
                    ...(finalPin.accountMetadata || {}),
                    [accId]: { title: finalPin.title, description: finalPin.description, tags: finalPin.tags }
                };

                if (destinationLink && destinationLink.trim() !== '') {
                    const base = destinationLink.trim();
                    finalPin.destinationLink = smartLinkSettings.enabled ? generateSmartUTM(base) : base;
                } else if (smartLinkSettings.enabled && smartLinkSettings.baseUrl) {
                    const queryText = finalPin.title || finalPin.description || 'pin';
                    const query = encodeURIComponent(queryText.split(' ').slice(0, 5).join(' ')); 
                    let generatedLink = '';
                    const baseUrl = smartLinkSettings.baseUrl.replace(/\/$/, '');
                    switch (smartLinkSettings.platform) {
                        case 'wordpress': generatedLink = `${baseUrl}/?s=${query}`; break;
                        case 'blogger': 
                        case 'shopify': 
                        case 'etsy': generatedLink = `${baseUrl}/search?q=${query}`; break;
                        case 'custom': generatedLink = `${baseUrl}${smartLinkSettings.customPath}${query}`; break;
                    }
                    if (generatedLink) finalPin.destinationLink = generateSmartUTM(generatedLink);
                } else {
                    finalPin.destinationLink = '';
                }
                
                let newBoardName = '';
                const isSidebarSelectionValid = finalPin.board && validBoardNames.includes(finalPin.board);

                if (isSidebarSelectionValid) {
                    newBoardName = finalPin.board;
                } else {
                     const contentText = (finalPin.title + ' ' + finalPin.description + ' ' + (finalPin.tags || []).join(' ')).toLowerCase();
                     let bestMatch = '';
                     let maxScore = 0;
                     validBoards.forEach(board => {
                         const boardWords = board.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2); 
                         let score = 0;
                         boardWords.forEach((word: string) => { if (contentText.includes(word)) score += 2; });
                         if (contentText.includes(board.name.toLowerCase())) score += 5;
                         if (score > maxScore) { maxScore = score; bestMatch = board.name; }
                     });
                     if (maxScore > 0) newBoardName = bestMatch;
                     else newBoardName = validBoardNames.length > 0 ? validBoardNames[0] : ''; 
                }
                
                finalPin.board = newBoardName;
                finalPin.status = 'ready'; 

                setPins(prev => prev.map(p => p.id === pin.id ? finalPin : p));
                successAtLeastOne = true;
                await new Promise(r => setTimeout(r, 200)); 

            } catch (e) {
                console.error("Remix failed", e);
                setPins(prev => prev.map(p => p.id === pin.id ? { ...p, status: 'error' } : p));
            }
        }

        if (successAtLeastOne && !isAdmin) {
            await trackUsage('remixUsage', 1, activeAccountId || 'global');
        }

        setIsSpinning(false);
        addToast("Remix Complete", 'success');
    };

    const handleToggleAutoAI = async (retryErrorsOnly: boolean = false) => {
        if (isProcessingAI) {
            abortProcessingRef.current = true;
            setIsProcessingAI(false);
            return;
        }

        setIsProcessingAI(true);
        abortProcessingRef.current = false;

        let targetPins: Pin[] = [];
        if (retryErrorsOnly) {
            targetPins = pins.filter(p => p.status === 'error');
        } else {
            const selectedPins = pins.filter(p => p.selected);
            if (selectedPins.length > 0) {
                targetPins = selectedPins; 
            } else {
                targetPins = pins.filter(p => p.status === 'draft' || p.status === 'error');
            }
        }

        if (targetPins.length === 0) {
            addToast("No pins found to process.", 'info');
            setIsProcessingAI(false);
            return;
        }

        const relevantBoards = activeAccountId ? boards.filter(b => b.accountId === activeAccountId) : boards;
        const boardList = relevantBoards.map(b => b.name);
        
        let successCount = 0;
        let failCount = 0;

        for (const pin of targetPins) {
            if (abortProcessingRef.current) break;
            setPins(prev => prev.map(p => p.id === pin.id ? { ...p, status: 'processing' } : p));

            try {
                const { updatedPin, searchTerm } = await aiService.generateContent(pin, boardList, activeKeywords || []);
                
                const accId = activeAccountId || 'default';
                updatedPin.originalTitle = updatedPin.title;
                updatedPin.originalDescription = updatedPin.description;
                updatedPin.originalTags = updatedPin.tags;

                updatedPin.accountMetadata = {
                    ...(updatedPin.accountMetadata || {}),
                    [accId]: { title: updatedPin.title, description: updatedPin.description, tags: updatedPin.tags }
                };

                // Determine Account-specific or Global Smart Link Settings
                const pinAccountId = activeAccountId || (updatedPin.board ? boards.find(b => b.name === updatedPin.board)?.accountId : undefined);
                const smartLinkSettings = getSmartLinkSettings(pinAccountId);
                let rawUrl = (destinationLink || '').trim();

                if (!updatedPin.destinationLink) {
                    if (smartLinkSettings.enabled && smartLinkSettings.baseUrl) {
                        const query = encodeURIComponent((searchTerm || updatedPin.title || 'pin').trim());
                        const baseUrl = smartLinkSettings.baseUrl.replace(/\/$/, '');
                        let generatedLink = '';
                        
                        if (isAutoSmartLink && query) {
                            switch (smartLinkSettings.platform) {
                                case 'wordpress': generatedLink = `${baseUrl}/?s=${query}`; break;
                                case 'blogger': 
                                case 'shopify': 
                                case 'etsy': generatedLink = `${baseUrl}/search?q=${query}`; break;
                                case 'custom': generatedLink = `${baseUrl}${smartLinkSettings.customPath}${query}`; break;
                            }
                        } else {
                            // If auto-append is off, or no query, just use the bare Smart Link Base URL
                            generatedLink = baseUrl;
                        }

                        if (generatedLink) {
                            updatedPin.destinationLink = generateSmartUTM(generatedLink);
                        } else if (rawUrl) {
                            if (isAutoSmartLink && query) {
                                const separator = rawUrl.includes('?') ? '&' : '?';
                                updatedPin.destinationLink = generateSmartUTM(`${rawUrl}${separator}search=${query}`);
                            } else {
                                updatedPin.destinationLink = generateSmartUTM(rawUrl);
                            }
                        }
                    } else if (rawUrl) {
                        if (isAutoSmartLink && searchTerm) {
                            const separator = rawUrl.includes('?') ? '&' : '?';
                            updatedPin.destinationLink = `${rawUrl}${separator}search=${encodeURIComponent(searchTerm.trim())}`;
                        } else {
                            updatedPin.destinationLink = rawUrl;
                        }
                    }
                }

                if (isStealthMode && updatedPin.imageUrl.startsWith('data:')) {
                    updatedPin.imageUrl = await applyStealthFilters(updatedPin.imageUrl);
                }

                await trackUsage('aiCalls', 1, activeAccountId);

                setPins(prev => prev.map(p => p.id === pin.id ? updatedPin : p));
                setAiStats({...aiService.getStats()});
                successCount++;
                
                await new Promise(r => setTimeout(r, 4000)); 

            } catch (e: any) {
                console.error(`AI Error on Pin ${pin.id}`, e);
                setPins(prev => prev.map(p => p.id === pin.id ? { ...p, status: 'error' } : p));
                setAiStats({...aiService.getStats()});
                failCount++;
                addToast(`API Error: ${e.message}. Stopping process.`, 'error');
                break;
            }
        }
        setIsProcessingAI(false);
        
        if (failCount > 0) {
           addToast(`Finished: ${successCount} Success, ${failCount} Failed.`, 'error');
        } else {
           addToast(`Auto-Fill Complete (${successCount} Success)`, 'success');
        }
    };

    return {
        isProcessingAI,
        isSpinning,
        setIsSpinning,
        abortProcessingRef,
        handleSpinContent,
        handleToggleAutoAI
    };
}
