import React from 'react';
import { UploadCloud, Globe, Search, Loader2, Wand2 } from 'lucide-react';

interface IngestionHubViewProps {
    handleFileUpload: (files: FileList | null) => void;
    scrapeUrl: string;
    setScrapeUrl: (url: string) => void;
    handleScrape: (url: string) => void;
    isScraping: boolean;
}

export const IngestionHubView: React.FC<IngestionHubViewProps> = ({
    handleFileUpload,
    scrapeUrl,
    setScrapeUrl,
    handleScrape,
    isScraping
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
             {/* Upload Panel */}
             <div className="relative group/upload rounded-3xl p-[1px] overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-b from-blue-500 via-transparent to-transparent opacity-20 group-hover/upload:opacity-40 transition-opacity duration-500"></div>
                 <div className="relative bg-card rounded-[23px] h-full border-2 border-border shadow-sm flex flex-col p-8 sm:p-10">
                     <div className="absolute top-0 right-0 w-40 h-40 bg-accent-blue/10 blur-[60px] rounded-full pointer-events-none"></div>
                     <div className="mb-8 relative z-10 flex items-center gap-4">
                         <div className="w-14 h-14 rounded-2xl bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20">
                             <UploadCloud className="w-7 h-7 text-accent-blue" />
                         </div>
                         <div>
                            <h2 className="text-2xl font-black text-text-main tracking-tight">Mass Upload</h2>
                            <p className="text-xs text-text-muted mt-1 font-medium">Images, CSVs, or Zips.</p>
                         </div>
                     </div>
                     
                     <div 
                         onClick={() => document.getElementById('file-upload')?.click()}
                         className="flex-1 min-h-[250px] relative rounded-3xl group/dropzone cursor-pointer overflow-hidden isolate transition-all hover:shadow-md"
                     >
                        <div className="absolute inset-0 bg-blue-500/5 group-hover/dropzone:bg-blue-500/10 transition-colors duration-300"></div>
                        <div className="absolute inset-0 border-2 border-dashed border-blue-500/30 group-hover/dropzone:border-blue-500/60 rounded-3xl transition-colors duration-300 mx-1 my-1"></div>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
                            <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 group-hover/dropzone:scale-110 transition-transform duration-500 border border-blue-500/20 shadow-sm">
                                <UploadCloud className="w-10 h-10 text-blue-500" />
                            </div>
                            <h3 className="font-black text-xl text-text-main mb-2">Drag & Drop Files Here</h3>
                            <p className="text-sm font-medium text-text-muted">or click to browse from your computer</p>
                            <div className="flex items-center gap-3 mt-8">
                                <span className="text-[10px] font-bold px-3 py-1.5 rounded-md bg-panel border border-border text-text-muted uppercase tracking-wider">.jpg, .png</span>
                                <span className="text-[10px] font-bold px-3 py-1.5 rounded-md bg-panel border border-border text-text-muted uppercase tracking-wider">.csv</span>
                                <span className="text-[10px] font-bold px-3 py-1.5 rounded-md bg-panel border border-border text-text-muted uppercase tracking-wider">.zip</span>
                            </div>
                        </div>
                         <input type="file" id="file-upload" className="hidden" multiple accept="image/*,.csv,.zip" onChange={(e) => handleFileUpload(e.target.files)} />
                     </div>
                 </div>
             </div>

             {/* Scraper Panel */}
             <div className="relative group/scrape rounded-3xl p-[1px] overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-b from-rose-500 via-transparent to-transparent opacity-20 group-hover/scrape:opacity-40 transition-opacity duration-500"></div>
                 <div className="relative bg-card rounded-[23px] h-full border-2 border-border shadow-sm flex flex-col p-8 sm:p-10">
                     <div className="absolute top-0 right-0 w-40 h-40 bg-accent-red/10 blur-[60px] rounded-full pointer-events-none"></div>
                     <div className="mb-8 relative z-10 flex items-center gap-4">
                         <div className="w-14 h-14 rounded-2xl bg-accent-red/10 flex items-center justify-center border border-accent-red/20">
                             <Globe className="w-7 h-7 text-accent-red" />
                         </div>
                         <div>
                            <h2 className="text-2xl font-black text-text-main tracking-tight">Viral Scraper</h2>
                            <p className="text-xs text-text-muted mt-1 font-medium">Extract magic from URLs.</p>
                         </div>
                     </div>

                     <div className="flex-1 flex flex-col justify-center space-y-6 relative z-10">
                         <div className="bg-panel p-6 rounded-2xl border-2 border-border shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <Search className="w-5 h-5 text-rose-500" />
                                <h4 className="font-bold text-sm text-text-main uppercase tracking-wider">Target Domain</h4>
                            </div>
                            <input
                                type="url"
                                value={scrapeUrl}
                                onChange={(e) => setScrapeUrl(e.target.value)}
                                placeholder="https://pinterest.com/pin/1234..."
                                className="w-full bg-card border-2 border-border rounded-xl px-5 py-4 text-sm font-medium text-text-main focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all outline-none shadow-inner"
                            />
                         </div>
                         
                         <button 
                             onClick={() => handleScrape(scrapeUrl)}
                             disabled={isScraping || !scrapeUrl}
                             className={`w-full h-12 rounded-xl font-bold text-[14px] transition-all flex items-center justify-center gap-2.5 ${isScraping ? 'bg-panel border border-border cursor-wait text-text-muted' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 border border-transparent'}`}
                         >
                             {isScraping ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Wand2 className="w-4 h-4 text-white" />}
                             {isScraping ? 'Extracting Data...' : 'Initiate Extraction'}
                         </button>
                     </div>
                 </div>
             </div>
        </div>
    );
};
