
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Book, Code, LifeBuoy, Workflow, Terminal, FileJson, Shield, Zap } from 'lucide-react';
import { Logo } from './Logo';

export type InfoPageType = 'docs' | 'api' | 'support' | 'workflow' | 'privacy' | 'terms' | 'contact' | 'about';

interface InfoPageProps {
  type: InfoPageType;
}

interface PageContent {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const InfoPage: React.FC<InfoPageProps> = ({ type }) => {
  const navigate = useNavigate();
  
  const getContent = (): PageContent => {
    switch (type) {
      case 'privacy':
        return {
            title: "Privacy Policy",
            icon: <Shield className="w-8 h-8 text-emerald-400" />,
            content: (
                <div className="space-y-6 text-gray-300">
                    <p>Last Updated: {new Date().toLocaleDateString()}</p>
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">1. Introduction</h3>
                        <p>Batchlyo ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our application.</p>
                    </section>
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">2. Data Collection</h3>
                        <p>We are a <strong>local-first</strong> application. We do not store your images, API keys, or generated content on our servers. All data is stored locally in your browser's LocalStorage or IndexedDB.</p>
                    </section>
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">3. Third-Party Services</h3>
                        <p>To provide AI and hosting features, this application connects directly to third-party APIs (Google Gemini, OpenAI, Cloudflare, ImgBB, etc.) using the keys you provide. Please review their respective privacy policies.</p>
                    </section>
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">4. Contact Us</h3>
                        <p>If you have questions about this privacy policy, please contact us at support@batchlyo.com.</p>
                    </section>
                </div>
            )
        };
      case 'terms':
        return {
            title: "Terms of Service",
            icon: <FileJson className="w-8 h-8 text-blue-400" />,
            content: (
                <div className="space-y-6 text-gray-300">
                    <p>Last Updated: {new Date().toLocaleDateString()}</p>
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">1. Acceptance of Terms</h3>
                        <p>By accessing or using Batchlyo, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
                    </section>
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">2. Use License</h3>
                        <p>Permission is granted to temporarily download one copy of the materials (information or software) on Batchlyo's website for personal, non-commercial transitory viewing only.</p>
                    </section>
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">3. Disclaimer</h3>
                        <p>The materials on Batchlyo's website are provided on an 'as is' basis. Batchlyo makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
                    </section>
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">4. Limitations</h3>
                        <p>In no event shall Batchlyo or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Batchlyo's website.</p>
                    </section>
                </div>
            )
        };
      case 'about':
        return {
            title: "About Us",
            icon: <Zap className="w-8 h-8 text-purple-400" />,
            content: (
                <div className="space-y-6 text-gray-300">
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">Our Mission</h3>
                        <p>Batchlyo was built to empower creators and marketers to scale their Pinterest presence without the burnout. We believe in automation that enhances creativity, not replaces it.</p>
                    </section>
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">The Team</h3>
                        <p>We are a small team of passionate developers and marketers dedicated to building the best automation tools for the modern web.</p>
                    </section>
                </div>
            )
        };
      case 'contact':
        return {
            title: "Contact Us",
            icon: <LifeBuoy className="w-8 h-8 text-orange-400" />,
            content: (
                <div className="space-y-6 text-gray-300">
                    <section>
                        <h3 className="text-xl font-bold text-white mb-2">Get in Touch</h3>
                        <p>Have questions, feedback, or need support? We're here to help.</p>
                        <div className="mt-4 p-6 bg-white/5 rounded-xl border border-white/10">
                            <p className="mb-2"><strong>Email:</strong> support@batchlyo.com</p>
                            <p className="mb-2"><strong>Twitter:</strong> @BatchlyoApp</p>
                            <p><strong>Hours:</strong> Mon-Fri, 9am - 5pm EST</p>
                        </div>
                    </section>
                </div>
            )
        };
      case 'docs':
        return {
          title: "Documentation",
          icon: <Book className="w-8 h-8 text-blue-400" />,
          content: (
            <div className="space-y-8 text-gray-300">
              <section className="space-y-4">
                <h3 className="text-xl font-bold text-white">The Batchlyo Workflow</h3>
                <p>
                  Batchlyo is a **local-first** automation workstation designed for high-volume Pinterest marketing. 
                  Unlike traditional tools, it processes everything directly in your browser to ensure maximum privacy and speed.
                </p>
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                    <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider"><Zap className="w-4 h-4 text-yellow-400" /> Mastery Checklist</h4>
                    <ol className="list-decimal list-inside space-y-3 text-sm leading-relaxed">
                        <li><span className="text-white font-bold">API Integration:</span> Connect your AI providers (Gemini, OpenAI, or Cloudflare) in the AI Settings.</li>
                        <li><span className="text-white font-bold">Image Sourcing:</span> Use the URL Scraper to ingest product images or upload local ZIP/Folder directily.</li>
                        <li><span className="text-white font-bold">Smart Remix:</span> Use the AI Auto-Fill to generate human-like titles and descriptions once, then use Remix to create infinite unique account variants for free.</li>
                        <li><span className="text-white font-bold">Stealth Export:</span> Toggle "Algorithm Optimization" to ensure every image has unique metadata and noise to prevent platform bans.</li>
                    </ol>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-bold text-white">Advanced Features</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                        <h4 className="text-emerald-400 font-bold mb-1">Smart Link Tracking</h4>
                        <p className="text-xs">Automatically inject UTM parameters and track which boards convert best with our dynamic URL generator.</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                        <h4 className="text-purple-400 font-bold mb-1">Source of Truth</h4>
                        <p className="text-xs">Your AI credits are only used once per pin. Variations are generated locally, saving you hundreds of dollars in API costs.</p>
                    </div>
                </div>
              </section>
            </div>
          )
        };
      case 'support':
        return {
          title: "Support Center",
          icon: <LifeBuoy className="w-8 h-8 text-orange-400" />,
          content: (
            <div className="space-y-8 text-gray-300">
              <section className="space-y-4">
                <h3 className="text-xl font-bold text-white">Common Solutions</h3>
                <div className="space-y-4">
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5 group hover:border-indigo-500/30 transition-colors">
                        <h4 className="font-bold text-white mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Images failing to generate?</h4>
                        <p className="text-sm">Verify your **API Key** in settings. If you use Gemini, ensure your billing is active on Google Cloud. For free providers like Pollinations, try refreshing the page if the queue is overloaded.</p>
                    </div>
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5 group hover:border-emerald-500/30 transition-colors">
                        <h4 className="font-bold text-white mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Webhook not receiving data?</h4>
                        <p className="text-sm">Ensure your **Webhook URL** is correct and your listener (Make/n8n/Zapier) is set to "Active". Check the browser console (F12) for detailed payload errors.</p>
                    </div>
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5 group hover:border-purple-500/30 transition-colors">
                        <h4 className="font-bold text-white mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Local database full?</h4>
                        <p className="text-sm">Batchlyo stores data in your browser. If you have thousands of high-res images, use the **Admin Dashboard** to clear old pins and free up space.</p>
                    </div>
                </div>
              </section>
              <section className="p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl">
                 <h3 className="text-lg font-bold text-white mb-2 italic">Still need help?</h3>
                 <p className="text-sm mb-4">Our dedicated support team is available mon-fri for all Agency and Pro Elite members.</p>
                 <a href="mailto:support@batchlyo.pro" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                    Reach out to Support
                 </a>
              </section>
            </div>
          )
        };
      default:
        return {
          title: "Notice",
          icon: <Shield className="w-8 h-8 text-gray-400" />,
          content: <p>This section is under construction.</p>
        };
    }
  };

