
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import PinCard from './PinCard';
import PinRow from './PinRow';
import BoardModal from './BoardModal';
import SettingsView from './SettingsView';
import PreviewModal from './PreviewModal';
import EditPinModal from './EditPinModal'; 
import CsvSettingsModal from './CsvSettingsModal';
import AdminDashboard from './AdminDashboard'; 
import { AIStudioView } from './AIStudioView';
import { IngestionHubView } from './IngestionHubView';
import { BulkQueueView } from './BulkQueueView';
import TrendingKeywordsView, { TrendingKeywordsState } from './TrendingKeywordsView';
import CompetitorAnalysisView from './CompetitorAnalysisView';
import Toast, { ToastMessage, ToastType } from './Toast';
import { usePinProcessor } from '../hooks/usePinProcessor';
import { Pin, Board, AIServiceProvider, SmartLinkSettings, ExportFormat, CsvExportSettings, AspectRatio, WebhookAccount, ImageHostSettings, ImageHostProvider, UserProfile, GlobalSettings } from '../types';
import { exportToCSV, exportToJSON, exportToGoogleSheet, parseContentPool, uploadImage, sendBatchToWebhook, scrapeImagesFromUrl, applyStealthFilters, remixTextLocal, generateSmartUTM, compressImage } from '../services/utils';
import { aiService } from '../services/aiService';
import { persistenceService } from '../services/persistence';
import { Download, Wand2, StopCircle, CheckSquare, Square, Trash2, Layers, ChevronDown, ChevronRight, Loader2, Globe, Settings, Sparkles, RefreshCw, Eraser, CheckCircle2, AlertTriangle, Sheet, FileJson, Lock, Megaphone, PanelRightOpen, UploadCloud, Search, ImageIcon } from 'lucide-react';
import JSZip from 'jszip';
import { User } from 'firebase/auth';
import { doc, increment, updateDoc, getDoc } from 'firebase/firestore'; 
import { db } from '../services/firebase';
import Papa from 'papaparse';



