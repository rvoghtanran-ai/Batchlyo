
import React, { useState, useEffect } from 'react';
import { X, Save, Sheet, HelpCircle, Copy, Check, AlertTriangle } from 'lucide-react';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  onSave: (url: string) => void;
}

const GAS_CODE = `function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var jsonData;
    
    // 1. Try parsing raw body (JSON)
    if (e.postData && e.postData.contents) {
      try { jsonData = JSON.parse(e.postData.contents); } catch(e){}
    }
    
    // 2. Try parsing form parameter 'payload' (More reliable for no-cors)
    if (!jsonData && e.parameter && e.parameter.payload) {
      try { jsonData = JSON.parse(e.parameter.payload); } catch(e){}
    }

    if (jsonData) {
      // Ensure it's an array
      if (!Array.isArray(jsonData)) jsonData = [jsonData];
      
      if (jsonData.length > 0) {
        // A. Handle Headers
        var headers = [];
        if (sheet.getLastRow() === 0) {
          headers = Object.keys(jsonData[0]);
          sheet.appendRow(headers);
        } else {
          headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        }
        
        // B. Map Data to Headers
        var rows = jsonData.map(item => {
          return headers.map(h => {
             var val = item[h];
             return (val === undefined || val === null) ? "" : String(val);
          });
        });
        
        // C. Append Rows
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      }
    }
    
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch(e) {
    return ContentService.createTextOutput("Error: " + e.toString());
  } finally {
    lock.releaseLock();
  }
}`;

const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({ isOpen, onClose, webhookUrl, onSave }) => {
  const [url, setUrl] = useState(webhookUrl);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrl(webhookUrl);
    }
  }, [isOpen, webhookUrl]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GAS_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveWrapper = () => {
      if (url.includes('/dev')) {
          alert("WARNING: You are using a '/dev' URL. This will likely fail for automation. Please use the '/exec' URL provided after clicking 'Deploy'.");
      }
      onSave(url);
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#15151a] border border-white/10 w-[900px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#0f0f12] p-6 border-b border-white/5 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
               <Sheet className="w-5 h-5 text-green-500" />
               Google Sheets Integration v2
            </h2>
            <p className="text-xs text-gray-400 mt-1">Robust export to Google Sheets via Apps Script.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar bg-[#0f0f12] flex gap-6">
           
           {/* Left: Instructions & Input */}
           <div className="flex-1 space-y-6">
              <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-500 uppercase">1. Web App URL</label>
                 <input 
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full bg-[#15151a] border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-green-500 font-mono placeholder-gray-700"
                 />
                 {url && url.includes('/dev') && (
                     <p className="text-[10px] text-yellow-500 flex items-center gap-1 mt-1">
                         <AlertTriangle className="w-3 h-3" /> Warning: '/dev' URLs often fail. Use '/exec'.
                     </p>
                 )}
              </div>

              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 space-y-3">
                 <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" /> Installation Guide
                 </h3>
                 <ol className="text-[11px] text-gray-300 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Open your Google Sheet &gt; <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.</li>
                    <li><strong>Delete everything</strong> in `Code.gs` and paste the code on the right.</li>
                    <li>Click <strong>Deploy</strong> &gt; <strong>New Deployment</strong>.</li>
                    <li>Type: <strong>Web App</strong>.</li>
                    <li>Execute as: <strong>Me</strong>.</li>
                    <li>Who has access: <strong>Anyone</strong> (Critical!).</li>
                    <li>Click Deploy. Copy the URL ending in <code>/exec</code>.</li>
                 </ol>
              </div>
           </div>

           {/* Right: Code Snippet */}
           <div className="w-[400px] bg-[#1a1a20] rounded-lg border border-white/10 flex flex-col overflow-hidden">
               <div className="px-3 py-2 bg-black/20 border-b border-white/5 flex justify-between items-center">
                   <span className="text-[10px] font-mono text-gray-400">Code.gs</span>
                   <button 
                      onClick={handleCopyCode}
                      className="text-[10px] flex items-center gap-1.5 text-green-400 hover:text-green-300 transition-colors"
                   >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'COPIED' : 'COPY CODE'}
                   </button>
               </div>
               <div className="flex-1 p-3 overflow-y-auto custom-scrollbar bg-[#0f0f12]">
                   <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap break-all leading-relaxed select-all">
                       {GAS_CODE}
                   </pre>
               </div>
           </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-[#0f0f12] flex justify-end">
          <button 
            onClick={handleSaveWrapper}
            className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-white/5"
          >
            <Save className="w-4 h-4" />
            SAVE CONNECTION
          </button>
        </div>

      </div>
    </div>
  );
};

export default GoogleSheetModal;
