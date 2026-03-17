
import React, { useState, useEffect } from 'react';
import { X, Shield, Download, Upload, Trash2, Database, Users, Activity, CheckCircle, AlertTriangle, FileJson, Lock, UserCheck, UserX, Search, RefreshCw, Server, CreditCard, BarChart2, Calendar, Crown, Briefcase, ArrowUp, DollarSign, Save, Edit3, Plus, Sparkles } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile, UserSubscription, GlobalSettings, UserRole } from '../types';
import { BlogPost } from './BlogPage';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  currentUserUid?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, onReset, currentUserUid }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system' | 'blog'>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Managing a specific user
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Blog Management State
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost & { featured: boolean }>>({});
  const [savingPost, setSavingPost] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Pricing State
  const [pricing, setPricing] = useState<GlobalSettings['pricing']>({
      pro: { monthly: 19, yearly: 15 },
      agency: { monthly: 49, yearly: 39 }
  });
  
  // Announcement State
  const [announcement, setAnnouncement] = useState<{message: string, enabled: boolean, type: 'info' | 'warning' | 'error'}>({
      message: '',
      enabled: false,
      type: 'info'
  });

  // Feature Flags State
  const [features, setFeatures] = useState<{enableStealthMode: boolean, enableImageGeneration: boolean, enableScraping: boolean}>({
      enableStealthMode: true,
      enableImageGeneration: true,
      enableScraping: true
  });

  const [featuredPosts, setFeaturedPosts] = useState<string[]>([]);
  const [paypal, setPaypal] = useState<{email?: string, clientId?: string}>({});
  const [savingSystem, setSavingSystem] = useState(false);

  useEffect(() => {
     if (isOpen) {
         fetchUsers();
         fetchGlobalSettings();
         fetchBlogPosts();
     }
  }, [isOpen]);

  const fetchBlogPosts = async () => {
      try {
          const querySnapshot = await getDocs(collection(db, "blog_posts"));
          const posts: BlogPost[] = [];
          querySnapshot.forEach((doc) => {
              posts.push({ id: doc.id, ...doc.data() } as BlogPost);
          });
          setBlogPosts(posts);
      } catch (e) {
          console.error("Error fetching blog posts", e);
      }
  };

  const saveBlogPost = async () => {
      if (!currentPost.title || !currentPost.slug || !currentPost.content) {
          alert("Title, slug, and content are required.");
          return;
      }
      setSavingPost(true);
      try {
          const postData = {
              title: currentPost.title,
              slug: currentPost.slug,
              excerpt: currentPost.excerpt || '',
              content: currentPost.content,
              author: currentPost.author || 'Admin',
              date: currentPost.date || Date.now(),
              imageUrl: currentPost.imageUrl || '',
              published: currentPost.published || false,
          };

          // Handle Slug Change in Featured Posts
          let updatedFeaturedPosts = [...featuredPosts];
          const oldPost = blogPosts.find(p => p.id === currentPost.id);
          const oldSlug = oldPost?.slug;

          if (oldSlug && oldSlug !== currentPost.slug) {
              // Slug changed, update in featured list if present
              updatedFeaturedPosts = updatedFeaturedPosts.map(s => s === oldSlug ? currentPost.slug! : s);
          }

          // Handle Featured Toggle from Editor
          if (currentPost.featured !== undefined) {
              const isCurrentlyFeatured = updatedFeaturedPosts.includes(currentPost.slug);
              if (currentPost.featured && !isCurrentlyFeatured) {
                  if (updatedFeaturedPosts.length < 3) {
                      updatedFeaturedPosts.push(currentPost.slug);
                  } else {
                      alert("Post saved, but could not be featured: Maximum of 3 featured posts reached.");
                  }
              } else if (!currentPost.featured && isCurrentlyFeatured) {
                  updatedFeaturedPosts = updatedFeaturedPosts.filter(s => s !== currentPost.slug);
              }
          }

          if (currentPost.id) {
              await updateDoc(doc(db, "blog_posts", currentPost.id), postData);
          } else {
              await addDoc(collection(db, "blog_posts"), postData);
          }

          // Sync Featured Posts to Global Settings
          if (JSON.stringify(updatedFeaturedPosts) !== JSON.stringify(featuredPosts)) {
              await setDoc(doc(db, "settings", "global"), { 
                  featuredPosts: updatedFeaturedPosts 
              }, { merge: true });
              setFeaturedPosts(updatedFeaturedPosts);
          }

          await fetchBlogPosts();
          setIsEditingPost(false);
          setCurrentPost({});
      } catch (e) {
          console.error("Error saving post", e);
          alert("Failed to save post.");
      } finally {
          setSavingPost(false);
      }
  };

  const deleteBlogPost = async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this post?")) return;
      try {
          await deleteDoc(doc(db, "blog_posts", id));
          await fetchBlogPosts();
      } catch (e) {
          console.error("Error deleting post", e);
          alert("Failed to delete post.");
      }
  };

  const seedDefaultPosts = async () => {
      console.log("Starting seedDefaultPosts...");
      if (!window.confirm("This will add 3 detailed guides to your blog. Continue?")) {
          console.log("Seeding cancelled by user.");
          return;
      }
      
      setIsSeeding(true);
      try {
          console.log("Seeding posts to Firestore...");
          const defaultPosts = [
              {
                  title: "How to Automate 1,000 Pinterest Pins in Under 5 Minutes with Pinlly",
                  slug: "automate-1000-pinterest-pins",
                  excerpt: "Stop wasting hours manually uploading pins. Discover how Pinlly's Smart Node Engine can turn a single product link into hundreds of algorithmically unique pins instantly.",
                  author: "Pinlly Team",
                  date: Date.now(),
                  published: true,
                  imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop",
                  content: `# Welcome to the Future of Pinterest Marketing\n\nIf you are an e-commerce owner, a niche blogger, or a marketing agency, you already know the power of Pinterest. It's a goldmine for organic traffic. But there's a massive problem: **Pinterest requires relentless consistency.**\n\nThe algorithm favors accounts that pin multiple times a day, every single day. Doing this manually is an absolute nightmare.\n\nEnter **Pinlly**.\n\nPinlly is not just another scheduling tool. It is an end-to-end automation engine designed specifically to scale your visual content creation and distribution to astronomical levels.\n\n## The Core Concept: Raw URLs to Pinterest Gold\n\nWith Pinlly, the days of downloading images, opening Canva, writing dozens of titles, and manually scheduling are over. Here is the exact workflow you can use today to generate 1,000 pins:\n\n### 1. The Scraper Engine\nSimply paste your Shopify product link, your Etsy listing, or your blog post URL into Pinlly's workstation.\n\n![Scraping Process](https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop)\n*Pinlly instantly scrapes all high-quality images from your target URL.*\n\n### 2. The Smart AI Auto-Fill\nOnce your images are loaded, click the magical **"Auto-Fill"** button. Pinlly connects to elite AI models to analyze your image and your destination link.\nIt automatically generates:\n*   **High-converting, click-worthy Titles.**\n*   **Keyword-rich Descriptions.**\n*   **Relevant hashtags/tags.**\n\n![AI Generation](https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop)\n*Watch as the AI fills out hundreds of rows of data in seconds.*\n\n### 3. The "Stealth Mode" Image Hashing\nPinterest algorithms will flag you if you simply upload the exact same image 50 times. Pinlly's **Stealth Mode** solves this. It applies microscopic, invisible filters to your images during export, drastically altering their cryptographic hash. To human eyes, the image is identical. To Pinterest's algorithm, it's a brand new, never-before-seen piece of content.\n\n### 4. Seamless Exporting\nNeed to schedule these pins out over the next 6 months?\n*   **CSV:** Export your entire queue into a perfectly formatted CSV file ready for instant bulk upload into your favorite scheduler.\n*   **Direct Webhooks:** Connect Pinlly to Zapier or n8n to send the pins directly to boards, Discord, Slack, or a Google Sheet.\n\nStop grinding. Start scaling. Pinlly empowers you to do a month's worth of Pinterest marketing before your morning coffee gets cold.`
              },
              {
                  title: "Why Print-on-Demand (POD) Stores Need Bulk Visual Automation",
                  slug: "pod-visual-automation",
                  excerpt: "Running a Printify or Printful store? Learn why relying on standard mockups is killing your conversion rates, and how bulk generation can save your business.",
                  author: "Pinlly Strategy Team",
                  date: Date.now() - 86400000,
                  published: true,
                  imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop",
                  content: `# The Print-on-Demand (POD) industry is booming\n\nBut it's also incredibly saturated. Whether you are selling t-shirts through Shopify, mugs on Etsy, or canvases on WooCommerce, the barrier to entry is nearly zero.\n\nBecause everyone has access to the exact same Printify or Printful mockups, simply listing your product isn't enough anymore. **You need visual volume and variety.**\n\n## The Problem with Standard Mockups\n\nWhen a potential buyer searches for a "vintage cat t-shirt" on Pinterest, they are going to see hundreds of identical flat-lay mockups. If your pin looks exactly like your competitor's pin, you are competing solely on price—a race to the bottom.\n\nFurthermore, Pinterest is a visual search engine. It relies heavily on image diversity to understand context and serve content to a wide array of user intents.\n\n## The Solution: Pinlly's Generation Workstation\n\nThis is where **Pinlly** completely changes the game for POD sellers.\n\nInstead of paying a designer to create 50 different lifestyle mockups for a single t-shirt design, you can use Pinlly to generate an entire content ecosystem around that one product.\n\n![E-commerce Growth](https://images.unsplash.com/photo-1661956602116-aa6865609028?q=80&w=1200&auto=format&fit=crop)\n*Scaling your visual assets is the key to breaking through the noise in 2026.*\n\n### How to Dominate a Niche in 3 Steps\n\n1.  **Input Your Base Design:** Upload your raw design file (PNG/JPG) directly into the Pinlly workstation.\n2.  **Generate AI Variations:** Use Pinlly's integrated Image Generation (powered by elite models) to prompt for lifestyle images.\n    *   *Example Prompt: "A stylish woman wearing a white t-shirt with [My Design] sitting in a trendy coffee shop, cinematic lighting."*\n3.  **Bulk Optimize:** Select all your generated lifestyle images. Click "Remix" to instantly apply spinning text from your content pool (e.g., swapping "vintage cat tee" with "retro kitten shirt").\n\nYou just turned one design into 20 unique pins, all pointing back to the same product URL (automatically tagged with Smart UTMs to track exactly which image drove the sale).\n\n### The Agency Advantage\n\nIf you run a marketing agency handling multiple POD clients, Pinlly allows you to create separate "Workspaces" for each client. You can isolate their APIs, webhooks, and content pools, ensuring that client A's data never mixes with client B's.\n\nIt's time to stop fighting over scraps with identical mockups. Flood the feed with beautiful, algorithm-pleasing variations using Pinlly.`
              },
              {
                  title: "n8n + Pinlly: Building a 100% Autonomous Publishing Machine",
                  slug: "n8n-pinlly-autonomous-publishing",
                  excerpt: "The ultimate guide to connecting Pinlly with n8n. Learn how to scrape, optimize, and publish without ever touching a button.",
                  author: "Pinlly Team",
                  date: Date.now() - 172800000,
                  published: true,
                  imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000&auto=format&fit=crop",
                  content: `# n8n + Pinlly: The Automation Holy Grail\n\nIf you are still manually uploading CSVs, you are only using 10% of Pinlly's power. The real magic happens when you connect our **Webhook Engine** to **n8n**.\n\n## The Autonomous Workflow\n\nHere is the exact setup used by top-tier agencies:\n\n1. **The Trigger:** Pinlly scrapes a URL and generates 50 optimized pins.\n2. **The Hand-off:** You click "Send to Webhook."\n3. **The Logic (n8n):** n8n receives the JSON data, filters it, and sends it to a Google Sheet for tracking.\n4. **The Action:** n8n then pushes the content to Pinterest, WordPress, or Shopify via their respective APIs.\n\n### Why n8n?\nUnlike Zapier, n8n allows for complex branching logic and is significantly cheaper for high-volume automation.\n\n**Get the Blueprint:** We provide the n8n workflow JSON inside our documentation section. Simply import it and start scaling.`
              }
          ];

          for (const post of defaultPosts) {
              const existing = blogPosts.find(p => p.slug === post.slug);
              if (!existing) {
                  console.log(`Adding post: ${post.title}`);
                  await addDoc(collection(db, "blog_posts"), post);
              } else {
                  console.log(`Post already exists, skipping: ${post.title}`);
              }
          }
          
          console.log("Fetching updated blog posts...");
          await fetchBlogPosts();
          alert("Default posts seeded successfully! You should see them in the list now.");
      } catch (e: any) {
          console.error("CRITICAL ERROR seeding posts:", e);
          alert(`Failed to seed posts: ${e.message || "Unknown error"}. Please check your Firestore Rules.`);
      } finally {
          setIsSeeding(false);
          console.log("seedDefaultPosts finished.");
      }
  };

  const fetchUsers = async () => {
      setLoading(true);
      try {
          const querySnapshot = await getDocs(collection(db, "users"));
          const userList: UserProfile[] = [];
          querySnapshot.forEach((doc) => {
              userList.push(doc.data() as UserProfile);
          });
          setUsers(userList);
      } catch (e) {
          console.error("Error fetching users. Check Firestore Rules.", e);
      } finally {
          setLoading(false);
      }
  };

  const fetchGlobalSettings = async () => {
      try {
          const docRef = doc(db, "settings", "global");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
              const data = docSnap.data() as GlobalSettings;
              if (data.pricing) setPricing(data.pricing);
              if (data.announcement) setAnnouncement(data.announcement);
              if (data.features) setFeatures(data.features);
              if (data.featuredPosts) setFeaturedPosts(data.featuredPosts);
              if (data.paypal) setPaypal(data.paypal);
          }
      } catch (e) { console.warn("No global config found, using defaults"); }
  };

  const saveSystemConfig = async () => {
      setSavingSystem(true);
      try {
          await setDoc(doc(db, "settings", "global"), { 
              pricing,
              announcement,
              features,
              featuredPosts,
              paypal
          }, { merge: true });
          alert("System configuration updated successfully!");
      } catch (e) {
          alert("Failed to save configuration.");
      } finally {
          setSavingSystem(false);
      }
  };

  const handleUpdateRole = async (uid: string, newRole: UserRole) => {
      if (uid === currentUserUid) return alert("Cannot modify own role");
      try {
          await updateDoc(doc(db, "users", uid), { role: newRole });
          setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
          if (selectedUser?.uid === uid) setSelectedUser(prev => prev ? {...prev, role: newRole} : null);
      } catch (e) { alert("Update failed"); }
  };

  const handleUpdateStatus = async (uid: string, newStatus: 'active' | 'banned') => {
      if (uid === currentUserUid) return alert("Cannot ban yourself");
      try {
          await updateDoc(doc(db, "users", uid), { status: newStatus });
          setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
          if (selectedUser?.uid === uid) setSelectedUser(prev => prev ? {...prev, status: newStatus} : null);
      } catch (e) { alert("Update failed"); }
  };

  const handleUpdatePlan = async (uid: string, newPlan: 'starter' | 'pro' | 'agency') => {
      try {
          const subData: UserSubscription = {
              plan: newPlan,
              status: 'active',
              periodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000) // +30 days
          };
          await updateDoc(doc(db, "users", uid), { subscription: subData });
          setUsers(prev => prev.map(u => u.uid === uid ? { ...u, subscription: subData } : u));
          if (selectedUser?.uid === uid) setSelectedUser(prev => prev ? {...prev, subscription: subData} : null);
      } catch(e) { alert("Plan update failed"); }
  };

  const toggleFeaturedPost = async (slug: string) => {
      const post = blogPosts.find(p => p.slug === slug);
      if (post && !post.published && !featuredPosts.includes(slug)) {
          if (!window.confirm("This post is currently a DRAFT. It will not appear on the main page until you publish it. Feature it anyway?")) {
              return;
          }
      }

      const validSlugs = blogPosts.map(p => p.slug);
      let currentFeatures = featuredPosts.filter(s => validSlugs.includes(s));

      let updated: string[] = [];
      if (currentFeatures.includes(slug)) {
          updated = currentFeatures.filter(s => s !== slug);
      } else {
          if (currentFeatures.length >= 3) {
              alert("You can only feature up to 3 posts. Please unfeature one first.");
              // In case we filtered out ghosts, let's persist the cleaned array
              if (currentFeatures.length !== featuredPosts.length) {
                  setFeaturedPosts(currentFeatures);
                  setDoc(doc(db, "settings", "global"), { featuredPosts: currentFeatures }, { merge: true });
              }
              return;
          }
          updated = [...currentFeatures, slug];
      }

      setFeaturedPosts(updated);
      try {
          await setDoc(doc(db, "settings", "global"), { 
              featuredPosts: updated 
          }, { merge: true });
      } catch (e) {
          console.error("Failed to save featured posts", e);
          alert("Failed to save featured selection to database.");
          // Rollback local state if save fails
          setFeaturedPosts(featuredPosts);
      }
  };

  // --- Metrics Calculation ---
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const totalPinsGenerated = users.reduce((acc, curr) => acc + (curr.usage?.generatedImages || 0), 0);
  const totalApiCost = (totalPinsGenerated * 0.002).toFixed(2); // Mock calculation
  
  // Calculate Estimated Revenue
  const estimatedRevenue = users.reduce((acc, user) => {
      if (user.subscription?.status !== 'active') return acc;
      if (user.subscription.plan === 'pro') return acc + pricing.pro.monthly;
      if (user.subscription.plan === 'agency') return acc + pricing.agency.monthly;
      return acc;
  }, 0);

  const filteredUsers = users.filter(u => 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlanColor = (plan?: string) => {
      switch(plan) {
          case 'agency': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
          case 'pro': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
          default: return 'text-gray-400 bg-white/5 border-white/10';
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border w-[95vw] h-[90vh] max-w-[1200px] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-panel px-6 py-4 border-b border-border flex justify-between items-center">
            <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => window.location.href = '/'}
            >
                <div className="w-10 h-10 bg-accent-red/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6 text-accent-red" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-text-main tracking-tight group-hover:text-white transition-colors">Mission Control</h2>
                    <p className="text-xs text-text-muted">System Administrator Access Level 5</p>
                </div>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-main bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            
            {/* Sidebar Navigation */}
            <div className="w-64 bg-panel border-r border-border flex flex-col p-4 gap-2">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-card text-text-main shadow-sm' : 'text-text-muted hover:text-text-main hover:bg-card/50'}`}
                >
                    <Activity className="w-4 h-4" /> Overview
                </button>
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-card text-text-main shadow-sm' : 'text-text-muted hover:text-text-main hover:bg-card/50'}`}
                >
                    <Users className="w-4 h-4" /> User Management
                </button>
                <button 
                    onClick={() => setActiveTab('system')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'system' ? 'bg-card text-text-main shadow-sm' : 'text-text-muted hover:text-text-main hover:bg-card/50'}`}
                >
                    <Server className="w-4 h-4" /> System Config
                </button>
                <button 
                    onClick={() => setActiveTab('blog')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'blog' ? 'bg-card text-text-main shadow-sm' : 'text-text-muted hover:text-text-main hover:bg-card/50'}`}
                >
                    <Edit3 className="w-4 h-4" /> Blog Management
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-card overflow-y-auto p-8 custom-scrollbar">
                
                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-4 gap-6">
                            <div className="bg-panel p-6 rounded-2xl border border-border relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users className="w-12 h-12 text-text-main" /></div>
                                <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">Total Users</p>
                                <h3 className="text-3xl font-bold text-text-main">{totalUsers}</h3>
                                <p className="text-xs text-green-400 mt-2 font-mono flex items-center gap-1"><ArrowUp className="w-3 h-3" /> {activeUsers} Active</p>
                            </div>
                            <div className="bg-panel p-6 rounded-2xl border border-border relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CreditCard className="w-12 h-12 text-text-main" /></div>
                                <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">Est. MRR</p>
                                <h3 className="text-3xl font-bold text-text-main">${estimatedRevenue}</h3>
                                <p className="text-xs text-text-muted mt-2 font-mono">Monthly Recurring Revenue</p>
                            </div>
                            <div className="bg-panel p-6 rounded-2xl border border-border relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity className="w-12 h-12 text-text-main" /></div>
                                <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">Total Pins Gen.</p>
                                <h3 className="text-3xl font-bold text-blue-400">{totalPinsGenerated}</h3>
                                <p className="text-xs text-text-muted mt-2 font-mono">Lifetime volume</p>
                            </div>
                            <div className="bg-panel p-6 rounded-2xl border border-border relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Server className="w-12 h-12 text-text-main" /></div>
                                <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">Est. AI Cost</p>
                                <h3 className="text-3xl font-bold text-orange-400">${totalApiCost}</h3>
                                <p className="text-xs text-text-muted mt-2 font-mono">Estimated ($0.002/req)</p>
                            </div>
                        </div>

                        {/* Recent Activity & Plan Distribution */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 bg-panel border border-border rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-text-muted" /> Recent System Events</h3>
                                <div className="space-y-4">
                                    {users.slice(0, 5).map(u => (
                                        <div key={u.uid} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold">{u.displayName?.slice(0,2).toUpperCase()}</div>
                                                <div>
                                                    <p className="text-sm font-medium text-text-main">{u.displayName} <span className="text-text-muted">logged in</span></p>
                                                    <p className="text-[10px] text-text-muted">{new Date(u.lastLogin).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-text-muted font-mono">{u.email}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-panel border border-border rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-500" /> Plan Distribution</h3>
                                <div className="space-y-4">
                                    {['starter', 'pro', 'agency'].map(plan => {
                                        const count = users.filter(u => (u.subscription?.plan || 'starter') === plan).length;
                                        const percentage = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
                                        const color = plan === 'agency' ? 'bg-orange-500' : plan === 'pro' ? 'bg-purple-500' : 'bg-gray-500';
                                        
                                        return (
                                            <div key={plan} className="space-y-2">
                                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-text-muted">
                                                    <span>{plan}</span>
                                                    <span>{count} Users ({percentage}%)</span>
                                                </div>
                                                <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                                                    <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- USERS TAB --- */}
                {activeTab === 'users' && (
                    <div className="flex gap-6 h-full">
                        {/* List Column */}
                        <div className={`flex-1 flex flex-col ${selectedUser ? 'hidden md:flex' : ''}`}>
                            <div className="flex justify-between items-center mb-6">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                    <input 
                                        type="text" 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search users by name, email or ID..."
                                        className="w-full bg-panel border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text-main focus:outline-none focus:border-accent-red transition-all"
                                    />
                                </div>
                                <button onClick={fetchUsers} className="p-3 bg-panel border border-border rounded-xl hover:text-text-main text-text-muted hover:border-text-muted/20 transition-all"><RefreshCw className="w-4 h-4" /></button>
                            </div>

                            <div className="flex-1 bg-panel border border-border rounded-2xl overflow-hidden flex flex-col">
                                <div className="overflow-y-auto custom-scrollbar flex-1">
                                    <table className="w-full text-left border-separate border-spacing-y-1">
                                        <thead className="text-[10px] text-text-muted font-bold uppercase tracking-wider sticky top-0 bg-panel z-10">
                                            <tr>
                                                <th className="px-4 py-2">User</th>
                                                <th className="px-4 py-2">Plan</th>
                                                <th className="px-4 py-2">Metrics (Gen/Scrape/Exp)</th>
                                                <th className="px-4 py-2">Status</th>
                                                <th className="px-4 py-2 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs">
                                            {loading ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-text-muted">Loading...</td></tr>
                                            ) : filteredUsers.map(u => (
                                                <tr key={u.uid} className="bg-card hover:bg-white/5 transition-all group rounded-lg border border-transparent hover:border-white/5 shadow-sm">
                                                    <td className="px-4 py-2 rounded-l-lg">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-white/5 flex items-center justify-center text-[10px] font-bold text-text-muted shadow-inner">
                                                                {u.displayName?.slice(0,2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-text-main group-hover:text-white transition-colors">{u.displayName}</p>
                                                                <p className="text-[9px] text-text-muted font-mono opacity-70">{u.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border shadow-sm ${getPlanColor(u.subscription?.plan)}`}>
                                                                {u.subscription?.plan || 'STARTER'}
                                                            </span>
                                                            <span className="text-[8px] text-text-muted font-bold uppercase tracking-tighter opacity-60">
                                                                {u.role || 'user'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 font-mono text-[10px]">
                                                        <span className="text-blue-400">{u.usage?.generatedImages || 0}</span> / 
                                                        <span className="text-orange-400 ml-1">{u.usage?.scrapedUrls || 0}</span> / 
                                                        <span className="text-green-400 ml-1">{u.usage?.exportedPins || 0}</span>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${u.status === 'banned' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                            {u.status}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-right rounded-r-lg">
                                                        <button 
                                                            onClick={() => setSelectedUser(u)}
                                                            className="px-2 py-1 bg-accent-blue/10 hover:bg-accent-blue text-accent-blue hover:text-white rounded-md text-[10px] font-bold transition-all border border-accent-blue/20 hover:border-accent-blue"
                                                        >
                                                            Manage
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Detail Panel */}
                        {selectedUser && (
                            <div className="w-[320px] bg-panel border-l border-border p-4 flex flex-col gap-4 animate-in slide-in-from-right-10 shadow-2xl h-full overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-lg font-bold text-white shadow-lg border border-white/10">
                                            {selectedUser.displayName?.slice(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-text-main">{selectedUser.displayName}</h3>
                                            <p className="text-[10px] text-text-muted font-mono opacity-70 truncate w-32">{selectedUser.uid}</p>
                                            <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {selectedUser.email}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedUser(null)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"><X className="w-4 h-4 text-text-muted hover:text-text-main" /></button>
                                </div>

                                 {/* Role Control */}
                                <div className="p-3 bg-card/30 rounded-xl border border-white/5 space-y-2">
                                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-2"><Shield className="w-3 h-3 text-accent-red" /> Account Role</h4>
                                    <div className="grid grid-cols-2 gap-1">
                                        {(['super_admin', 'admin', 'editor', 'user'] as UserRole[]).map(role => (
                                            <button 
                                                key={role}
                                                onClick={() => handleUpdateRole(selectedUser.uid, role)}
                                                className={`
                                                    relative py-2 px-1 rounded-lg text-[9px] font-bold uppercase border transition-all flex flex-col items-center gap-0.5
                                                    ${selectedUser.role === role 
                                                        ? 'bg-accent-red text-white border-accent-red shadow-lg shadow-red-900/20' 
                                                        : 'bg-white/5 text-text-muted border-transparent hover:bg-white/10 hover:border-white/10'}
                                                `}
                                            >
                                                {role.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Subscription Control */}
                                <div className="p-3 bg-card/30 rounded-xl border border-white/5 space-y-2">
                                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-2"><Crown className="w-3 h-3 text-yellow-500" /> Plan</h4>
                                    <div className="grid grid-cols-3 gap-1">
                                        {['starter', 'pro', 'agency'].map(plan => (
                                            <button 
                                                key={plan}
                                                onClick={() => handleUpdatePlan(selectedUser.uid, plan as any)}
                                                className={`
                                                    relative py-2 px-1 rounded-lg text-[9px] font-bold uppercase border transition-all flex flex-col items-center gap-0.5
                                                    ${selectedUser.subscription?.plan === plan 
                                                        ? 'bg-accent-blue text-white border-accent-blue shadow-lg shadow-blue-900/20' 
                                                        : 'bg-white/5 text-text-muted border-transparent hover:bg-white/10 hover:border-white/10'}
                                                `}
                                            >
                                                {plan}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] text-text-muted bg-black/20 p-1.5 rounded-md border border-white/5">
                                        <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-500"></div> {selectedUser.subscription?.status || 'Active'}</span>
                                        <span>{selectedUser.subscription?.periodEnd ? new Date(selectedUser.subscription.periodEnd).toLocaleDateString() : 'Never'}</span>
                                    </div>
                                </div>

                                {/* Usage Stats */}
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-2"><BarChart2 className="w-3 h-3" /> Usage</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg border border-blue-500/10 flex flex-col items-center justify-center text-center">
                                            <div className="text-sm font-bold text-blue-400">{selectedUser.usage?.generatedImages || 0}</div>
                                            <div className="text-[8px] text-blue-300/60 uppercase font-bold">Gen</div>
                                        </div>
                                        <div className="p-2 bg-gradient-to-br from-orange-500/5 to-orange-500/10 rounded-lg border border-orange-500/10 flex flex-col items-center justify-center text-center">
                                            <div className="text-sm font-bold text-orange-400">{selectedUser.usage?.scrapedUrls || 0}</div>
                                            <div className="text-[8px] text-orange-300/60 uppercase font-bold">Scrape</div>
                                        </div>
                                        <div className="p-2 bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg border border-green-500/10 flex flex-col items-center justify-center text-center">
                                            <div className="text-sm font-bold text-green-400">{selectedUser.usage?.exportedPins || 0}</div>
                                            <div className="text-[8px] text-green-300/60 uppercase font-bold">Exp</div>
                                        </div>
                                        <div className="p-2 bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg border border-purple-500/10 flex flex-col items-center justify-center text-center">
                                            <div className="text-sm font-bold text-purple-400">{selectedUser.usage?.aiCalls || 0}</div>
                                            <div className="text-[8px] text-purple-300/60 uppercase font-bold">AI Calls</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="mt-auto pt-4 border-t border-border space-y-2">
                                    <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-2"><Lock className="w-3 h-3" /> Security</h4>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedUser.status === 'active' ? (
                                            <button onClick={() => handleUpdateStatus(selectedUser.uid, 'banned')} className="py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-bold transition-all flex flex-col items-center justify-center gap-0.5">
                                                <UserX className="w-3 h-3" /> BAN
                                            </button>
                                        ) : (
                                            <button onClick={() => handleUpdateStatus(selectedUser.uid, 'active')} className="py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-lg text-[9px] font-bold transition-all flex flex-col items-center justify-center gap-0.5">
                                                <UserCheck className="w-3 h-3" /> ACTIVATE
                                            </button>
                                        )}

                                        {selectedUser.role === 'user' ? (
                                            <button onClick={() => handleUpdateRole(selectedUser.uid, 'admin')} className="py-2 bg-white/5 hover:bg-white/10 text-text-secondary border border-border rounded-lg text-[9px] font-bold transition-all flex flex-col items-center justify-center gap-0.5">
                                                <Shield className="w-3 h-3" /> ADMIN
                                            </button>
                                        ) : (
                                            <button onClick={() => handleUpdateRole(selectedUser.uid, 'user')} className="py-2 bg-white/5 hover:bg-white/10 text-text-secondary border border-border rounded-lg text-[9px] font-bold transition-all flex flex-col items-center justify-center gap-0.5">
                                                <Users className="w-3 h-3" /> USER
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- SYSTEM TAB (Updated) --- */}
                {activeTab === 'system' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12">
                        
                        {/* Global Announcement */}
                        <div className="bg-panel border border-border rounded-2xl p-8">
                            <h3 className="text-xl font-bold text-text-main mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-400" /> Global Announcement
                            </h3>
                            <p className="text-sm text-text-muted mb-6">Broadcast a message to all users (e.g. maintenance, updates).</p>
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm font-bold text-text-main cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={announcement.enabled}
                                            onChange={(e) => setAnnouncement(prev => ({...prev, enabled: e.target.checked}))}
                                            className="w-4 h-4 rounded border-border bg-card text-accent-blue focus:ring-accent-blue"
                                        />
                                        Enable Announcement
                                    </label>
                                    
                                    <select 
                                        value={announcement.type}
                                        onChange={(e) => setAnnouncement(prev => ({...prev, type: e.target.value as any}))}
                                        className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-accent-blue"
                                    >
                                        <option value="info">Info (Blue)</option>
                                        <option value="warning">Warning (Yellow)</option>
                                        <option value="error">Critical (Red)</option>
                                    </select>
                                </div>
                                
                                <textarea 
                                    value={announcement.message}
                                    onChange={(e) => setAnnouncement(prev => ({...prev, message: e.target.value}))}
                                    placeholder="Enter announcement message..."
                                    className="w-full bg-card border border-border rounded-xl p-4 text-sm text-text-main focus:outline-none focus:border-accent-blue min-h-[100px]"
                                />
                            </div>
                        </div>

                        {/* Feature Flags */}
                        <div className="bg-panel border border-border rounded-2xl p-8">
                            <h3 className="text-xl font-bold text-text-main mb-2 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-accent-purple" /> Feature Flags
                            </h3>
                            <p className="text-sm text-text-muted mb-6">Toggle core system capabilities globally.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className={`p-4 rounded-xl border transition-all cursor-pointer ${features.enableImageGeneration ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`} onClick={() => setFeatures(prev => ({...prev, enableImageGeneration: !prev.enableImageGeneration}))}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-text-main">AI Image Gen</span>
                                        <div className={`w-3 h-3 rounded-full ${features.enableImageGeneration ? 'bg-green-500' : 'bg-red-500'}`} />
                                    </div>
                                    <p className="text-[10px] text-text-muted">Master switch for Flux/Gemini generation.</p>
                                </div>

                                <div className={`p-4 rounded-xl border transition-all cursor-pointer ${features.enableScraping ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`} onClick={() => setFeatures(prev => ({...prev, enableScraping: !prev.enableScraping}))}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-text-main">URL Scraping</span>
                                        <div className={`w-3 h-3 rounded-full ${features.enableScraping ? 'bg-green-500' : 'bg-red-500'}`} />
                                    </div>
                                    <p className="text-[10px] text-text-muted">Enable/Disable external scraping engine.</p>
                                </div>

                                <div className={`p-4 rounded-xl border transition-all cursor-pointer ${features.enableStealthMode ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`} onClick={() => setFeatures(prev => ({...prev, enableStealthMode: !prev.enableStealthMode}))}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-text-main">Algorithm Optimization</span>
                                        <div className={`w-3 h-3 rounded-full ${features.enableStealthMode ? 'bg-green-500' : 'bg-red-500'}`} />
                                    </div>
                                    <p className="text-[10px] text-text-muted">Allow metadata stripping features.</p>
                                </div>
                            </div>
                        </div>

                        {/* PayPal Configuration */}
                        <div className="bg-panel border border-border rounded-2xl p-8">
                            <h3 className="text-xl font-bold text-text-main mb-2 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-blue-400" /> Payment Gateway (PayPal)
                            </h3>
                            <p className="text-sm text-text-muted mb-6">Configure PayPal integration settings.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">PayPal Email</label>
                                    <input 
                                        type="email" 
                                        value={paypal?.email || ''}
                                        onChange={(e) => setPaypal(prev => ({...prev, email: e.target.value}))}
                                        placeholder="business@example.com"
                                        className="w-full bg-card border border-border rounded-xl p-3 text-sm text-text-main focus:outline-none focus:border-blue-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Client ID (Live)</label>
                                    <input 
                                        type="text" 
                                        value={paypal?.clientId || ''}
                                        onChange={(e) => setPaypal(prev => ({...prev, clientId: e.target.value}))}
                                        placeholder="AbC..."
                                        className="w-full bg-card border border-border rounded-xl p-3 text-sm text-text-main focus:outline-none focus:border-blue-400 font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pricing Configuration */}
                        <div className="bg-panel border border-border rounded-2xl p-8">
                            <h3 className="text-xl font-bold text-text-main mb-2 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-400" /> Pricing Strategy
                            </h3>
                            <p className="text-sm text-text-muted mb-6">Manage global subscription prices for the pricing page.</p>
                            
                            <div className="grid grid-cols-2 gap-8">
                                {/* Pro Plan */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider">Pro Plan</h4>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-text-muted uppercase block mb-1">Monthly ($)</label>
                                            <input 
                                                type="number" 
                                                value={pricing.pro.monthly}
                                                onChange={(e) => setPricing(prev => ({...prev, pro: {...prev.pro, monthly: parseInt(e.target.value)}}))}
                                                className="w-full bg-card border border-border rounded-lg p-2 text-text-main text-sm focus:outline-none focus:border-accent-purple"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] text-text-muted uppercase block mb-1">Yearly / mo ($)</label>
                                            <input 
                                                type="number" 
                                                value={pricing.pro.yearly}
                                                onChange={(e) => setPricing(prev => ({...prev, pro: {...prev.pro, yearly: parseInt(e.target.value)}}))}
                                                className="w-full bg-card border border-border rounded-lg p-2 text-text-main text-sm focus:outline-none focus:border-accent-purple"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Agency Plan */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-orange-400 uppercase tracking-wider">Agency Plan</h4>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-text-muted uppercase block mb-1">Monthly ($)</label>
                                            <input 
                                                type="number" 
                                                value={pricing.agency.monthly}
                                                onChange={(e) => setPricing(prev => ({...prev, agency: {...prev.agency, monthly: parseInt(e.target.value)}}))}
                                                className="w-full bg-card border border-border rounded-lg p-2 text-text-main text-sm focus:outline-none focus:border-orange-400"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] text-text-muted uppercase block mb-1">Yearly / mo ($)</label>
                                            <input 
                                                type="number" 
                                                value={pricing.agency.yearly}
                                                onChange={(e) => setPricing(prev => ({...prev, agency: {...prev.agency, yearly: parseInt(e.target.value)}}))}
                                                className="w-full bg-card border border-border rounded-lg p-2 text-text-main text-sm focus:outline-none focus:border-orange-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end sticky bottom-0 bg-card/80 backdrop-blur p-4 border-t border-border rounded-xl">
                            <button 
                                onClick={saveSystemConfig}
                                disabled={savingSystem}
                                className="bg-accent-blue hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                            >
                                {savingSystem ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                SAVE SYSTEM CONFIGURATION
                            </button>
                        </div>

                        {/* Local Data */}
                        <div className="bg-panel border border-border rounded-2xl p-8 text-center opacity-50 hover:opacity-100 transition-opacity mt-12">
                            <h3 className="text-xl font-bold text-text-main mb-2">Danger Zone</h3>
                            <p className="text-sm text-text-muted mb-6">Reset local storage caches. This will log you out.</p>
                            
                            <button 
                                onClick={() => {
                                    if (window.confirm("Are you sure? This will clear all local data and log you out.")) {
                                        onReset();
                                    }
                                }}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-4 px-8 rounded-xl font-bold text-sm transition-all"
                            >
                                Factory Reset App
                            </button>
                        </div>
                    </div>
                )}

                {/* --- BLOG MANAGEMENT TAB --- */}
                {activeTab === 'blog' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-text-main">Blog Posts</h3>
                            <div className="flex gap-3">
                                <button 
                                    onClick={saveSystemConfig}
                                    disabled={savingSystem}
                                    className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-500/20 transition-colors border border-yellow-500/20"
                                >
                                    {savingSystem ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Featured Selection
                                </button>
                                <button 
                                    onClick={seedDefaultPosts}
                                    disabled={isSeeding}
                                    className="flex items-center gap-2 bg-white/5 text-text-muted px-4 py-2 rounded-lg font-bold text-sm hover:bg-white/10 transition-colors border border-white/5"
                                >
                                    {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                    Seed Default Guides
                                </button>
                                <button 
                                    onClick={() => {
                                        setCurrentPost({ published: false, date: Date.now() });
                                        setIsEditingPost(true);
                                    }}
                                    className="flex items-center gap-2 bg-accent-blue text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> New Post
                                </button>
                            </div>
                        </div>

                        {isEditingPost ? (
                            <div className="bg-panel border border-border rounded-2xl p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-lg font-bold text-text-main">{currentPost.id ? 'Edit Post' : 'Create New Post'}</h4>
                                    <button onClick={() => setIsEditingPost(false)} className="text-text-muted hover:text-text-main">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Title *</label>
                                            <input 
                                                type="text" 
                                                value={currentPost.title || ''} 
                                                onChange={(e) => {
                                                    const title = e.target.value;
                                                    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                                                    setCurrentPost({...currentPost, title, slug: currentPost.id ? currentPost.slug : slug});
                                                }}
                                                className="w-full bg-main border border-border rounded-lg px-4 py-2 text-text-main focus:outline-none focus:border-accent-blue"
                                                placeholder="Post Title"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Slug *</label>
                                            <input 
                                                type="text" 
                                                value={currentPost.slug || ''} 
                                                onChange={(e) => setCurrentPost({...currentPost, slug: e.target.value})}
                                                className="w-full bg-main border border-border rounded-lg px-4 py-2 text-text-main focus:outline-none focus:border-accent-blue"
                                                placeholder="post-url-slug"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Excerpt</label>
                                        <textarea 
                                            value={currentPost.excerpt || ''} 
                                            onChange={(e) => setCurrentPost({...currentPost, excerpt: e.target.value})}
                                            className="w-full bg-main border border-border rounded-lg px-4 py-2 text-text-main focus:outline-none focus:border-accent-blue h-20 resize-none"
                                            placeholder="Short description for the blog list..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Content (Markdown) *</label>
                                        <textarea 
                                            value={currentPost.content || ''} 
                                            onChange={(e) => setCurrentPost({...currentPost, content: e.target.value})}
                                            className="w-full bg-main border border-border rounded-lg px-4 py-2 text-text-main focus:outline-none focus:border-accent-blue h-64 font-mono text-sm"
                                            placeholder="# Heading 1&#10;&#10;Write your post content here using Markdown..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Author</label>
                                            <input 
                                                type="text" 
                                                value={currentPost.author || ''} 
                                                onChange={(e) => setCurrentPost({...currentPost, author: e.target.value})}
                                                className="w-full bg-main border border-border rounded-lg px-4 py-2 text-text-main focus:outline-none focus:border-accent-blue"
                                                placeholder="Author Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Image URL</label>
                                            <input 
                                                type="text" 
                                                value={currentPost.imageUrl || ''} 
                                                onChange={(e) => setCurrentPost({...currentPost, imageUrl: e.target.value})}
                                                className="w-full bg-main border border-border rounded-lg px-4 py-2 text-text-main focus:outline-none focus:border-accent-blue"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 pt-2">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                id="published"
                                                checked={currentPost.published || false}
                                                onChange={(e) => setCurrentPost({...currentPost, published: e.target.checked})}
                                                className="w-4 h-4 rounded border-border bg-main text-accent-blue focus:ring-accent-blue focus:ring-offset-main"
                                            />
                                            <label htmlFor="published" className="text-sm font-bold text-text-main">
                                                Publish Post (Visible to public)
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                id="featured"
                                                checked={currentPost.featured || featuredPosts.includes(currentPost.slug || '')}
                                                onChange={(e) => setCurrentPost({...currentPost, featured: e.target.checked})}
                                                className="w-4 h-4 rounded border-border bg-main text-yellow-500 focus:ring-yellow-500 focus:ring-offset-main"
                                            />
                                            <label htmlFor="featured" className="text-sm font-bold text-text-main flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                                Feature on Main Page (Max 3)
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                                        <button 
                                            onClick={() => setIsEditingPost(false)}
                                            className="px-6 py-2 rounded-lg text-sm font-bold text-text-muted hover:text-text-main transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={saveBlogPost}
                                            disabled={savingPost}
                                            className="flex items-center gap-2 bg-accent-blue text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
                                        >
                                            {savingPost ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Post
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-panel border border-border rounded-2xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-card/50">
                                            <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Title</th>
                                            <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
                                            <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Featured</th>
                                            <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Date</th>
                                            <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {blogPosts.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-text-muted">
                                                    No blog posts found. Create your first post!
                                                </td>
                                            </tr>
                                        ) : (
                                            blogPosts.map(post => (
                                                <tr key={post.id} className="border-b border-border/50 hover:bg-card/30 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-text-main">{post.title}</div>
                                                        <div className="text-xs text-text-muted font-mono mt-1">/{post.slug}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        {post.published ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-bold">
                                                                <CheckCircle className="w-3 h-3" /> Published
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-500 text-xs font-bold">
                                                                <AlertTriangle className="w-3 h-3" /> Draft
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <button 
                                                            onClick={() => toggleFeaturedPost(post.slug)}
                                                            className={`p-2 rounded-lg transition-colors ${featuredPosts.includes(post.slug) ? 'text-yellow-500 bg-yellow-500/10' : 'text-text-muted hover:text-yellow-500 bg-card border border-border'}`}
                                                            title={featuredPosts.includes(post.slug) ? "Unfeature Post" : "Feature Post"}
                                                        >
                                                            <Sparkles className={`w-4 h-4 ${featuredPosts.includes(post.slug) ? 'fill-yellow-500' : ''}`} />
                                                        </button>
                                                    </td>
                                                    <td className="p-4 text-sm text-text-muted">
                                                        {new Date(post.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => {
                                                                    setCurrentPost({
                                                                        ...post,
                                                                        featured: featuredPosts.includes(post.slug)
                                                                    });
                                                                    setIsEditingPost(true);
                                                                }}
                                                                className="p-2 bg-card border border-border rounded-lg text-text-muted hover:text-accent-blue hover:border-accent-blue/50 transition-colors"
                                                                title="Edit Post"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteBlogPost(post.id)}
                                                                className="p-2 bg-card border border-border rounded-lg text-text-muted hover:text-accent-red hover:border-accent-red/50 transition-colors"
                                                                title="Delete Post"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
