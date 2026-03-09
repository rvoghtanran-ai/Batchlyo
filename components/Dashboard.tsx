
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import PinCard from './PinCard';
import BoardModal from './BoardModal';
import SettingsModal from './SettingsModal';
import SmartLinkModal from './SmartLinkModal';
import PreviewModal from './PreviewModal';
import EditPinModal from './EditPinModal'; 
import CsvSettingsModal from './CsvSettingsModal';
import AdminDashboard from './AdminDashboard'; 
import Toast, { ToastMessage, ToastType } from './Toast';
import { Pin, Board, AIServiceProvider, SmartLinkSettings, ExportFormat, CsvExportSettings, AspectRatio, WebhookAccount, ImageHostSettings, ImageHostProvider, UserProfile, GlobalSettings } from '../types';
import { exportToCSV, exportToJSON, exportToGoogleSheet, parseContentPool, uploadImage, sendBatchToWebhook, scrapeImagesFromUrl, applyStealthFilters, remixTextLocal } from '../services/utils';
import { aiService } from '../services/aiService';
import { persistenceService } from '../services/persistence';
import { Download, Wand2, StopCircle, CheckSquare, Square, Trash2, Layers, ChevronDown, Loader2, Globe, Settings, Sparkles, RefreshCw, Eraser, CheckCircle2, AlertTriangle, Sheet, FileJson, Lock, Megaphone, PanelRightOpen } from 'lucide-react';
import JSZip from 'jszip';
import { User } from 'firebase/auth';
import { doc, increment, updateDoc, getDoc } from 'firebase/firestore'; 
import { db } from '../services/firebase';
import Papa from 'papaparse';

