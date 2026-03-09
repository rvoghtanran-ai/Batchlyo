import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Shield, 
  Globe, 
  Cpu, 
  ChevronRight, 
  LayoutGrid, 
  BarChart3, 
  ArrowRight,
  Bot,
  Ghost,
  Share2,
  CheckCircle2,
  Lock,
  Workflow,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Code,
  Briefcase,
  Users,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, onSnapshot, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { GlobalSettings } from '../types';
import { BlogPost as BlogPostType } from './BlogPage';
import { Logo } from './Logo';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [pricing, setPricing] = useState<GlobalSettings['pricing']>({
      pro: { monthly: 29, yearly: 24 },
      agency: { monthly: 99, yearly: 82 }
  });
  const [featuredPosts, setFeaturedPosts] = useState<BlogPostType[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
      const handleScroll = () => {
          setScrolled(window.scrollY > 20);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
      const docRef = doc(db, "settings", "global");
      const unsubscribe = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data() as GlobalSettings;
              if (data.pricing) {
                  setPricing(data.pricing);
              }

              try {
                  let postsQuery;
                  if (data.featuredPosts && data.featuredPosts.length > 0) {
                      postsQuery = query(
                          collection(db, "blog_posts"),
                          where("slug", "in", data.featuredPosts),
                          where("published", "==", true)
                      );
                  } else {
                      postsQuery = query(
                          collection(db, "blog_posts"),
                          where("published", "==", true),
                          orderBy("date", "desc"),
                          limit(3)
                      );
                  }

                  const querySnapshot = await getDocs(postsQuery);
                  const posts: BlogPostType[] = [];
                  querySnapshot.forEach((doc) => {
                      posts.push({ id: doc.id, ...doc.data() } as BlogPostType);
                  });

                  if (data.featuredPosts && data.featuredPosts.length > 0) {
                      const sortedPosts = data.featuredPosts
                          .map(slug => posts.find(p => p.slug === slug))
                          .filter((p): p is BlogPostType => p !== undefined);
                      setFeaturedPosts(sortedPosts);
                  } else {
                      setFeaturedPosts(posts);
                  }
              } catch (e) {
                  console.error("Error fetching featured posts", e);
              } finally {
                  setLoadingPosts(false);
              }
          } else {
              setLoadingPosts(false);
          }
      }, (error) => {
          console.warn("Failed to subscribe to global settings:", error);
          setLoadingPosts(false);
      });

      return () => unsubscribe();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] text-gray-900 selection:bg-violet-500 selection:text-white overflow-x-hidden font-sans scroll-smooth custom-scrollbar">
      
      {/* ----------------- STICKY NAVBAR ----------------- */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-4 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm' : 'py-6 bg-transparent border-transparent'}`}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-md">
                <Logo className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900 group-hover:text-violet-600 transition-colors">Batchlyo</span>
            </div>
            
            <div className="hidden lg:flex items-center gap-8 text-[15px] font-bold text-gray-600">
              <button onClick={() => scrollToSection('workflow')} className="hover:text-violet-600 transition-colors cursor-pointer">Workflow</button>
              <button onClick={() => scrollToSection('engine')} className="hover:text-violet-600 transition-colors cursor-pointer">AI Engine</button>
              <button onClick={() => scrollToSection('stealth')} className="hover:text-violet-600 transition-colors cursor-pointer">Optimization</button>
              <button onClick={() => navigate('/pricing')} className="hover:text-violet-600 transition-colors cursor-pointer">Pricing</button>
              <button onClick={() => navigate('/blog')} className="hover:text-violet-600 transition-colors cursor-pointer">Blog</button>
              <button onClick={() => scrollToSection('faq')} className="hover:text-violet-600 transition-colors cursor-pointer">FAQ</button>
            </div>

            <button 
              onClick={() => navigate('/dashboard')}
              className="hidden md:flex items-center justify-center px-6 py-2.5 rounded-full bg-gray-900 text-white font-bold text-[15px] hover:bg-violet-600 transition-colors shadow-md hover:shadow-lg"
            >
              Launch Workspace
            </button>
        </div>
      </nav>

      {/* ----------------- SLEEK DARK-WHITE HERO ----------------- */}
      <div className="relative bg-[#f8f9fa] overflow-hidden">
        {/* Ambient Glows for light mode */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-200 rounded-full blur-[140px] pointer-events-none opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-200 rounded-full blur-[140px] pointer-events-none opacity-60" />
        
        {/* Hero Content */}
        <header className="relative z-10 pt-48 pb-16 px-6 lg:px-12 max-w-[1400px] mx-auto min-h-[75vh] flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center w-full">
            {/* Left Content */}
            <div className="text-left max-w-xl">
              <span className="inline-block px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 text-[13px] font-bold tracking-wider uppercase mb-6 shadow-sm border border-violet-200">
                The Agentic Pin Engine
              </span>
              <h1 className="text-5xl lg:text-[70px] font-extrabold tracking-tight mb-6 leading-[1.05] text-gray-900">
                Dominate Pinterest <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">With Automation.</span>
              </h1>
              
              <p className="text-[19px] text-gray-600 mb-8 leading-relaxed font-normal">
                Stop wasting hours manually pinning. Batchlyo transforms raw URLs into hundreds of high-ranking Pinterest pins. Generate perfect CSVs or automate via Webhooks instantly.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-full font-bold text-[18px] hover:from-violet-500 hover:to-fuchsia-400 transition-all shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:shadow-[0_15px_40px_rgba(139,92,246,0.4)] hover:-translate-y-1"
                >
                  START FOR FREE
                </button>
                <button 
                  onClick={() => scrollToSection('workflow')}
                  className="w-full sm:w-auto px-8 py-4 bg-white border border-gray-200 text-gray-800 rounded-full font-bold text-[18px] hover:bg-gray-50 transition-all hover:-translate-y-1 shadow-sm"
                >
                  See How It Works
                </button>
              </div>

              {/* Social Proof Avatars */}
              <div className="flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  <div className="flex -space-x-3">
                      <img className="w-10 h-10 rounded-full border-2 border-[#f8f9fa] object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop" alt="User" />
                      <img className="w-10 h-10 rounded-full border-2 border-[#f8f9fa] object-cover" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop" alt="User" />
                      <img className="w-10 h-10 rounded-full border-2 border-[#f8f9fa] object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop" alt="User" />
                      <img className="w-10 h-10 rounded-full border-2 border-[#f8f9fa] object-cover" src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop" alt="User" />
                      <div className="w-10 h-10 rounded-full border-2 border-[#f8f9fa] bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-600">
                          +5k
                      </div>
                  </div>
                  <div className="flex flex-col">
                      <div className="flex text-yellow-500 text-[14px]">
                          ★★★★★
                      </div>
                      <span className="text-[13px] font-medium text-gray-600">Trusted by modern creators</span>
                  </div>
              </div>
            </div>

            {/* Right Abstract Node Graphic (Adapted for light mode) */}
            <div className="hidden lg:flex justify-center items-center relative h-[450px]">
                {/* Central Platform */}
                <div className="absolute w-[400px] h-[250px] bg-white border border-gray-200/50 rounded-[40px] transform rotate-x-[60deg] -rotate-z-45 shadow-[0_40px_100px_rgba(0,0,0,0.06)]"></div>
                
                {/* Nodes & Connections */}
                <div className="relative w-full h-full flex items-center justify-center transform -translate-y-8">
                     {/* Paths */}
                     <div className="absolute top-1/2 left-1/4 right-1/4 h-[3px] bg-gradient-to-r from-cyan-400 to-fuchsia-400 rounded-full shadow-[0_0_15px_rgba(232,121,249,0.4)]"></div>
                     <div className="absolute top-1/4 bottom-1/4 left-1/2 w-[3px] bg-gradient-to-b from-emerald-400 to-orange-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.4)]"></div>

                     {/* Central Node representing the APP Logo */}
                     <div className="absolute w-20 h-20 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-[0_15px_40px_rgba(168,85,247,0.4)] z-20 hover:scale-110 transition-transform cursor-pointer border-4 border-white">
                         <Logo className="w-10 h-10 text-white" />
                     </div>

                     {/* Corner Nodes */}
                     <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-cyan-100 border-2 border-cyan-400 rounded-2xl shadow-lg flex items-center justify-center transform -rotate-12 hover:scale-110 transition-transform">
                         <Globe className="w-6 h-6 text-cyan-600" />
                     </div>
                     <div className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-emerald-100 border-2 border-emerald-400 rounded-2xl shadow-lg flex items-center justify-center transform rotate-12 hover:scale-110 transition-transform">
                         <Bot className="w-6 h-6 text-emerald-600" />
                     </div>
                     <div className="absolute bottom-1/4 left-1/4 -translate-x-1/2 translate-y-1/2 w-14 h-14 bg-orange-100 border-2 border-orange-400 rounded-2xl shadow-lg flex items-center justify-center transform hover:-rotate-12 hover:scale-110 transition-transform">
                         <Ghost className="w-6 h-6 text-orange-600" />
                     </div>
                     <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-14 h-14 bg-pink-100 border-2 border-pink-400 rounded-2xl shadow-lg flex items-center justify-center transform hover:rotate-12 hover:scale-110 transition-transform">
                         <Share2 className="w-6 h-6 text-pink-600" />
                     </div>
                </div>
            </div>
          </div>
        </header>

        {/* Trusted By Strip */}
        <div className="relative z-10 py-10 border-t border-b border-gray-200 bg-white/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 text-center">
                <p className="text-[12px] text-gray-400 uppercase tracking-widest font-bold mb-4">Powering Top Automation Agencies</p>
                <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-70 grayscale">
                   {['Shopify', 'WordPress', 'n8n', 'Cloudflare', 'Stripe', 'Make'].map(brand => (
                       <span key={brand} className="text-xl font-bold font-mono text-gray-800 tracking-tight">{brand}</span>
                   ))}
                </div>
            </div>
        </div>
      </div>

      {/* ----------------- SECTION: THE WORKFLOW ----------------- */}
      <section id="workflow" className="py-20 px-6 lg:px-12 relative bg-[#f8f9fa] scroll-mt-24">
        <div className="max-w-[1400px] mx-auto">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-10">
               <div className="max-w-xl">
                   <h2 className="text-4xl md:text-[46px] font-bold text-gray-900 leading-tight mb-4">The God-Tier Automation Pipeline</h2>
                   <p className="text-[17px] text-gray-600 leading-relaxed font-light">From raw URL to explosive growth in 4 autonomous steps. Build faster, more adaptable operations with an agentic automation you can see and control.</p>
               </div>
               <div className="hidden lg:flex justify-end">
                   <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-full font-bold shadow-sm hover:shadow-md hover:scale-105 transition-all">Explore the Workflow</button>
               </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {[
                   { icon: <Globe className="w-6 h-6 text-blue-600" />, title: "Ingest & Analyze", desc: "Scrape images from any URL. Smart engine analyzes content for viral Pinterest potential and SEO relevance.", bg: "bg-blue-100", border: "border-blue-200" },
                   { icon: <Cpu className="w-6 h-6 text-violet-600" />, title: "SEO Content Engine", desc: "Auto-writes high-CTR, SEO-heavy Pin titles & descriptions for maximum search visibility.", bg: "bg-violet-100", border: "border-violet-200" },
                   { icon: <Ghost className="w-6 h-6 text-orange-600" />, title: "Algorithm Optimization", desc: "Reduce duplicate detection risk. Micro-cropping & noise injection improves Pin uniqueness signals.", bg: "bg-orange-100", border: "border-orange-200" },
                   { icon: <Share2 className="w-6 h-6 text-pink-600" />, title: "Multi-Account Export", desc: "Export perfect CSVs for bulk upload to Pinterest or sync directly via Webhooks.", bg: "bg-pink-100", border: "border-pink-200" }
               ].map((step, idx) => (
                   <div key={idx} className="bg-white p-8 rounded-[28px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.06)] hover:border-gray-200 hover:-translate-y-1 transition-all">
                       <div className={`w-14 h-14 rounded-2xl ${step.bg} ${step.border} border flex items-center justify-center mb-6`}>
                           {step.icon}
                       </div>
                       <h3 className="text-[20px] font-bold text-gray-900 mb-3">{step.title}</h3>
                       <p className="text-gray-500 leading-relaxed font-normal text-[15px]">{step.desc}</p>
                   </div>
               ))}
           </div>
        </div>
      </section>

      {/* ----------------- SECTION: BENTO GRID FEATURES ----------------- */}
      <section id="engine" className="py-16 px-6 lg:px-12 bg-[#f8f9fa] relative scroll-mt-24">
         <div className="max-w-[1400px] mx-auto">
            <div className="mb-10 grid grid-cols-1 lg:grid-cols-2">
               <div>
                 <span className="text-violet-600 font-bold tracking-wider text-[12px] uppercase mb-3 block">Under the Hood</span>
                 <h2 className="text-4xl md:text-[46px] font-bold text-gray-900 leading-tight">Pro-Level Automation Infrastructure</h2>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                
                {/* Large Card: AI Engine */}
                <div 
                    onMouseEnter={() => setHoveredFeature(1)}
                    onMouseLeave={() => setHoveredFeature(null)}
                    className="col-span-1 md:col-span-3 bg-white border border-gray-100 rounded-[32px] p-10 relative overflow-hidden group transition-all hover:border-gray-200 hover:shadow-[0_20px_40px_rgba(139,92,246,0.08)] shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                >
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-violet-50 to-transparent pointer-events-none opacity-50"></div>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="w-14 h-14 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center mb-6">
                            <Bot className="w-7 h-7 text-violet-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Content Engine</h3>
                        <p className="text-[16px] text-gray-600 max-w-lg leading-relaxed font-normal mb-8 flex-grow">
                            Don't rely on basic prompts. Our proprietary engine is specifically trained on Pinterest's algorithm. 
                            It auto-detects image context to write keyword-rich Pin titles and descriptions that rank instantly.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-auto">
                            <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[12px] font-bold tracking-wide">Smart Context</span>
                            <span className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-600 text-[12px] font-bold tracking-wide">Auto-SEO</span>
                            <span className="px-3 py-1.5 rounded-full bg-fuchsia-50 text-fuchsia-600 text-[12px] font-bold tracking-wide">Bulk Generation</span>
                        </div>
                    </div>
                </div>

                {/* Tall Card: Distribution */}
                <div className="col-span-1 md:col-span-3 bg-white border border-gray-100 rounded-[32px] p-10 relative overflow-hidden group hover:border-gray-200 hover:shadow-[0_20px_40px_rgba(16,185,129,0.08)] shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all">
                     <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-emerald-50 to-transparent pointer-events-none opacity-50"></div>
                     <div className="relative z-10 flex flex-col h-full">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mb-6">
                             <Workflow className="w-7 h-7 text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Multi-Account Distribution</h3>
                        <p className="text-[16px] text-gray-600 mb-8 font-normal max-w-lg flex-grow">
                            Push your optimized data anywhere. We provide native schemas and bulk CSV exports for:
                        </p>
                        <ul className="space-y-4 mt-auto">
                            {['Pinterest Native Bulk Upload', 'n8n Automation (Hands-Free)', 'Make.com / Integromat', 'Google Sheets (Apps Script)'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-[15px] text-gray-800 font-medium">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                     </div>
                </div>

                {/* Small Card: Stealth */}
                <div id="stealth" className="col-span-1 md:col-span-2 bg-white border border-gray-100 rounded-[32px] p-8 group hover:border-gray-200 hover:shadow-[0_15px_30px_rgba(249,115,22,0.06)] shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all scroll-mt-24">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center mb-5">
                        <Ghost className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="text-[19px] font-bold text-gray-900 mb-2">Algorithm Compatibility</h3>
                    <p className="text-gray-500 leading-relaxed text-[15px] font-normal">
                        Pinterest flags duplicate images. Our engine applies invisible noise, micro-cropping, and metadata stripping to improve Pin uniqueness.
                    </p>
                </div>

                {/* Small Card: CSV Mastery */}
                <div className="col-span-1 md:col-span-2 bg-white border border-gray-100 rounded-[32px] p-8 group hover:border-gray-200 hover:shadow-[0_15px_30px_rgba(59,130,246,0.06)] shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center mb-5">
                        <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-[19px] font-bold text-gray-900 mb-2">Bulk CSV Mastery</h3>
                    <p className="text-gray-500 leading-relaxed text-[15px] font-normal">
                        Generate perfectly formatted CSVs for Pinterest Native Upload. Every row is SEO-heavy, with unique metadata and links.
                    </p>
                </div>

                {/* Small Card: Remix */}
                <div className="col-span-1 md:col-span-2 bg-white border border-gray-100 rounded-[32px] p-8 group hover:border-gray-200 hover:shadow-[0_15px_30px_rgba(236,72,153,0.06)] shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all">
                    <div className="w-12 h-12 rounded-xl bg-pink-100 border border-pink-200 flex items-center justify-center mb-5">
                        <RefreshCw className="w-6 h-6 text-pink-600" />
                    </div>
                    <h3 className="text-[19px] font-bold text-gray-900 mb-2">Smart Remix</h3>
                    <p className="text-gray-500 leading-relaxed text-[15px] font-normal">
                        Automatically spin titles, shuffle hashtags, and regenerate smart-links to create unique variations of winning posts in seconds.
                    </p>
                </div>

            </div>
         </div>
      </section>

      {/* ----------------- SECTION: COMPARISON ----------------- */}
      <section className="py-20 px-6 lg:px-12 relative bg-[#f8f9fa]">
          <div className="max-w-[1200px] mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  {/* Left Abstract Graphic */}
                  <div className="hidden md:flex justify-center flex-col order-2 md:order-1">
                      <h2 className="text-4xl lg:text-[46px] font-bold text-gray-900 leading-tight mb-6">Stop Leaving Traffic on the Table</h2>
                      <p className="text-gray-600 text-[17px] mb-8 font-normal max-w-md">The manual way is slow and unscalable. Batchlyo powers massive workflows with agentic AI precision.</p>
                      <button onClick={() => navigate('/dashboard')} className="self-start px-8 py-4 bg-white border border-gray-200 text-gray-900 rounded-full font-bold shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">Automate Now</button>
                  </div>

                  {/* Cards order-1 md:order-2 */}
                  <div className="flex flex-col gap-6 order-1 md:order-2">
                      {/* The Old Way */}
                      <div className="p-8 rounded-[32px] bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                          <h3 className="text-red-500 font-bold uppercase tracking-widest text-[12px] mb-5 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" /> The Manual Way
                          </h3>
                          <ul className="space-y-4">
                              <li className="flex items-center gap-3 text-gray-600 text-[15px]">
                                  <span className="text-red-500 font-bold text-lg">✕</span> 
                                  <span>Manually downloading images & writing content</span>
                              </li>
                              <li className="flex items-center gap-3 text-gray-600 text-[15px]">
                                  <span className="text-red-500 font-bold text-lg">✕</span> 
                                  <span>Getting flagged for duplicate content</span>
                              </li>
                              <li className="flex items-center gap-3 text-gray-600 text-[15px]">
                                  <span className="text-red-500 font-bold text-lg">✕</span> 
                                  <span>Zero outbound clicks or saves</span>
                              </li>
                          </ul>
                      </div>

                      {/* The Batchlyo Way */}
                      <div className="p-8 rounded-[32px] bg-gradient-to-br from-[#1A0B2E] to-[#2d1154] relative shadow-[0_20px_50px_rgba(168,85,247,0.2)]">
                          <h3 className="text-fuchsia-400 font-bold uppercase tracking-widest text-[12px] mb-5 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" /> The Batchlyo Way
                          </h3>
                          <ul className="space-y-4 mb-8">
                              <li className="flex items-center gap-3 text-white text-[15px]">
                                  <CheckCircle2 className="w-5 h-5 text-fuchsia-400 flex-shrink-0" /> 
                                  <span>Scrape 100 images in 1 click</span>
                              </li>
                              <li className="flex items-center gap-3 text-white text-[15px]">
                                  <CheckCircle2 className="w-5 h-5 text-fuchsia-400 flex-shrink-0" /> 
                                  <span>Smart engine writes all metadata</span>
                              </li>
                              <li className="flex items-center gap-3 text-white text-[15px]">
                                  <CheckCircle2 className="w-5 h-5 text-fuchsia-400 flex-shrink-0" /> 
                                  <span>Optimization prevents flags & scales n8n</span>
                              </li>
                          </ul>
                          
                          <div className="flex items-center justify-between border-t border-white/20 pt-6">
                              <div>
                                  <p className="text-[11px] text-white/70 uppercase font-bold tracking-wider mb-1">Starting at</p>
                                  <p className="text-3xl font-bold text-white">${pricing.pro.monthly}<span className="text-sm font-normal text-white/50">/mo</span></p>
                              </div>
                              <button 
                                 onClick={() => navigate('/pricing')}
                                 className="bg-white text-[#1a0b2e] hover:bg-gray-100 px-6 py-3 rounded-full text-[14px] font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                              >
                                 View Plans
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* ----------------- SECTION: USE CASES ----------------- */}
      <section className="py-20 px-6 lg:px-12 bg-[#f8f9fa]">
          <div className="max-w-[1400px] mx-auto">
              <h2 className="text-4xl md:text-[46px] font-bold mb-12 text-center text-gray-900">Built For Explosive Growth</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: E-Commerce */}
                  <div className="group rounded-[32px] bg-white border border-gray-100 hover:border-gray-200 transition-all overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1">
                      <div className="h-48 w-full overflow-hidden relative">
                          <img src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=800&auto=format&fit=crop" alt="E-commerce owner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[12px] font-bold tracking-wider uppercase border border-white/20">E-Commerce</span>
                          </div>
                      </div>
                      <div className="p-8 pb-10 flex flex-col items-center text-center">
                          <div className="w-14 h-14 rounded-2xl bg-cyan-100 border border-cyan-200 flex items-center justify-center mb-5 -mt-12 relative z-10 shadow-lg group-hover:bg-cyan-600 transition-colors">
                              <Briefcase className="w-7 h-7 text-cyan-600 group-hover:text-white transition-colors" />
                          </div>
                          <h3 className="text-[22px] font-bold text-gray-900 mb-3">Shopify & Print on Demand</h3>
                          <p className="text-gray-500 font-normal leading-relaxed text-[15px]">
                              Scrape your own entire store. Generate hundreds of highly optimized visual variations for your unique dropshipping or POD products to absolutely dominate search results algorithms.
                          </p>
                      </div>
                  </div>

                  {/* Card 2: Niche Bloggers */}
                  <div className="group rounded-[32px] bg-white border border-gray-100 hover:border-gray-200 transition-all overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1">
                      <div className="h-48 w-full overflow-hidden relative">
                          <img src="https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?q=80&w=800&auto=format&fit=crop" alt="Blogger at cafe" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[12px] font-bold tracking-wider uppercase border border-white/20">Content Creators</span>
                          </div>
                      </div>
                      <div className="p-8 pb-10 flex flex-col items-center text-center">
                          <div className="w-14 h-14 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center mb-5 -mt-12 relative z-10 shadow-lg group-hover:bg-violet-600 transition-colors">
                              <TrendingUp className="w-7 h-7 text-violet-600 group-hover:text-white transition-colors" />
                          </div>
                          <h3 className="text-[22px] font-bold text-gray-900 mb-3">Niche Bloggers</h3>
                          <p className="text-gray-500 font-normal leading-relaxed text-[15px]">
                              Revive old blog posts. Turn one single core article into 50 fresh, algorithmically unique posts with entirely different images and re-phrased titles to continuously pump SEO juice.
                          </p>
                      </div>
                  </div>

                  {/* Card 3: Agencies */}
                  <div className="group rounded-[32px] bg-white border border-gray-100 hover:border-gray-200 transition-all overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1">
                      <div className="h-48 w-full overflow-hidden relative">
                          <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&auto=format&fit=crop" alt="Agency meeting" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[12px] font-bold tracking-wider uppercase border border-white/20">B2B Agencies</span>
                          </div>
                      </div>
                      <div className="p-8 pb-10 flex flex-col items-center text-center">
                          <div className="w-14 h-14 rounded-2xl bg-fuchsia-100 border border-fuchsia-200 flex items-center justify-center mb-5 -mt-12 relative z-10 shadow-lg group-hover:bg-fuchsia-600 transition-colors">
                              <Users className="w-7 h-7 text-fuchsia-600 group-hover:text-white transition-colors" />
                          </div>
                          <h3 className="text-[22px] font-bold text-gray-900 mb-3">Marketing Agencies</h3>
                          <p className="text-gray-500 font-normal leading-relaxed text-[15px]">
                              Manage multiple demanding client accounts all at once. Switch workspaces instantly and export highly organized data to client-specific Google Sheets or completely automate n8n workflows.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* ----------------- SECTION: BLOG TEASER ----------------- */}
      <section className="py-20 px-6 lg:px-12 bg-[#f8f9fa]">
          <div className="max-w-[1400px] mx-auto lg:text-center">
              <div className="mb-12">
                  <span className="text-violet-600 font-bold tracking-wider text-[12px] uppercase mb-4 block">Learn from the Best</span>
                  <h2 className="text-4xl md:text-[46px] font-bold text-gray-900 mb-4">Content Automation Strategies</h2>
                  <p className="text-[17px] text-gray-600 font-normal max-w-2xl lg:mx-auto">
                      Read our latest guides on dominating social algorithms, maintaining account health, and scaling your outbound clicks.
                  </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 text-left">
                  {loadingPosts ? (
                      Array(3).fill(0).map((_, i) => (
                          <div key={i} className="bg-white rounded-[32px] h-[380px] animate-pulse border border-gray-100 shadow-sm" />
                      ))
                  ) : featuredPosts.length > 0 ? (
                      featuredPosts.map((post) => (
                          <div key={post.id} onClick={() => navigate(`/blog/${post.slug}`)} className="group cursor-pointer bg-white rounded-[32px] border border-gray-100 overflow-hidden hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:border-gray-200 transition-all hover:-translate-y-2">
                              <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
                                  <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                              </div>
                              <div className="p-8">
                                  <h3 className="text-[20px] font-bold text-gray-900 mb-3 group-hover:text-violet-600 transition-colors line-clamp-2">{post.title}</h3>
                                  <p className="text-gray-500 font-normal line-clamp-2 mb-6 text-[15px]">{post.excerpt}</p>
                                  <span className="text-[14px] font-bold text-violet-600 flex items-center group-hover:gap-2 transition-all">
                                      Read Full Guide <ArrowRight className="w-4 h-4 ml-1" />
                                  </span>
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="col-span-3 text-center py-10 text-gray-400">
                          No featured guides available yet.
                      </div>
                  )}
              </div>

              <div className="flex justify-center">
                  <button 
                      onClick={() => navigate('/blog')}
                      className="px-8 py-4 bg-white border border-gray-200 hover:border-gray-300 text-gray-900 rounded-full font-bold shadow-sm transition-all text-[15px] hover:shadow-md"
                  >
                      View All Articles
                  </button>
              </div>
          </div>
      </section>

      {/* ----------------- SECTION: FAQ ----------------- */}
      <section id="faq" className="py-20 px-6 lg:px-12 bg-[#f8f9fa] border-t border-gray-200 scroll-mt-24">
          <div className="max-w-[800px] mx-auto">
              <h2 className="text-3xl lg:text-[40px] font-bold text-gray-900 mb-10 text-center">Frequently Asked Questions</h2>
              <div className="space-y-4">
                  {[
                      { q: "Do I need my own API Keys?", a: "Yes. Batchlyo is a 'Bring Your Own Key' (BYOK) tool. This ensures you pay the lowest possible price directly to providers, with zero markup from us." },
                      { q: "Is this compliant with social platforms?", a: "We provide optimization tools to randomize image data and strip metadata, which helps in improving content uniqueness signals. However, automation should always be used responsibly." },
                      { q: "Can I use this for multiple accounts?", a: "Absolutely. You can create unlimited 'Active Projects' within the app to manage different clients or niches separately." },
                      { q: "Does it post directly to my social accounts?", a: "Batchlyo focuses on GENERATION and DATA PREP. We export perfect CSVs, or you can use our Webhook feature to build custom, hands-free posters directly in n8n or Make." }
                  ].map((item, i) => (
                      <div key={i} className="bg-white rounded-[24px] p-8 border border-gray-100 hover:border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-colors">
                          <h4 className="text-[17px] text-gray-900 font-bold mb-3">{item.q}</h4>
                          <p className="text-gray-500 font-normal leading-relaxed text-[15px]">{item.a}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* ----------------- CTA FOOTER ----------------- */}
      <section className="py-28 px-6 lg:px-12 bg-[#1A0B2E] text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[300px] bg-violet-600/30 rounded-full blur-[140px] pointer-events-none" />
          <div className="relative z-20 max-w-3xl mx-auto flex flex-col items-center">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Ready to scale your traffic?</h2>
              <p className="text-[18px] text-purple-200/80 mb-10 font-light">
                  Join the elite circle of marketers using automation to work smarter, not harder.
              </p>
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-full font-bold text-[18px] hover:shadow-[0_0_50px_rgba(168,85,247,0.7)] transition-shadow hover:-translate-y-1"
              >
                Launch Batchlyo Free
              </button>
          </div>
      </section>

      {/* Footer Links */}
      <footer className="py-12 border-t border-white/10 bg-[#12071F]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-lg flex items-center justify-center border border-white/20">
                    <Logo className="text-white w-4 h-4" />
                </div>
                <span className="text-[15px] font-bold text-white">Batchlyo</span>
            </div>
            <div className="flex gap-8 text-[14px] text-purple-200/60 font-medium flex-wrap justify-center">
                <button onClick={() => navigate('/about')} className="hover:text-white transition-colors">About Us</button>
                <button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">Contact</button>
                <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
                <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms of Service</button>
                <button onClick={() => navigate('/docs')} className="hover:text-white transition-colors">Documentation</button>
                <button onClick={() => navigate('/api')} className="hover:text-white transition-colors">API Reference</button>
            </div>
            <div className="text-[12px] text-purple-200/30 font-mono">
                Running locally. Secure & Private.
            </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