interface DashboardProps {
    user: User;
    isAdmin: boolean;
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, isAdmin, onLogout }) => {
  const navigate = useNavigate();
  const [pins, setPins] = useState<Pin[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [webhookAccounts, setWebhookAccounts] = useState<WebhookAccount[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string>(''); 
  const [activeTab, setActiveTab] = useState<'all' | 'ready' | 'error' | 'draft'>('all');

  // User Profile Data (fetched on load)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true); 
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [activeNavTab, setActiveNavTab] = useState('dashboard');
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
      if (typeof window !== 'undefined') {
          const savedTheme = localStorage.getItem('batchlyo_theme');
          return savedTheme ? savedTheme === 'dark' : false;
      }
      return false;
  });

  useEffect(() => {
      if (isDarkMode) {
          document.documentElement.classList.remove('light');
          localStorage.setItem('batchlyo_theme', 'dark');
      } else {
          document.documentElement.classList.add('light');
          localStorage.setItem('batchlyo_theme', 'light');
      }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isCsvSettingsModalOpen, setIsCsvSettingsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false); 
  
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showWebhookMenu, setShowWebhookMenu] = useState(false);
  
  const [isExportingCsv, setIsExportingCsv] = useState(false); 
  const [isSendingWebhook, setIsSendingWebhook] = useState(false); 
  const [isUploading, setIsUploading] = useState(false); 
  const [isScraping, setIsScraping] = useState(false); 
  const [scrapeUrl, setScrapeUrl] = useState('');

  const [selectedWebhookId, setSelectedWebhookId] = useState(''); 

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const webhookMenuRef = useRef<HTMLDivElement>(null);
  
  const abortExportRef = useRef<boolean>(false); 
  
  const [editingPin, setEditingPin] = useState<Pin | null>(null);

  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [pendingSource, setPendingSource] = useState<'scraped' | 'generated' | 'upload'>('generated');

  const [prompt, setPrompt] = useState('');
  const [imgCount, setImgCount] = useState(4);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [imageProvider, setImageProvider] = useState<AIServiceProvider>(AIServiceProvider.GEMINI);
  const [isStealthMode, setIsStealthMode] = useState(false);
  
  const [destinationLink, setDestinationLink] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleInterval, setScheduleInterval] = useState(30); 
  const [contentPool, setContentPool] = useState('');
  const [filterBoard, setFilterBoard] = useState<string>('ALL');
  
  const [isGenerating, setIsGenerating] = useState(false);
  

  
  const [importProgress, setImportProgress] = useState(0); // New for progress tracking
  const [isImporting, setIsImporting] = useState(false);

  const [currentProvider, setCurrentProvider] = useState<AIServiceProvider>(aiService.getProvider());

  const [aiStats, setAiStats] = useState({ requests: 0, lastLatency: 0, errors: 0 });

  // Active injected keywords shown as a banner in the queue
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);

  const {
      isProcessingAI,
      isSpinning,
      setIsSpinning,
      abortProcessingRef,
      handleSpinContent,
      handleToggleAutoAI
  } = usePinProcessor({
      pins, setPins, selectedCount: pins.filter(p => p.selected).length, activeAccountId, boards, isStealthMode, isAdmin,
      userProfile, globalSettings, setGlobalSettings, destinationLink, getSmartLinkSettings, trackUsage, addToast,
      activeKeywords
  });
  
  const [isAutoSmartLink, setIsAutoSmartLink] = useState(false); 

  // Navigated State Hookup
  const handleSendToAIStudio = (keyword: string) => {
      setPrompt(keyword);
      setActiveNavTab('generator');
  };

  // Persisted Trending Keywords state (survives tab switches)
  const [trendingState, setTrendingState] = useState<TrendingKeywordsState>({
      seed: '',
      results: null,
      selectedKeywords: new Set(),
  });

  // Fetch Full User Profile & Global Settings
  useEffect(() => {
      const fetchProfile = async () => {
          try {
              const docRef = doc(db, "users", user.uid);
              const snap = await getDoc(docRef);
              if (snap.exists()) {
                  const data = snap.data() as UserProfile;
                  setUserProfile(data);
                  
                  // Check for expired subscription
                  if (data.subscription && data.subscription.status === 'active' && data.subscription.periodEnd < Date.now()) {
                      // Auto-downgrade to starter if expired
                      await updateDoc(docRef, {
                          'subscription.status': 'expired'
                      });
                      addToast("Your subscription has expired. Downgraded to Starter plan.", 'warning');
                  }
              }
          } catch(e) {
              console.error("Failed to load user profile", e);
          }
      };
      
      const fetchGlobalSettings = async () => {
          try {
              const docRef = doc(db, "settings", "global");
              const snap = await getDoc(docRef);
              if (snap.exists()) {
                  setGlobalSettings(snap.data() as GlobalSettings);
              }
          } catch (e) { console.warn("Failed to load global settings"); }
      };

      fetchProfile();
      fetchGlobalSettings();
  }, [user]);

  // --- ANALYTICS TRACKING ---
  async function trackUsage(metric: 'generatedImages' | 'scrapedUrls' | 'exportedPins' | 'aiCalls' | 'remixUsage', amount: number = 1, accountId?: string) {
      try {
          const userRef = doc(db, "users", user.uid);
          let updateData: any = {};
          
          if (metric === 'remixUsage' && accountId) {
              const snap = await getDoc(userRef);
              const currentUsage = snap.data()?.usage || {};
              const currentRemix = currentUsage.remixUsage || {};
              updateData[`usage.remixUsage`] = {
                  ...currentRemix,
                  [accountId]: (currentRemix[accountId] || 0) + amount
              };
          } else {
              updateData[`usage.${metric}`] = increment(amount);
          }

          await updateDoc(userRef, {
              ...updateData,
              lastLogin: Date.now()
          });

          setUserProfile(prev => {
              if (!prev) return null;
              const currentUsage = prev.usage || { 
                  generatedImages: 0, scrapedUrls: 0, exportedPins: 0, aiCalls: 0, remixUsage: {} 
              };
              const newUsage = { ...currentUsage };
              if (metric === 'remixUsage' && accountId) {
                  newUsage.remixUsage = { ...(newUsage.remixUsage || {}), [accountId]: ((newUsage.remixUsage || {})[accountId] || 0) + amount };
              } else {
                  (newUsage as any)[metric] = ((newUsage as any)[metric] || 0) + amount;
              }
              return { ...prev, usage: newUsage };
          });
      } catch (e) {
          console.warn("Failed to track usage:", e);
      }
  };

  const handleStorageError = (e: unknown) => {
      console.warn("LocalStorage Quota Exceeded");
  };
  useEffect(() => {
    // Load Data (Mount)
    const loadInitialData = async () => {
        try {
            const savedBoards = localStorage.getItem('easyPin_boards');
            if (savedBoards) setBoards(JSON.parse(savedBoards));
            
            const savedImgProvider = localStorage.getItem('easyPin_imageProvider');
            if (savedImgProvider) setImageProvider(savedImgProvider as AIServiceProvider);

            const savedAccounts = localStorage.getItem('easyPin_webhookAccounts');
            if (savedAccounts) setWebhookAccounts(JSON.parse(savedAccounts));

            // LOAD PINS FROM INDEXEDDB (Performance Fix)
            const savedPins = await persistenceService.loadPins();
            if (savedPins && savedPins.length > 0) {
                setPins(savedPins);
            } else {
                // Fallback to localStorage if IndexedDB is empty (first time migration)
                const legacyPins = localStorage.getItem('easyPin_pins');
                if (legacyPins) {
                    const parsed = JSON.parse(legacyPins);
                    setPins(parsed);
                    await persistenceService.savePins(parsed); // Move to IndexedDB
                    localStorage.removeItem('easyPin_pins'); // Cleanup legacy
                }
            }
        } catch (e) { console.error("Data Load Failed", e); }

        try {
            const savedWorkstation = localStorage.getItem('easyPin_workstation');
            if (savedWorkstation) {
                const ws = JSON.parse(savedWorkstation);
                setPrompt(ws.prompt || '');
                setImgCount(ws.imgCount || 1);
                setAspectRatio(ws.aspectRatio || '9:16');
                setDestinationLink(ws.destinationLink || '');
                setSelectedBoardId(ws.selectedBoardId || '');
                setScheduleTime(ws.scheduleTime || '');
                setScheduleInterval(Number(ws.scheduleInterval) || 30);
                setContentPool(ws.contentPool || '');
                setFilterBoard(ws.filterBoard || 'ALL');
            }
        } catch (e) {}

        setAiStats(aiService.getStats());
        setDataLoaded(true);
    };

    loadInitialData();
  }, []);

  // SAVE PINS TO INDEXEDDB (Debounced)
  useEffect(() => { 
      if (!dataLoaded) return;
      
      const timer = setTimeout(async () => {
          try { 
              await persistenceService.savePins(pins);
          } catch (e) { console.error("IndexedDB Save Failed", e); }
      }, 1000); 

      return () => clearTimeout(timer);
  }, [pins, dataLoaded]);

  useEffect(() => { 
      if (!dataLoaded) return;
      try { localStorage.setItem('easyPin_boards', JSON.stringify(boards)); } catch(e) { handleStorageError(e); }
  }, [boards, dataLoaded]);

  useEffect(() => {
      if (!dataLoaded) return;
      const stateToSave = { prompt, imgCount, aspectRatio, destinationLink, selectedBoardId, scheduleTime, scheduleInterval, contentPool, filterBoard };
      try { localStorage.setItem('easyPin_workstation', JSON.stringify(stateToSave)); } catch(e) {}
  }, [prompt, imgCount, aspectRatio, destinationLink, selectedBoardId, scheduleTime, scheduleInterval, contentPool, filterBoard, dataLoaded]);

  useEffect(() => { 
      if (!dataLoaded) return;
      localStorage.setItem('easyPin_imageProvider', imageProvider); 
  }, [imageProvider, dataLoaded]);
  
  useEffect(() => { setSelectedBoardId(''); setFilterBoard('ALL'); }, [activeAccountId]);

  // Strict Board Enforcement on Account Switch or Board Change
  useEffect(() => {
      if (!dataLoaded || pins.length === 0) return;
      
      setPins(prev => {
          let changed = false;
          const validBoards = activeAccountId ? boards.filter(b => b.accountId === activeAccountId) : boards;
          const validBoardNames = validBoards.map(b => b.name);
          
          const newPins = prev.map(p => {
              const hasInvalidBoard = p.board && !validBoardNames.includes(p.board);
              const hasNoBoardButCanHaveOne = !p.board && validBoardNames.length > 0;
              
              if (hasInvalidBoard || hasNoBoardButCanHaveOne) {
                  changed = true;
                  const forcedBoard = validBoardNames.length > 0 ? validBoardNames[0] : '';
                  const newStatus = (p.title && p.description && forcedBoard) ? 'ready' : 'draft';
                  return { ...p, board: forcedBoard, status: newStatus as any };
              }
              return p;
          });
          return changed ? newPins : prev;
      });
  }, [activeAccountId, boards, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded && pins.length > 0) {
        const optimizeForWorkspace = async () => {
            const accId = activeAccountId || 'default';
            
            // 1. Check who needs IMAGE optimization
            const needsImageOptimization = pins.filter(p => 
                p.originalImageUrl?.startsWith('data:') && 
                (!p.accountOptimizedImages || !p.accountOptimizedImages[accId])
            );

            // 2. Check who needs METADATA optimization (Smart Variation)
            const needsMetadataOptimization = pins.filter(p => 
                p.originalTitle && 
                (!p.accountMetadata || !p.accountMetadata[accId])
            );

            const needsOptimizationCount = needsImageOptimization.length + needsMetadataOptimization.length;

            // 3. UI Swap logic: Do we need to sync the current state to the account's stored data?
            const needsSwap = pins.some(p => {
                const storedImg = p.accountOptimizedImages?.[accId] || p.originalImageUrl;
                const storedMeta = p.accountMetadata?.[accId];
                const imgDiff = p.imageUrl !== storedImg;
                const metaDiff = storedMeta && (p.title !== storedMeta.title || p.description !== storedMeta.description);
                return imgDiff || metaDiff;
            });

            if (needsOptimizationCount === 0 && !needsSwap) return;

            if (needsOptimizationCount > 0) setIsSpinning(true);
            
            try {
                const processed = await Promise.all(pins.map(async (pin) => {
                    let updatedPin = { ...pin };
                    const currentStoredImg = pin.accountOptimizedImages?.[accId];
                    const currentStoredMeta = pin.accountMetadata?.[accId];

                    // --- IMAGE SYNC ---
                    if (currentStoredImg) {
                        updatedPin.imageUrl = currentStoredImg;
                    } else if (pin.originalImageUrl?.startsWith('data:')) {
                        const cropped = await applyStealthFilters(pin.originalImageUrl);
                        updatedPin.imageUrl = cropped;
                        updatedPin.accountOptimizedImages = {
                            ...(pin.accountOptimizedImages || {}),
                            [accId]: cropped
                        };
                    } else {
                        updatedPin.imageUrl = pin.originalImageUrl || pin.imageUrl;
                    }

                    // --- METADATA SYNC (The "Smart Variation" Logic) ---
                    if (currentStoredMeta) {
                        updatedPin.title = currentStoredMeta.title;
                        updatedPin.description = currentStoredMeta.description;
                        updatedPin.tags = currentStoredMeta.tags;
                    } else if (pin.originalTitle) {
                        // Generate FREE local variation for this account slot from the AI "Source of Truth"
                        const basePinForRemix = {
                            ...pin,
                            title: pin.originalTitle,
                            description: pin.originalDescription || '',
                            tags: pin.originalTags || []
                        };
                        const variations = remixTextLocal(basePinForRemix);
                        
                        updatedPin.title = variations.title || pin.originalTitle;
                        updatedPin.description = variations.description || pin.originalDescription || '';
                        updatedPin.tags = variations.tags || pin.originalTags || [];

                        updatedPin.accountMetadata = {
                            ...(pin.accountMetadata || {}),
                            [accId]: {
                                title: updatedPin.title,
                                description: updatedPin.description,
                                tags: updatedPin.tags
                            }
                        };
                    }

                    return updatedPin;
                }));

                setPins(processed);
                if (needsOptimizationCount > 0) {
                    addToast(`Workspace Synced: Unique variations generated for this account`, 'info');
                }
            } catch(e) {
                console.error("Per-Account Optimization Failed", e);
            } finally {
                setIsSpinning(false);
            }
        };
        const timer = setTimeout(() => optimizeForWorkspace(), 300);
        return () => clearTimeout(timer);
    }
  }, [activeAccountId, dataLoaded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) setShowExportMenu(false);
        if (webhookMenuRef.current && !webhookMenuRef.current.contains(event.target as Node)) setShowWebhookMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addToast(message: string, type: ToastType = 'info') {
      const id = uuidv4();
      setToasts(prev => {
          const newToasts = [...prev, { id, type, message }];
          if (newToasts.length > 3) return newToasts.slice(newToasts.length - 3);
          return newToasts;
      });
  };

  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  const groupedPins = useMemo(() => {
    const groups: Record<string, Pin[]> = {};
    pins.forEach(pin => {
      const boardName = pin.board && pin.board.trim() !== '' ? pin.board : 'Unsorted';
      if (!groups[boardName]) groups[boardName] = [];
      groups[boardName].push(pin);
    });
    return groups;
  }, [pins]);

  const availableBoards = useMemo(() => {
    return Object.keys(groupedPins).sort((a, b) => {
      if (a === 'Unsorted') return -1;
      if (b === 'Unsorted') return 1;
      return a.localeCompare(b);
    });
  }, [groupedPins]);

  const [visibleCount, setVisibleCount] = useState(20);

  const displayedPins = useMemo(() => {
    let filtered = pins;
    if (filterBoard !== 'ALL') {
       filtered = filtered.filter(p => {
         const b = p.board && p.board.trim() !== '' ? p.board : 'Unsorted';
         return b === filterBoard;
       });
    }
    if (activeTab === 'ready') return filtered.filter(p => p.status === 'ready');
    if (activeTab === 'error') return filtered.filter(p => p.status === 'error');
    if (activeTab === 'draft') return filtered.filter(p => p.status === 'draft');
    return filtered;
  }, [pins, filterBoard, activeTab]);

  const visiblePins = useMemo(() => {
      return displayedPins.slice(0, visibleCount);
  }, [displayedPins, visibleCount]);

  useEffect(() => {
      setVisibleCount(20);
  }, [filterBoard, activeTab]);

  const getBoardIdMap = (targetAccountId?: string | null) => {
    const map: Record<string, string> = {};
    const contextId = targetAccountId === null ? '' : (targetAccountId || activeAccountId);
    boards.forEach(b => {
        if (contextId && b.accountId && b.accountId !== contextId) return;
        if (b.name) map[b.name] = b.externalId || '';
    });
    return map;
  };

  const getImageSettings = (): ImageHostSettings => {
      const saved = localStorage.getItem('easyPin_imgHostSettings');
      if (saved) return JSON.parse(saved);
      return { provider: ImageHostProvider.IMGBB, apiKey: localStorage.getItem('easyPin_imgbbKey') || '' };
  };
  
  function getSmartLinkSettings(): SmartLinkSettings {
      const saved = localStorage.getItem('easyPin_smartLink');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
      return { enabled: false, platform: 'blogger', baseUrl: '', customPath: '' };
  };

  const handleScrape = async (url: string) => {
    if (!url) return;
    setIsScraping(true);
    try {
        const images = await scrapeImagesFromUrl(url);
        if (images.length === 0) { addToast("No accessible images found.", 'error'); return; }
        
        await trackUsage('scrapedUrls', 1); // Analytics

        setPendingImages(images);
        setPendingSource('scraped');
        setIsPreviewModalOpen(true);
    } catch (e: any) { addToast(`Scrape failed: ${e.message}`, 'error'); } finally { setIsScraping(false); }
  };

  const handleGenerateImages = async () => {
      if (!prompt.trim()) return;
      setIsGenerating(true);
      const activeKey = aiService.getApiKey(imageProvider);
      if (imageProvider !== AIServiceProvider.POLLINATIONS && !activeKey) { 
          addToast(`API Key missing for ${imageProvider}.`, 'error'); 
          // setIsSettingsModalOpen(true); // This variable is not defined in the current scope.
          setIsGenerating(false); 
          return; 
      }
      if (imageProvider === AIServiceProvider.CLOUDFLARE && !aiService.getCloudflareAccountId()) { addToast("Cloudflare ID required.", 'error'); /* setIsSettingsModalOpen(true); */ setIsGenerating(false); return; }

      try {
          const images = await aiService.generateImages(prompt, imgCount, aspectRatio, imageProvider);
          setAiStats({...aiService.getStats()});
          
          if (images.length === 0) { addToast("No images generated.", 'error'); return; }
          
          await trackUsage('generatedImages', images.length); // Analytics

          setPendingImages(images);
          setPendingSource('generated');
          // Removed tracking of PreviewModal for generated images. AIStudioView handles it now.
      } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          addToast(`Image Generation Failed: ${msg}`, 'error');
          setAiStats({...aiService.getStats()});
      } finally { setIsGenerating(false); }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const allImages: string[] = [];
    const csvPins: Pin[] = [];

    try {
        for (const file of Array.from(files)) {
            if (file.name.toLowerCase().endsWith('.csv')) {
                // ... CSV parsing logic (keep as is as it builds csvPins)
                await new Promise<void>((resolve, reject) => {
                  Papa.parse(file, {
                      header: true,
                      skipEmptyLines: true,
                      transformHeader: (h) => h.toLowerCase().trim().replace(/[\s_]+/g, ''),
                      complete: (results) => {
                          results.data.forEach((row: any) => {
                              const imageUrl = row.imageurl || row.image || row.mediaurl || row.url || '';
                              const title = row.title || row.name || row.headline || '';
                              const description = row.description || row.desc || row.caption || '';
                              const destinationLink = row.destinationlink || row.link || row.website || '';
                              const board = row.board || row.boardname || row.category || '';
                              
                              let tags: string[] = [];
                              const tagsRaw = row.tags || row.keywords || '';
                              if (typeof tagsRaw === 'string' && tagsRaw.trim() !== '') {
                                  tags = tagsRaw.split(/[,;]+/).map(t => t.trim()).filter(t => t !== '');
                              }

                              if (imageUrl || title) {
                                  csvPins.push({
                                      id: uuidv4(),
                                      imageUrl: imageUrl || 'https://via.placeholder.com/150?text=No+Image',
                                      originalImageUrl: imageUrl || 'https://via.placeholder.com/150?text=No+Image',
                                      accountOptimizedImages: {},
                                      originalTitle: title || '',
                                      originalDescription: description || '',
                                      originalTags: tags,
                                      accountMetadata: {},
                                      title: title || 'Untitled Pin',
                                      description,
                                      destinationLink,
                                      board,
                                      tags,
                                      status: 'draft',
                                      source: 'upload',
                                      selected: false,
                                      createdAt: Date.now()
                                  });
                              }
                          });
                          resolve();
                      },
                      error: reject
                  });
                });
            } else if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')) {
                 try {
                     const zip = new JSZip();
                     const content = await zip.loadAsync(file);
                     for (const entry of Object.values(content.files)) {
                         const zipEntry = entry as any;
                         if (zipEntry.dir) continue;
                         const name = zipEntry.name.toLowerCase();
                         if (!name.startsWith('.') && /\.(jpg|jpeg|png|gif|webp)$/.test(name)) {
                             const blob = await zipEntry.async('blob');
                             const blobUrl = URL.createObjectURL(blob);
                             allImages.push(blobUrl);
                         }
                     }
                 } catch (e) { addToast("Zip error.", 'error'); }
            } else if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name)) {
                // PERFORMANCE FIX: Use Blob URL instead of Base64 for preview
                const blobUrl = URL.createObjectURL(file);
                allImages.push(blobUrl);
            }
        }


        if (csvPins.length > 0) {
            setPins(prev => [...csvPins, ...prev]);
            addToast(`Imported ${csvPins.length} pins from CSV.`, 'success');
        }

        if (allImages.length > 0) { 
            setPendingImages(allImages); 
            setPendingSource('upload'); 
            setIsPreviewModalOpen(true); 
        } else if (csvPins.length === 0) { 
            addToast("No valid images or CSV data found.", 'error'); 
        }
    } catch (e) { 
        addToast("Upload failed.", 'error'); 
    } finally { 
        setIsUploading(false); 
    }
  };

  const handleConfirmImport = async (approvedImages: string[], clearPending: boolean = true) => {
    setIsPreviewModalOpen(false);
    if (clearPending) {
        setPendingImages([]); // Clear preview immediately to free memory
    }
    setIsImporting(true);
    setImportProgress(0);
    
    let processedImages: string[] = [];
    const total = approvedImages.length;
    
    // Batch process to avoid UI freeze and memory spikes
    const batchSize = 10;
    for (let i = 0; i < approvedImages.length; i += batchSize) {
        const batch = approvedImages.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(async (img) => {
            try {
                let finalUrl = img;
                // If it's a blob, convert to optimized WebP Base64 to save memory before storing in React state
                if (img.startsWith('blob:')) {
                    finalUrl = await compressImage(img);
                    URL.revokeObjectURL(img); // Memory management: Cleanup blob URL
                }
                
                if (isStealthMode) {
                    finalUrl = await applyStealthFilters(finalUrl);
                }
                return finalUrl;
            } catch (e) { 
                console.error("Processing error", e);
                return null; 
            }
        }));

        processedImages.push(...results.filter(r => r !== null) as string[]);
        setImportProgress(Math.round(((i + batch.length) / total) * 100));
        
        // Let UI re-render
        await new Promise(r => setTimeout(r, 20));
    }

    const newPins: Pin[] = processedImages.map(img => ({
      id: uuidv4(), 
      imageUrl: img, 
      originalImageUrl: img,
      accountOptimizedImages: {},
      originalTitle: '',
      originalDescription: '',
      originalTags: [],
      accountMetadata: {},
      title: '', 
      description: '', 
      tags: [], 
      destinationLink: (pendingSource === 'scraped' || pendingSource === 'generated') ? destinationLink : '', 
      board: '', 
      status: 'draft', 
      source: pendingSource, 
      selected: false, 
      createdAt: Date.now()
    }));
    
    setPins(prev => [...newPins, ...prev]);
    setIsImporting(false);
    addToast(`Added ${newPins.length} pins to queue`, 'success');
    if (pendingSource === 'generated') setPrompt('');
  };


  const handleDeletePin = (id: string) => setPins(prev => prev.filter(p => p.id !== id));
  const handleDeleteSelected = () => {
    const count = pins.filter(p => p.selected).length;
    if (count > 0 && window.confirm(`Delete ${count} pins?`)) setPins(prev => prev.filter(p => !p.selected));
  };
  
  const handleClearInfo = () => {
      const selected = pins.filter(p => p.selected);
      if (selected.length === 0) return;
      if (window.confirm(`Clear details (Title, Description, Tags, Board) for ${selected.length} pins?`)) {
          setPins(prev => prev.map(p => {
              if (p.selected) {
                  return { 
                      ...p, 
                      title: '', 
                      description: '', 
                      tags: [], 
                      board: '', 
                      destinationLink: '', 
                      status: 'draft',
                      originalTitle: '',
                      originalDescription: '',
                      originalTags: [],
                      accountMetadata: {},
                      accountOptimizedImages: {}
                  };
              }
              return p;
          }));
          addToast("Pins Reset to Draft", 'info');
      }
  };

  const handleToggleSelect = (id: string) => setPins(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  const handleSelectAll = () => {
    const allSelected = displayedPins.length > 0 && displayedPins.every(p => p.selected);
    setPins(prev => prev.map(p => {
        if (filterBoard !== 'ALL') {
            const b = p.board && p.board.trim() !== '' ? p.board : 'Unsorted';
            if (b !== filterBoard) return p; 
        }
        return { ...p, selected: !allSelected };
    }));
  };
  const handleEditPin = (pin: Pin) => setEditingPin(pin);
  const handleSaveEditedPin = (updatedPin: Pin) => {
    setPins(prev => prev.map(p => p.id === updatedPin.id ? updatedPin : p));
    setEditingPin(null);
  };
  const handleReset = () => {
    if(window.confirm("Clear EVERYTHING?")) {
      setPins([]); setPrompt(''); setFilterBoard('ALL'); setDestinationLink(''); setContentPool(''); setScheduleTime('');
      aiService.clearHistory(); localStorage.removeItem('easyPin_pins'); localStorage.removeItem('easyPin_workstation');
      addToast("Project cleared", 'info');
    }
  };

  const handleCancelExport = () => { abortExportRef.current = true; setIsExportingCsv(false); setIsSendingWebhook(false); };

  // --- PERMISSION CHECKS ---
  const isSubscriptionActive = () => {
      if (isAdmin) return true;
      if (!userProfile?.subscription) return false;
      if (userProfile.subscription.status === 'lifetime') return true;
      if (userProfile.subscription.status !== 'active') return false;
      return userProfile.subscription.periodEnd > Date.now();
  };

  const checkExportLimit = (count: number) => {
      const plan = isSubscriptionActive() ? (userProfile?.subscription?.plan || 'starter') : 'starter';
      const currentUsage = userProfile?.usage?.exportedPins || 0;
      let limit = 50;
      if (plan === 'pro') limit = 5000;
      if (plan === 'agency') limit = 50000;

      if ((currentUsage + count) > limit) {
          addToast(`Monthly limit reached for ${plan} plan (${limit} pins). Upgrade to export more.`, 'error');
          return false;
      }
      return true;
  };

  const handleExport = async (format: ExportFormat) => {
      const imgSettings = getImageSettings();
      if (imgSettings.provider === 'IMGBB' && !imgSettings.apiKey) { addToast("ImgBB Key Missing.", 'error'); /* setIsSettingsModalOpen(true); */ return; }
      if (imgSettings.provider === 'CLOUDINARY' && (!imgSettings.cloudName || !imgSettings.uploadPreset)) { addToast("Cloudinary Config Missing.", 'error'); /* setIsSettingsModalOpen(true); */ return; }
      if (imgSettings.provider === 'FREEIMAGE' && !imgSettings.apiKey) { addToast("FreeImage Key Missing.", 'error'); /* setIsSettingsModalOpen(true); */ return; }

      setShowExportMenu(false);
      
      // CHECK LIMIT
      if (!checkExportLimit(pins.length)) return;

      let customSettings: CsvExportSettings | undefined = undefined;
      if (format === 'custom' || format === 'json') {
          const saved = localStorage.getItem('easyPin_csvSettings');
          if (saved) { try { customSettings = JSON.parse(saved); } catch(e){} }
      }
      setIsExportingCsv(true); abortExportRef.current = false;
      try {
          const pinsToExport = JSON.parse(JSON.stringify(pins));
          for (const pin of pinsToExport) {
              if (abortExportRef.current) throw new Error("Cancelled");
              if (pin.imageUrl.startsWith('data:') || pin.imageUrl.startsWith('blob:')) {
                  const hostedUrl = await uploadImage(pin.imageUrl, imgSettings);
                  if (hostedUrl && hostedUrl.startsWith('http')) {
                       pin.imageUrl = hostedUrl;
                       setPins(prev => prev.map(p => p.id === pin.id ? { ...p, imageUrl: hostedUrl } : p));
                  }
                  else throw new Error("Upload returned empty URL");
                  await new Promise(r => setTimeout(r, 500));
              }
          }
          if (abortExportRef.current) throw new Error("Cancelled");
          const boardIdMap = getBoardIdMap(null);
          if (format === 'json') exportToJSON(pinsToExport, customSettings, boardIdMap);
          else exportToCSV(pinsToExport, format, customSettings, boardIdMap);
          
          await trackUsage('exportedPins', pinsToExport.length); // Analytics

          addToast("Export Successful", 'success');
      } catch (e: any) { if (e.message !== "Cancelled") addToast(`Export failed: ${e.message}`, 'error'); } finally { setIsExportingCsv(false); }
  };
  
  const handleSendToWebhook = async () => {
     if (!selectedWebhookId) return;
     const account = webhookAccounts.find(a => a.id === selectedWebhookId);
     if (!account) return;
     
     // CHECK PERMISSION FOR WEBHOOKS (Pro/Agency only)
     const plan = isSubscriptionActive() ? (userProfile?.subscription?.plan || 'starter') : 'starter';
     if (plan === 'starter') {
         addToast("Webhooks are only available on active Pro/Agency plans.", 'error');
         return;
     }

     // CHECK LIMIT
     if (!checkExportLimit(pins.length)) return;

     const imgSettings = getImageSettings();
     if (imgSettings.provider === 'IMGBB' && !imgSettings.apiKey) { addToast("ImgBB Key Missing.", 'error'); /* setIsSettingsModalOpen(true); */ return; }
     if (imgSettings.provider === 'CLOUDINARY' && (!imgSettings.cloudName || !imgSettings.uploadPreset)) { addToast("Cloudinary Config Missing.", 'error'); /* setIsSettingsModalOpen(true); */ return; }
     if (imgSettings.provider === 'FREEIMAGE' && !imgSettings.apiKey) { addToast("FreeImage Key Missing.", 'error'); /* setIsSettingsModalOpen(true); */ return; }

     setShowExportMenu(false); setShowWebhookMenu(false);
     setIsSendingWebhook(true); abortExportRef.current = false;
     try {
          let customSettings: CsvExportSettings | undefined = undefined;
          const saved = localStorage.getItem('easyPin_csvSettings');
          if (saved) { try { customSettings = JSON.parse(saved); } catch(e){} }
          const pinsToExport = JSON.parse(JSON.stringify(pins));
          
          for (const pin of pinsToExport) {
              if (abortExportRef.current) throw new Error("Cancelled");
              if (pin.imageUrl.startsWith('data:') || pin.imageUrl.startsWith('blob:')) {
                  try {
                      const hostedUrl = await uploadImage(pin.imageUrl, imgSettings);
                      if (hostedUrl && hostedUrl.startsWith('http')) {
                          pin.imageUrl = hostedUrl;
                          setPins(prev => prev.map(p => p.id === pin.id ? { ...p, imageUrl: hostedUrl } : p));
                      } else {
                          throw new Error("Empty URL returned from host");
                      }
                  } catch(e: any) {
                      throw new Error(`Image Upload Failed for ${pin.id}: ${e.message}`);
                  }
                  await new Promise(r => setTimeout(r, 500));
              }
          }
          
          if (abortExportRef.current) throw new Error("Cancelled");
          const boardIdMap = getBoardIdMap(selectedWebhookId);
          if (account.url.includes('script.google.com')) {
              await exportToGoogleSheet(account.url, pinsToExport, customSettings, boardIdMap);
              addToast("Sent to Google Sheet!", 'success');
          } else {
              await sendBatchToWebhook(account.url, pinsToExport, customSettings, boardIdMap, true);
              addToast("Sent to Webhook!", 'success');
          }
          
          await trackUsage('exportedPins', pinsToExport.length); // Analytics

     } catch (e: any) { if (e.message !== "Cancelled") addToast(`Failed: ${e.message}`, 'error'); } finally { setIsSendingWebhook(false); }
  };

  const handleSettingsSaved = () => {
    setCurrentProvider(aiService.getProvider()); setAiStats(aiService.getStats()); 
    const saved = localStorage.getItem('easyPin_webhookAccounts');
    if (saved) { try { setWebhookAccounts(JSON.parse(saved)); } catch(e) {} }
    addToast("Settings Saved", 'success');
  };

  const addBoard = (name: string, externalId?: string) => { setBoards(prev => [...prev, { id: uuidv4(), name: name.trim(), accountId: activeAccountId, externalId }]); };
  const deleteBoard = (id: string) => setBoards(prev => prev.filter(b => b.id !== id));
  const addBoardBulk = (lines: string[]) => { 
      const newBoards: Board[] = lines.map(line => {
          const parts = line.split('|');
          const name = parts[0].trim();
          let id = undefined;
          if (parts.length > 1 && parts[1].trim()) {
             id = parts[1].trim();
          }
          return { id: uuidv4(), name, externalId: id, accountId: activeAccountId };
      });
      setBoards(prev => [...prev, ...newBoards]);
  };

  const handleApplyAll = () => {
      const contentBlocks = parseContentPool(contentPool);
      let nextScheduleTime = scheduleTime ? new Date(scheduleTime).getTime() : 0;
      let contentIndex = 0;
      let selectedIndex = 0;
      const globalSmartLinkSettings = getSmartLinkSettings(); // Fallback

      setPins(prev => prev.map(pin => {
          if (!pin.selected) return pin;
          const updates: Partial<Pin> = {};
          
          if (destinationLink.trim()) {
              let baseLink = destinationLink.trim();
              
              // 1. Determine which Account this Pin belongs to via the assigned Board
              let assignedAccountId: string | undefined = undefined;
              let smartLinkConfig: SmartLinkSettings = globalSmartLinkSettings;
              
              const targetBoardId = selectedBoardId || pin.board;
              if (targetBoardId) {
                  const targetBoard = boards.find(b => b.id === targetBoardId);
                  if (targetBoard && targetBoard.accountId) {
                      assignedAccountId = targetBoard.accountId;
                      const account = webhookAccounts.find(a => a.id === assignedAccountId);
                      // Use Account specific Smart Link if enabled
                      if (account && account.smartLink && account.smartLink.enabled) {
                          smartLinkConfig = account.smartLink;
                      }
                  }
              }

              // 2. Generate the Smart URL using the specific config
              let rawUrl = baseLink;
              if (smartLinkConfig.enabled) {
                  // Only Auto-append keywords if properly configured
                  if (isAutoSmartLink && pin.tags && pin.tags.length > 0) {
                      const primaryKeyword = encodeURIComponent(pin.tags[0].replace('#', '').trim());
                      // Only platform presets that map URL parameters appropriately
                      if (smartLinkConfig.platform === 'wordpress') {
                          rawUrl = `${smartLinkConfig.baseUrl}/?s=${primaryKeyword}`;
                      } else if (smartLinkConfig.platform === 'custom') {
                          rawUrl = `${smartLinkConfig.baseUrl}${smartLinkConfig.customPath}${primaryKeyword}`;
                      } else {
                          // Fallback to basic URL appending if not explicitly handled (Blogger, etc)
                          const separator = baseLink.includes('?') ? '&' : '?';
                          rawUrl = `${baseLink}${separator}search=${primaryKeyword}`;
                      }
                  } else {
                       // No Auto-Keyword, just UTM the base link
                       rawUrl = baseLink;
                  }
                  updates.destinationLink = generateSmartUTM(rawUrl);
              } else {
                  // Completely Fallback if no Smart Link configs exist for this account or globally
                  if (isAutoSmartLink && pin.tags && pin.tags.length > 0) {
                      const primaryKeyword = encodeURIComponent(pin.tags[0].replace('#', '').trim());
                      const separator = baseLink.includes('?') ? '&' : '?';
                      rawUrl = `${baseLink}${separator}search=${primaryKeyword}`;
                  }
                  updates.destinationLink = rawUrl;
              }
          }
          if (selectedBoardId) updates.board = selectedBoardId;
          
          if (contentBlocks.length > 0) {
              const block = contentBlocks[contentIndex % contentBlocks.length];
              updates.title = block.title; updates.description = block.description; updates.tags = block.tags;
              contentIndex++;
          }
          if (nextScheduleTime > 0) {
               const timeForThisPin = new Date(nextScheduleTime + (selectedIndex * scheduleInterval * 60000));
               updates.scheduledTime = timeForThisPin.toISOString(); selectedIndex++;
          }
          const mergedPin = { ...pin, ...updates };
          updates.status = (mergedPin.title && mergedPin.description && mergedPin.destinationLink && mergedPin.board) ? 'ready' : 'draft';
          return { ...pin, ...updates };
      }));
      addToast("Applied settings to selected pins", 'success');
  };



  const allSelected = displayedPins.length > 0 && displayedPins.every(p => p.selected);
  const selectedCount = pins.filter(p => p.selected).length;
  const errorCount = pins.filter(p => p.status === 'error').length;
  const readyCount = pins.filter(p => p.status === 'ready').length;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-main text-text-main transition-colors duration-300">
      <Header 
        currentProvider={currentProvider} 
        onReset={handleReset}
        onOpenCsvSettings={() => setIsCsvSettingsModalOpen(true)}
        onOpenAdmin={() => navigate('/admin')}
        stats={aiStats}
        user={user}
        userProfile={userProfile}
        isAdmin={isAdmin}
        onLogout={onLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          activeNavTab={activeNavTab}
          onNavChange={(tab) => setActiveNavTab(tab)}
          onOpenSettings={() => setActiveNavTab('settings')}
          isOpen={isLeftSidebarOpen}
          onToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        />

        <main className={`flex-1 p-8 overflow-y-auto custom-scrollbar relative bg-main h-full transition-all duration-300`}>
          

          
          {/* Global Announcement Banner */}
          {globalSettings?.announcement?.enabled && globalSettings?.announcement?.message && (
              <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${
                  globalSettings.announcement.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  globalSettings.announcement.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                  <Megaphone className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm font-medium leading-relaxed">
                      {globalSettings.announcement.message}
                  </div>
              </div>
          )}

          {/* 2-Column Grid Architecture */}
          <div className="flex flex-col xl:flex-row gap-6 w-full">
              
              {/* LEFT COLUMN: Main Content */}
              <div className="flex-1 min-w-0 space-y-6">

                   {activeNavTab === 'dashboard' && (
                       <div className="bg-transparent">
                           <h2 className="text-xl font-bold text-text-main mb-4 tracking-tight">Activity Overview</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  
                  {/* Stat Card 1: Pins In Queue */}
                  <div className="bg-panel rounded-2xl p-5 shadow-sm border border-border flex flex-col justify-between hover:border-indigo-500/30 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                              <Layers className="w-4 h-4 text-pink-500" />
                          </div>
                          <div>
                              <p className="text-2xl font-bold text-text-main">{pins.length}</p>
                              <p className="text-[11px] font-semibold text-text-muted mt-0.5">Pins in Workspace</p>
                          </div>
                      </div>
                      <div className="mt-2 w-full bg-border/40 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-pink-500 h-full rounded-full" style={{ width: `${Math.min((pins.length / 100) * 100, 100)}%` }}></div>
                      </div>
                  </div>

                  {/* Stat Card 2: Generated Images */}
                  <div className="bg-panel rounded-2xl p-5 shadow-sm border border-border flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                              <p className="text-2xl font-bold text-text-main">{userProfile?.usage?.generatedImages || 0}</p>
                              <p className="text-[11px] font-semibold text-text-muted mt-0.5">Total Generated</p>
                          </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">Lifetime Value</span>
                          <span className="text-[10px] text-text-muted">Account History</span>
                      </div>
                  </div>

                  {/* Stat Card 3: AI Operations */}
                  <div className="bg-panel rounded-2xl p-5 shadow-sm border border-border flex flex-col justify-between hover:border-blue-500/30 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-blue-500" />
                          </div>
                          <div>
                              <p className="text-2xl font-bold text-text-main">{userProfile?.usage?.aiCalls || 0}</p>
                              <p className="text-[11px] font-semibold text-text-muted mt-0.5">AI Operations</p>
                          </div>
                      </div>
                      <div className="mt-2 w-full bg-border/40 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: '45%' }}></div>
                      </div>
                  </div>

                  {/* Stat Card 4: Trending Tags */}
                  <div className="bg-panel rounded-2xl p-5 shadow-sm border border-border flex flex-col justify-between hover:border-orange-500/30 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                              <RefreshCw className="w-4 h-4 text-orange-500" />
                          </div>
                          <div>
                              <p className="text-2xl font-bold text-text-main">14.2k</p>
                              <p className="text-[11px] font-semibold text-text-muted mt-0.5">Daily Impressions</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                          <span className="text-[8px] font-bold px-1.5 py-0.5 bg-orange-500/10 text-orange-500 rounded tracking-tight">#pins</span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 rounded tracking-tight">#growth</span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded tracking-tight">+4 more</span>
                      </div>
                  </div>

               </div>

               {/* Metrics Progress Panels Row */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                   <div className="bg-panel border border-border rounded-2xl p-5 shadow-sm">
                       <div className="flex justify-between items-center mb-4">
                           <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">Pins Performance</h3>
                           <span className="text-[10px] font-bold text-emerald-500">+12% vs last week</span>
                       </div>
                       <div className="space-y-4">
                           <div className="space-y-1.5">
                               <div className="flex justify-between text-[10px] font-bold text-text-main">
                                   <span>Generated Pins</span>
                                   <span>72%</span>
                               </div>
                               <div className="w-full bg-border/20 h-2 rounded-full overflow-hidden">
                                   <div className="h-full bg-indigo-500 rounded-full" style={{ width: '72%' }}></div>
                               </div>
                           </div>
                           <div className="space-y-1.5">
                               <div className="flex justify-between text-[10px] font-bold text-text-main">
                                   <span>Exported Data</span>
                                   <span>45%</span>
                               </div>
                               <div className="w-full bg-border/20 h-2 rounded-full overflow-hidden">
                                   <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }}></div>
                               </div>
                           </div>
                       </div>
                   </div>

                   <div className="bg-panel border border-border rounded-2xl p-5 shadow-sm">
                       <div className="flex justify-between items-center mb-4">
                           <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">AI Studio Efficiency</h3>
                           <span className="text-[10px] font-bold text-blue-500">Optimized Images</span>
                       </div>
                       <div className="space-y-4">
                           <div className="space-y-1.5">
                               <div className="flex justify-between text-[10px] font-bold text-text-main">
                                   <span>Image Synthesis</span>
                                   <span>88%</span>
                               </div>
                               <div className="w-full bg-border/20 h-2 rounded-full overflow-hidden">
                                   <div className="h-full bg-blue-500 rounded-full" style={{ width: '88%' }}></div>
                               </div>
                           </div>
                           <div className="space-y-1.5">
                               <div className="flex justify-between text-[10px] font-bold text-text-main">
                                   <span>Title Generation</span>
                                   <span>94%</span>
                               </div>
                               <div className="w-full bg-border/20 h-2 rounded-full overflow-hidden">
                                   <div className="h-full bg-pink-500 rounded-full" style={{ width: '94%' }}></div>
                               </div>
                           </div>
                       </div>
                   </div>
               </div>
          </div>
                   )}



                   {activeNavTab === 'generator' && (
                       <AIStudioView 
                           prompt={prompt}
                           setPrompt={setPrompt}
                           aspectRatio={aspectRatio}
                           setAspectRatio={setAspectRatio}
                           imageProvider={imageProvider}
                           setImageProvider={setImageProvider}
                           imgCount={imgCount}
                           setImgCount={setImgCount}
                           handleGenerateImages={handleGenerateImages}
                           isGenerating={isGenerating}
                           pendingImages={pendingImages}
                           setPendingImages={setPendingImages}
                           handleConfirmImport={handleConfirmImport}
                           isImporting={isImporting}
                       />
                   )}

                   {activeNavTab === 'upload' && (
                       <IngestionHubView
                           handleFileUpload={handleFileUpload}
                           scrapeUrl={scrapeUrl}
                           setScrapeUrl={setScrapeUrl}
                           handleScrape={handleScrape}
                           isScraping={isScraping}
                       />
                   )}


                   {activeNavTab === 'workspace' && (
                       <BulkQueueView 
                           filterBoard={filterBoard} setFilterBoard={setFilterBoard} displayedPins={displayedPins} 
                           allSelected={allSelected} handleSelectAll={handleSelectAll} selectedCount={selectedCount} 
                           handleDeleteSelected={handleDeleteSelected} handleClearInfo={handleClearInfo} isProcessingAI={isProcessingAI} 
                           errorCount={errorCount} handleToggleAutoAI={handleToggleAutoAI} handleSpinContent={handleSpinContent} 
                           pins={pins} isSpinning={isSpinning} isAdmin={isAdmin} userProfile={userProfile} 
                           activeAccountId={activeAccountId} setActiveAccountId={setActiveAccountId} webhookMenuRef={webhookMenuRef} isSendingWebhook={isSendingWebhook} 
                           handleCancelExport={handleCancelExport} showWebhookMenu={showWebhookMenu} setShowWebhookMenu={setShowWebhookMenu} 
                           webhookAccounts={webhookAccounts} onOpenSettings={() => setActiveNavTab('settings')} selectedWebhookId={selectedWebhookId} 
                           setSelectedWebhookId={setSelectedWebhookId} handleSendToWebhook={handleSendToWebhook} exportMenuRef={exportMenuRef} 
                           isExportingCsv={isExportingCsv} showExportMenu={showExportMenu} setShowExportMenu={setShowExportMenu} 
                           handleExport={handleExport} activeTab={activeTab} setActiveTab={setActiveTab} readyCount={readyCount} 
                           availableBoards={availableBoards} groupedPins={groupedPins} visiblePins={visiblePins} 
                           handleDeletePin={handleDeletePin} handleToggleSelect={handleToggleSelect} handleEditPin={handleEditPin} 
                           visibleCount={visibleCount} setVisibleCount={setVisibleCount}
                           activeKeywords={activeKeywords}
                           onClearKeywords={() => {
                               // Strip injected hashtags from pin descriptions
                               const hashtagsToRemove = activeKeywords.map(k => `#${k.replace(/\s+/g, '')}`);
                               setPins(prev => prev.map(p => {
                                   let desc = p.description || '';
                                   hashtagsToRemove.forEach(ht => { desc = desc.replace(new RegExp(`\\s*${ht.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), ''); });
                                   return { ...p, description: desc.trim() };
                               }));
                               setActiveKeywords([]);
                               addToast?.('Keywords removed from all pins', 'success');
                           }}
                       />
                   )}

                   {activeNavTab === 'settings' && (
                       <SettingsView
                           userPlan={userProfile?.subscription?.plan}
                           webhookAccounts={webhookAccounts}
                           setWebhookAccounts={setWebhookAccounts}
                       />
                   )}

                   {activeNavTab === 'analysis' && (
                       <CompetitorAnalysisView />
                   )}
                   
                   {activeNavTab === 'keywords' && (
                      <TrendingKeywordsView 
                          onSendToAIStudio={handleSendToAIStudio}
                          persistedState={trendingState}
                          onStateChange={setTrendingState}
                          onInjectKeywords={(keywords) => {
                              setActiveKeywords(keywords);
                              // Build clean individual hashtags from each keyword phrase
                              const allWords = new Set<string>();
                              keywords.forEach(kw => {
                                  // Split each keyword phrase into individual words, create one hashtag per word
                                  kw.split(/\s+/).forEach(word => {
                                      const clean = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                                      if (clean.length > 2) allWords.add(clean);
                                  });
                              });
                              const hashtags = [...allWords].map(w => `#${w}`).join(' ');
                              setPins(prev => prev.map(p => p.selected ? { ...p, description: ((p.description || '') + ' ' + hashtags).trim() } : p));
                              addToast?.(`Injected ${allWords.size} keyword hashtags into ${pins.filter(p => p.selected).length} selected pins`, 'success');
                          }}
                      />
                   )}
           
           </div> {/* End Left Column */}

          {/* RIGHT COLUMN: Action Tools */}
          {activeNavTab !== 'generator' && activeNavTab !== 'keywords' && activeNavTab !== 'settings' && activeNavTab !== 'analysis' && (
          <div className="w-full xl:w-[240px] 2xl:w-[260px] space-y-6 flex-shrink-0 xl:sticky xl:top-6 self-start max-h-[calc(100vh-24px)] overflow-y-auto custom-scrollbar overflow-x-hidden pr-1 pb-10">
             
             {/* Action Sidebar Tools - Hidden for non-dashboard views or reduced */}
             {activeNavTab === 'dashboard' && (
                <>
                    {/* Trending Keywords / AI Config Placeholder - Moved to Generator tab practically */}
                    <div className="bg-panel border border-border rounded-2xl p-5 shadow-sm bg-gradient-to-br from-accent-green/5 to-transparent">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-accent-green" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-text-main">AI Generator</h3>
                                <p className="text-[10px] text-text-muted">Fast Content Creation</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setActiveNavTab('generator')}
                            className="w-full py-2 bg-accent-green/10 hover:bg-accent-green/20 text-accent-green text-[11px] font-bold rounded-lg border border-accent-green/20 transition-all flex items-center justify-center gap-2"
                        >
                            Open AI Studio
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="bg-panel border border-border rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-accent-red/10 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-accent-red" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-text-main">Web Scraper</h3>
                                <p className="text-[10px] text-text-muted">Import from Pinterest</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setActiveNavTab('upload')}
                            className="w-full py-2 bg-accent-red/10 hover:bg-accent-red/20 text-accent-red text-[11px] font-bold rounded-lg border border-accent-red/20 transition-all flex items-center justify-center gap-2"
                        >
                            Open Ingestion Hub
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </>
             )}

             {/* Dynamic Publishing / Original Right Sidebar Tools */}
             {activeNavTab === 'workspace' && (
                 <div className="bg-panel border border-border rounded-2xl p-5 shadow-sm">
                     <h3 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2"><Settings className="w-4 h-4" /> Export & Publishing</h3>
                     <RightSidebar 
                    isStealthMode={isStealthMode}
                    setIsStealthMode={setIsStealthMode}
                    userPlan={userProfile?.subscription?.plan}
                    destinationLink={destinationLink}
                    setDestinationLink={setDestinationLink}
                    isAutoSmartLink={isAutoSmartLink}
                    setIsAutoSmartLink={setIsAutoSmartLink}
                    boards={boards}
                    selectedBoardId={selectedBoardId}
                    setSelectedBoardId={setSelectedBoardId}
                    onManageBoards={() => setIsBoardModalOpen(true)}
                    scheduleTime={scheduleTime}
                    setScheduleTime={setScheduleTime}
                    scheduleInterval={scheduleInterval}
                    setScheduleInterval={setScheduleInterval}
                    contentPool={contentPool}
                    setContentPool={setContentPool}
                    onApplyAll={handleApplyAll}
                    selectedCount={selectedCount}
                    webhookAccounts={webhookAccounts}
                    activeAccountId={activeAccountId}
                    isOpen={true} // Force open inside standard flow
                     onToggle={() => {}}
                  />
                 </div>
             )}

          </div>
          )} {/* End Right Column */}
          
          </div> {/* End Grid Matrix */}
        </main>
      </div>

      <BoardModal isOpen={isBoardModalOpen} onClose={() => setIsBoardModalOpen(false)} boards={boards} onAddBoard={addBoard} onDeleteBoard={deleteBoard} onBulkAddBoards={addBoardBulk} activeAccountId={activeAccountId} webhookAccounts={webhookAccounts} />
      <CsvSettingsModal isOpen={isCsvSettingsModalOpen} onClose={() => setIsCsvSettingsModalOpen(false)} />
      <PreviewModal isOpen={isPreviewModalOpen} onClose={() => { setIsPreviewModalOpen(false); setPendingImages([]); }} onConfirm={handleConfirmImport} initialImages={pendingImages} />
      <EditPinModal isOpen={!!editingPin} onClose={() => setEditingPin(null)} pin={editingPin} boards={boards} onSave={handleSaveEditedPin} activeAccountId={activeAccountId} />
      <AdminDashboard isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} onReset={handleReset} currentUserUid={user.uid} />
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Floating Toggle for Right Sidebar when closed - Root Level for visibility */}
      {!isRightSidebarOpen && (
          <button 
            onClick={() => setIsRightSidebarOpen(true)}
            className="fixed right-8 bottom-8 group z-[300] animate-in fade-in slide-in-from-right-10 duration-500"
            title="Open Settings"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-full blur-xl opacity-40 group-hover:opacity-80 group-hover:scale-125 transition-all duration-500 animate-pulse"></div>
            <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-full shadow-[0_10px_40px_rgba(79,70,229,0.5)] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95 border border-white/20 group-hover:border-white/40 overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent,rgba(255,255,255,0.1),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <PanelRightOpen className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-tr from-orange-400 to-red-500 rounded-full border-2 border-white text-[10px] font-black flex items-center justify-center shadow-xl animate-bounce">!</div>
            </div>
          </button>
      )}

      {/* Import Progress Overlay */}
      {isImporting && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-card border border-white/10 p-8 rounded-3xl shadow-2xl w-[400px] flex flex-col items-center gap-6">
                  <div className="relative w-24 h-24">
                      <svg className="w-full h-full transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - importProgress / 100)} className="text-blue-500 transition-all duration-300 ease-out" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-white">
                          {importProgress}%
                      </div>
                  </div>
                  <div className="text-center">
                      <h3 className="text-lg font-bold text-white mb-1">Optimizing Assets</h3>
                      <p className="text-sm text-text-muted">Processing and re-hashing your images for maximum performance...</p>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${importProgress}%` }} />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