// Helper for Smart UTM Generation (Shortened)
const generateSmartUTM = (baseUrl: string) => {
    if (!baseUrl || baseUrl.trim() === '') return '';
    const cleanUrl = baseUrl.split('?utm_')[0].split('&utm_')[0].split('?ref=')[0].split('&ref=')[0];
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const shortId = Math.random().toString(36).substring(2, 6);
    return `${cleanUrl}${separator}utm_id=${shortId}`;
};

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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSmartLinkModalOpen, setIsSmartLinkModalOpen] = useState(false); 
  const [isCsvSettingsModalOpen, setIsCsvSettingsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false); 
  
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showWebhookMenu, setShowWebhookMenu] = useState(false);
  
  const [isExportingCsv, setIsExportingCsv] = useState(false); 
  const [isSendingWebhook, setIsSendingWebhook] = useState(false); 
  const [isUploading, setIsUploading] = useState(false); 
  const [isScraping, setIsScraping] = useState(false); 

  const [selectedWebhookId, setSelectedWebhookId] = useState(''); 

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const webhookMenuRef = useRef<HTMLDivElement>(null);
  
  const abortProcessingRef = useRef<boolean>(false); 
  const abortExportRef = useRef<boolean>(false); 
  
  const [editingPin, setEditingPin] = useState<Pin | null>(null);

  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [pendingSource, setPendingSource] = useState<'scraped' | 'generated' | 'upload'>('generated');

  const [prompt, setPrompt] = useState('');
  const [imgCount, setImgCount] = useState(1);
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
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false); 
  
  const [importProgress, setImportProgress] = useState(0); // New for progress tracking
  const [isImporting, setIsImporting] = useState(false);

  const [currentProvider, setCurrentProvider] = useState<AIServiceProvider>(aiService.getProvider());

  const [aiStats, setAiStats] = useState({ requests: 0, lastLatency: 0, errors: 0 });

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
  const trackUsage = async (metric: 'generatedImages' | 'scrapedUrls' | 'exportedPins' | 'aiCalls' | 'remixUsage', amount: number = 1, accountId?: string) => {
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

  const addToast = (message: string, type: ToastType = 'info') => {
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
  
  const getSmartLinkSettings = (): SmartLinkSettings => {
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
          setIsSettingsModalOpen(true); 
          setIsGenerating(false); 
          return; 
      }
      if (imageProvider === AIServiceProvider.CLOUDFLARE && !aiService.getCloudflareAccountId()) { addToast("Cloudflare ID required.", 'error'); setIsSettingsModalOpen(true); setIsGenerating(false); return; }

      try {
          const images = await aiService.generateImages(prompt, imgCount, aspectRatio, imageProvider);
          setAiStats({...aiService.getStats()});
          
          if (images.length === 0) { addToast("No images generated.", 'error'); return; }
          
          await trackUsage('generatedImages', images.length); // Analytics

          setPendingImages(images);
          setPendingSource('generated');
          setIsPreviewModalOpen(true);
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
            } else if (file.type.startsWith('image/')) {
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

  const handleConfirmImport = async (approvedImages: string[]) => {
    setIsPreviewModalOpen(false);
    setPendingImages([]); // Clear preview immediately to free memory
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
                // If it's a blob, convert to Base64 for persistent IndexedDB storage
                if (img.startsWith('blob:')) {
                    const response = await fetch(img);
                    const blob = await response.blob();
                    finalUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });
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
      if (imgSettings.provider === 'IMGBB' && !imgSettings.apiKey) { addToast("ImgBB Key Missing.", 'error'); setIsSettingsModalOpen(true); return; }
      if (imgSettings.provider === 'CLOUDINARY' && (!imgSettings.cloudName || !imgSettings.uploadPreset)) { addToast("Cloudinary Config Missing.", 'error'); setIsSettingsModalOpen(true); return; }
      if (imgSettings.provider === 'FREEIMAGE' && !imgSettings.apiKey) { addToast("FreeImage Key Missing.", 'error'); setIsSettingsModalOpen(true); return; }

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
     if (imgSettings.provider === 'IMGBB' && !imgSettings.apiKey) { addToast("ImgBB Key Missing.", 'error'); setIsSettingsModalOpen(true); return; }
     if (imgSettings.provider === 'CLOUDINARY' && (!imgSettings.cloudName || !imgSettings.uploadPreset)) { addToast("Cloudinary Config Missing.", 'error'); setIsSettingsModalOpen(true); return; }
     if (imgSettings.provider === 'FREEIMAGE' && !imgSettings.apiKey) { addToast("FreeImage Key Missing.", 'error'); setIsSettingsModalOpen(true); return; }

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
      const smartLinkSettings = getSmartLinkSettings();

      setPins(prev => prev.map(pin => {
          if (!pin.selected) return pin;
          const updates: Partial<Pin> = {};
          if (destinationLink.trim()) {
              const baseLink = destinationLink.trim();
              if (smartLinkSettings.enabled) {
                  updates.destinationLink = generateSmartUTM(baseLink);
              } else {
                  updates.destinationLink = baseLink;
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

      // REMIX RESTRICTION CHECK (Updated for Pricing Strategy)
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
              // --- SMART REMIX Logic ---
              // Use original content (Source of Truth) if available to ensure high-quality base for variety
              const basePinForRemix = {
                  ...pin,
                  title: pin.originalTitle || pin.title,
                  description: pin.originalDescription || pin.description,
                  tags: pin.originalTags || pin.tags
              };
              const textUpdates = remixTextLocal(basePinForRemix);
              let finalPin = { ...pin, ...textUpdates };

              const accId = activeAccountId || 'default';
              
              // 1. Always generate a fresh unique stealth-filtered version for a Remix
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

              // 2. Lock the remix variation into this specific account slot
              finalPin.accountMetadata = {
                  ...(finalPin.accountMetadata || {}),
                  [accId]: {
                      title: finalPin.title,
                      description: finalPin.description,
                      tags: finalPin.tags
                  }
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
                      case 'blogger': generatedLink = `${baseUrl}/search?q=${query}`; break;
                      case 'shopify': generatedLink = `${baseUrl}/search?q=${query}`; break;
                      case 'etsy': generatedLink = `${baseUrl}/search?q=${query}`; break;
                      case 'custom': generatedLink = `${baseUrl}${smartLinkSettings.customPath}${query}`; break;
                  }
                  if (generatedLink) {
                      finalPin.destinationLink = generateSmartUTM(generatedLink);
                  }
              } else {
                  finalPin.destinationLink = '';
              }
              
              let newBoardName = '';
              const isSidebarSelectionValid = selectedBoardId && validBoardNames.includes(selectedBoardId);

              if (isSidebarSelectionValid) {
                  newBoardName = selectedBoardId;
              } else {
                   const contentText = (finalPin.title + ' ' + finalPin.description + ' ' + (finalPin.tags || []).join(' ')).toLowerCase();
                   let bestMatch = '';
                   let maxScore = 0;
                   validBoards.forEach(board => {
                       const boardWords = board.name.toLowerCase().split(/\s+/).filter(w => w.length > 2); 
                       let score = 0;
                       boardWords.forEach(word => { if (contentText.includes(word)) score += 2; });
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
              targetPins = selectedPins; // Process all selected pins, even if ready
          } else {
              targetPins = pins.filter(p => p.status === 'draft' || p.status === 'error');
          }
      }

      if (targetPins.length === 0) {
          addToast("No pins found to process.", 'info');
          setIsProcessingAI(false);
          return;
      }

      const smartLinkSettings = getSmartLinkSettings();
      const relevantBoards = activeAccountId ? boards.filter(b => b.accountId === activeAccountId) : boards;
      const boardList = relevantBoards.map(b => b.name);
      
      let successCount = 0;
      let failCount = 0;

      for (const pin of targetPins) {
          if (abortProcessingRef.current) break;
          setPins(prev => prev.map(p => p.id === pin.id ? { ...p, status: 'processing' } : p));

          try {
              const { updatedPin, searchTerm } = await aiService.generateContent(pin, boardList);
              
              const accId = activeAccountId || 'default';
              // --- SMART STORAGE ---
              // Save as the definitive AI Source of Truth (Prevents re-using credits)
              updatedPin.originalTitle = updatedPin.title;
              updatedPin.originalDescription = updatedPin.description;
              updatedPin.originalTags = updatedPin.tags;

              // Also lock it into the current account slot
              updatedPin.accountMetadata = {
                  ...(updatedPin.accountMetadata || {}),
                  [accId]: {
                      title: updatedPin.title,
                      description: updatedPin.description,
                      tags: updatedPin.tags
                  }
              };

              if (smartLinkSettings.enabled && !updatedPin.destinationLink && searchTerm) {
                  const query = encodeURIComponent(searchTerm.trim());
                  let generatedLink = '';
                  const baseUrl = smartLinkSettings.baseUrl.replace(/\/$/, '');
                  switch (smartLinkSettings.platform) {
                      case 'wordpress': generatedLink = `${baseUrl}/?s=${query}`; break;
                      case 'blogger': generatedLink = `${baseUrl}/search?q=${query}`; break;
                      case 'shopify': generatedLink = `${baseUrl}/search?q=${query}`; break;
                      case 'etsy': generatedLink = `${baseUrl}/search?q=${query}`; break;
                      case 'custom': generatedLink = `${baseUrl}${smartLinkSettings.customPath}${query}`; break;
                  }
                  if (generatedLink) {
                      updatedPin.destinationLink = generateSmartUTM(generatedLink);
                  }
              }

              if (isStealthMode && updatedPin.imageUrl.startsWith('data:')) {
                  updatedPin.imageUrl = await applyStealthFilters(updatedPin.imageUrl);
              }

              await trackUsage('aiCalls', 1); // Analytics

              setPins(prev => prev.map(p => p.id === pin.id ? updatedPin : p));
              setAiStats({...aiService.getStats()});
              successCount++;
              
              // Slow down the pin content generation to avoid rate limits
              await new Promise(r => setTimeout(r, 4000)); 

          } catch (e: any) {
              console.error(`AI Error on Pin ${pin.id}`, e);
              setPins(prev => prev.map(p => p.id === pin.id ? { ...p, status: 'error' } : p));
              setAiStats({...aiService.getStats()});
              failCount++;
              
              // Stop the tool if APIs don't work
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

  const allSelected = displayedPins.length > 0 && displayedPins.every(p => p.selected);
  const selectedCount = pins.filter(p => p.selected).length;
  const errorCount = pins.filter(p => p.status === 'error').length;
  const readyCount = pins.filter(p => p.status === 'ready').length;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-main text-text-main transition-colors duration-300">
      <Header 
        currentProvider={currentProvider} 
        onReset={handleReset}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenSmartLink={() => setIsSmartLinkModalOpen(true)}
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
          prompt={prompt}
          setPrompt={setPrompt}
          imgCount={imgCount}
          setImgCount={setImgCount}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          onGenerate={handleGenerateImages}
          isGenerating={isGenerating}
          isUploading={isUploading}
          imageGenProvider={imageProvider}
          setImageGenProvider={setImageProvider}
          onUpload={handleFileUpload}
          webhookAccounts={webhookAccounts}
          activeAccountId={activeAccountId}
          setActiveAccountId={setActiveAccountId}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          isScraping={isScraping}
          onScrape={handleScrape}
          userPlan={userProfile?.subscription?.plan}
          usage={userProfile?.usage}
          isOpen={true}
          onToggle={() => {}} // Fixed open per user request
          globalSettings={globalSettings}
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

          <div className="sticky top-0 z-40 bg-main/95 backdrop-blur-md pb-3 pt-2 -mx-2 px-4 border-b border-border shadow-sm mb-6 space-y-3 transition-colors duration-300">
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-text-main tracking-tight flex items-center gap-2">
                    Bulk Queue
                    {filterBoard !== 'ALL' && (
                        <span className="text-sm font-normal text-text-muted flex items-center gap-2">
                            / <span className="text-accent-red">{filterBoard === 'Unsorted' ? 'Drafts' : filterBoard}</span>
                        </span>
                    )}
                  </h2>
                  <div className="h-4 w-[1px] bg-border"></div>
                  <div className="flex items-center gap-3">
                    {displayedPins.length > 0 && (
                        <button 
                        onClick={handleSelectAll}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-text-main transition-colors bg-panel px-2 py-1 rounded border border-border hover:border-text-muted/50"
                        >
                        {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        {allSelected ? 'Deselect' : 'Select All'}
                        </button>
                    )}
                    {selectedCount > 0 && (
                        <>
                            <button 
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-white transition-colors bg-red-500/10 px-2 py-1 rounded border border-red-500/20 hover:bg-red-500"
                            >
                                <Trash2 className="w-3 h-3" />
                                Delete ({selectedCount})
                            </button>
                            <button 
                                onClick={handleClearInfo}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-400 hover:text-white transition-colors bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 hover:bg-orange-500"
                                title="Reset pin data to draft"
                            >
                                <Eraser className="w-3 h-3" />
                                Clear Info
                            </button>
                        </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isProcessingAI && errorCount > 0 && (
                      <button 
                          onClick={() => handleToggleAutoAI(true)}
                          className="h-8 px-3 rounded-md font-bold text-[10px] bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20 flex items-center gap-1.5 animate-in fade-in uppercase tracking-wide"
                      >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Retry ({errorCount})
                      </button>
                  )}
                  <button 
                      onClick={handleSpinContent}
                      disabled={!(selectedCount > 0 || (pins.length > 0 && !isSpinning)) || (!isAdmin && (userProfile?.usage?.remixUsage?.[activeAccountId || 'global'] || 0) >= 1)}
                      className={`
                        h-8 px-3 rounded-md font-bold text-[10px] flex items-center gap-1.5 transition-all uppercase tracking-wide border
                        ${isSpinning 
                          ? 'bg-red-500 border-red-500 text-white animate-pulse' 
                          : !isAdmin && (userProfile?.usage?.remixUsage?.[activeAccountId || 'global'] || 0) >= 1
                            ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed'
                            : 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500 hover:text-black shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        }
                        disabled:bg-white/5 disabled:border-white/10 disabled:text-gray-600 disabled:shadow-none disabled:cursor-not-allowed
                      `}
                      title={!isAdmin && (userProfile?.usage?.remixUsage?.[activeAccountId || 'global'] || 0) >= 1 ? "You've used your one-time remix for this account." : "Remix pins"}
                  >
                    {!isAdmin && (userProfile?.usage?.remixUsage?.[activeAccountId || 'global'] || 0) >= 1 ? <Lock className="w-3.5 h-3.5" /> : isSpinning ? <StopCircle className="w-3.5 h-3.5 animate-pulse" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {!isAdmin && (userProfile?.usage?.remixUsage?.[activeAccountId || 'global'] || 0) >= 1 ? 'Used' : 'Remix'}
                  </button>
                  <button 
                      onClick={() => handleToggleAutoAI(false)}
                      disabled={pins.length === 0}
                      className={`
                        h-8 px-4 rounded-md font-bold text-[10px] flex items-center gap-1.5 transition-all uppercase tracking-wide shadow-lg shadow-indigo-500/20 border border-transparent
                        ${isProcessingAI 
                          ? 'bg-red-500 hover:bg-red-600 text-white border-transparent' 
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-transparent shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                        }
                        disabled:bg-white/5 disabled:text-gray-600 disabled:border-white/10 disabled:shadow-none disabled:cursor-not-allowed disabled:from-transparent disabled:to-transparent border
                      `}
                  >
                    {isProcessingAI ? (
                        <>
                          <StopCircle className="w-3.5 h-3.5 animate-pulse" />
                          Stop
                        </>
                    ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5" />
                          Auto-Fill
                        </>
                    )}
                  </button>
                  <div className="relative" ref={webhookMenuRef}>
                        <button 
                            onClick={isSendingWebhook ? handleCancelExport : () => setShowWebhookMenu(!showWebhookMenu)}
                            disabled={pins.length === 0 || isExportingCsv} 
                            className={`h-8 px-3 rounded-md font-bold text-[10px] flex items-center gap-1.5 transition-all uppercase tracking-wide border ${
                                isSendingWebhook
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-black shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                            } disabled:bg-white/5 disabled:border-white/10 disabled:text-gray-600 disabled:shadow-none disabled:cursor-not-allowed`}
                        >
                            {isSendingWebhook ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Sending...
                                </>
                            ) : (
                                <>
                                  <Globe className="w-3.5 h-3.5" />
                                  Webhook
                                  <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                                </>
                            )}
                        </button>
                        {showWebhookMenu && !isSendingWebhook && (
                             <div className="absolute top-full right-0 mt-2 w-60 bg-[#1a1a20] border border-white/10 rounded-lg shadow-xl z-50 p-2 animate-in fade-in zoom-in duration-200">
                                 {webhookAccounts.length === 0 ? (
                                     <div className="flex flex-col items-center justify-center py-4 text-center">
                                         <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">No Accounts Found</p>
                                         <button
                                             onClick={() => {
                                                 setShowWebhookMenu(false);
                                                 setIsSettingsModalOpen(true);
                                             }}
                                             className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-2"
                                         >
                                             <Settings className="w-3 h-3" />
                                             Settings
                                         </button>
                                     </div>
                                 ) : (
                                     <>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase mb-2 px-2">Select Destination</p>
                                        <div className="space-y-1 mb-2 max-h-40 overflow-y-auto custom-scrollbar">
                                            {webhookAccounts.map(acc => (
                                                <button
                                                    key={acc.id}
                                                    onClick={() => setSelectedWebhookId(acc.id)}
                                                    className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-bold border transition-all flex items-center justify-between group ${
                                                        selectedWebhookId === acc.id 
                                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-white' 
                                                        : 'bg-[#0f0f12] border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
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
                        className={`h-8 px-3 rounded-md font-bold text-[10px] flex items-center gap-1.5 transition-all uppercase tracking-wide border ${
                            isExportingCsv
                            ? 'bg-red-500 border-red-500 text-white'
                            : 'bg-pink-500/20 border-pink-500/50 text-pink-400 hover:bg-pink-500 hover:text-white shadow-[0_0_10px_rgba(236,72,153,0.2)]'
                        } disabled:bg-white/5 disabled:border-white/10 disabled:text-gray-600 disabled:shadow-none disabled:cursor-not-allowed`}
                      >
                        {isExportingCsv ? (
                          <>
                             <Loader2 className="w-3.5 h-3.5 animate-spin" />
                             Processing...
                          </>
                        ) : (
                          <>
                             Export
                             <Download className="w-3.5 h-3.5 ml-1" />
                          </>
                        )}
                      </button>
                      {showExportMenu && !isExportingCsv && (
                          <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a20] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                              <button onClick={() => handleExport('default')} className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-white/5 border-b border-white/5">Standard CSV</button>
                              <button onClick={() => handleExport('publer')} className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-white/5 border-b border-white/5 flex flex-col"><span>Publer Strict</span><span className="text-[9px] text-gray-500">Automation Ready</span></button>
                              <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-white/5 border-b border-white/5 flex items-center gap-2"><FileJson className="w-3.5 h-3.5 text-yellow-500" /> JSON (Raw Data)</button>
                              <button onClick={() => handleExport('custom')} className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-white/5">Custom Format</button>
                          </div>
                      )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t border-white/5 pt-3">
                  <div className="flex bg-[#0a0a0c] p-1 rounded-lg border border-white/10">
                      <button onClick={() => setActiveTab('all')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${activeTab === 'all' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>All Pins <span className="opacity-50">({pins.length})</span></button>
                      <button onClick={() => setActiveTab('ready')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${activeTab === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}><CheckCircle2 className="w-3 h-3" /> Ready <span className="opacity-50">({readyCount})</span></button>
                      <button onClick={() => setActiveTab('error')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${activeTab === 'error' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}><AlertTriangle className="w-3 h-3" /> Errors <span className="opacity-50">({errorCount})</span></button>
                  </div>
                  {pins.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar hide-scrollbar border-l border-white/10 pl-4">
                        <button onClick={() => setFilterBoard('ALL')} className={`flex-shrink-0 px-3 py-1 rounded-md text-[10px] font-bold transition-all border flex items-center gap-1.5 ${filterBoard === 'ALL' ? 'bg-accent-red text-white border-accent-red' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}><Layers className="w-3 h-3" /> ALL BOARDS</button>
                        {availableBoards.map(b => (
                            <button key={b} onClick={() => setFilterBoard(b)} className={`flex-shrink-0 px-3 py-1 rounded-md text-[10px] font-bold transition-all border ${filterBoard === b ? 'bg-accent-red text-white border-accent-red' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}>{b === 'Unsorted' ? 'UNSORTED' : b.toUpperCase()} <span className="ml-1 opacity-60">({groupedPins[b].length})</span></button>
                        ))}
                    </div>
                  )}
              </div>
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
            <div className="pb-20">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-3 items-start animate-in fade-in duration-300">
                    {visiblePins.map(pin => (
                      <PinCard key={pin.id} pin={pin} onDelete={handleDeletePin} onToggleSelect={handleToggleSelect} onEdit={handleEditPin} />
                    ))}
                </div>
                {visibleCount < displayedPins.length && (
                    <div className="mt-8 flex justify-center">
                        <button 
                            onClick={() => setVisibleCount(prev => prev + 20)}
                            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-full border border-white/10 transition-colors"
                        >
                            Load More ({displayedPins.length - visibleCount} remaining)
                        </button>
                    </div>
                )}
            </div>
          )}
        </main>

        <RightSidebar 
          isStealthMode={isStealthMode}
          setIsStealthMode={setIsStealthMode}
          userPlan={userProfile?.subscription?.plan}
          destinationLink={destinationLink}
          setDestinationLink={setDestinationLink}
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
          isOpen={isRightSidebarOpen}
          onToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        />

      </div>

      <BoardModal isOpen={isBoardModalOpen} onClose={() => setIsBoardModalOpen(false)} boards={boards} onAddBoard={addBoard} onDeleteBoard={deleteBoard} onBulkAddBoards={addBoardBulk} activeAccountId={activeAccountId} webhookAccounts={webhookAccounts} />
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        onSave={handleSettingsSaved} 
        userPlan={userProfile?.subscription?.plan || 'starter'}
      />
      <CsvSettingsModal isOpen={isCsvSettingsModalOpen} onClose={() => setIsCsvSettingsModalOpen(false)} />
      <SmartLinkModal isOpen={isSmartLinkModalOpen} onClose={() => setIsSmartLinkModalOpen(false)} />
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