  const page = getContent();

  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col items-center py-12 px-6 overflow-y-auto">
       <div className="w-full max-w-4xl">
           <div className="flex justify-between items-center mb-8">
               <button 
                 onClick={() => navigate('/')}
                 className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
               >
                  <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                     <ArrowLeft className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold">Back to Home</span>
               </button>
               
               <div 
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => navigate('/')}
               >
                  <div className="w-8 h-8 bg-gradient-to-br from-accent-blue to-blue-700 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(0,112,243,0.3)] group-hover:scale-110 transition-transform">
                      <Logo className="text-white w-5 h-5" />
                  </div>
                  <span className="text-lg font-bold tracking-tight group-hover:text-white transition-colors">Batchlyo</span>
               </div>
           </div>

           <div className="bg-[#0f0f12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
               {/* Header */}
               <div className="p-8 border-b border-white/5 bg-[#15151a]">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                          {page.icon}
                      </div>
                      <h1 className="text-4xl font-bold tracking-tight">{page.title}</h1>
                  </div>
                  <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
               </div>

               {/* Content */}
               <div className="p-8 md:p-12 leading-relaxed">
                   {page.content}
               </div>
           </div>
           
           {/* Footer */}
           <div className="mt-8 text-center text-xs text-gray-600 font-mono">
               BATCHLYO • {new Date().getFullYear()} • v2.0 ELITE
           </div>
       </div>
    </div>
  );
};

export default InfoPage;
