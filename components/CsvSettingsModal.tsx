import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Table } from 'lucide-react';
import { CsvExportSettings } from '../types';

interface CsvSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SETTINGS: CsvExportSettings = {
  titleHeader: 'Title',
  descriptionHeader: 'Description',
  linkHeader: 'Source Url',
  imageHeader: 'Image Url',
  boardHeader: 'Board',
  boardIdHeader: 'Board ID',
  tagsHeader: 'Keywords',
  dateHeader: 'Schedule Date', // Changed from 'Publish Date'
  statusHeader: 'Status'
};

const CsvSettingsModal: React.FC<CsvSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<CsvExportSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('easyPin_csvSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge with default to ensure new keys exist
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (e) {}
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('easyPin_csvSettings', JSON.stringify(settings));
    onClose();
  };

  const updateSetting = (field: keyof CsvExportSettings, value: string) => {
     setSettings(prev => ({...prev, [field]: value}));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#15151a] border border-white/10 w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#0f0f12] p-6 border-b border-white/5 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Custom CSV Settings
            </h2>
            <p className="text-xs text-gray-400 mt-1">Map internal data to your own column headers.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
               <p className="text-[11px] text-emerald-300 leading-relaxed flex items-start gap-2">
                 <Table className="w-4 h-4 flex-shrink-0 mt-0.5" />
                 <span>
                   Define exactly what the top row of your CSV file should look like. 
                   Useful for importing into Make, Zapier, or custom CMS tools.
                 </span>
               </p>
          </div>

          <div className="space-y-4">
             {/* Fields */}
             {[
               { id: 'titleHeader', label: 'Title Column', placeholder: 'e.g. Headline' },
               { id: 'descriptionHeader', label: 'Description Column', placeholder: 'e.g. Caption' },
               { id: 'linkHeader', label: 'Destination Link Column', placeholder: 'e.g. Source URL' },
               { id: 'imageHeader', label: 'Image Column', placeholder: 'e.g. Media' },
               { id: 'boardHeader', label: 'Board Name Column', placeholder: 'e.g. Category' },
               { id: 'boardIdHeader', label: 'Board ID Column', placeholder: 'e.g. pinterest_board_id' },
               { id: 'tagsHeader', label: 'Tags Column', placeholder: 'e.g. Keywords' },
               { id: 'dateHeader', label: 'Schedule Date Column', placeholder: 'e.g. Post At' },
               { id: 'statusHeader', label: 'Status Column', placeholder: 'e.g. Status' },
             ].map((field) => (
               <div key={field.id} className="flex items-center gap-4">
                 <label className="w-32 text-xs font-bold text-gray-500 uppercase text-right">{field.label}</label>
                 <input
                    type="text"
                    value={settings[field.id as keyof CsvExportSettings] || ''}
                    onChange={(e) => updateSetting(field.id as keyof CsvExportSettings, e.target.value)}
                    placeholder={field.placeholder}
                    className="flex-1 bg-[#0f0f12] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono placeholder-gray-700"
                 />
               </div>
             ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-[#0f0f12] flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-white/5"
          >
            <Save className="w-4 h-4" />
            SAVE MAPPING
          </button>
        </div>

      </div>
    </div>
  );
};

export default CsvSettingsModal;