import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (images: string[]) => void;
  initialImages: string[];
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, onConfirm, initialImages }) => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;


  // Sync state when modal opens or initial images change
  useEffect(() => {
    if (isOpen) {
      setSelectedImages(initialImages);
      setCurrentPage(1);
    }
  }, [isOpen, initialImages]);


  if (!isOpen) return null;

  const handleRemove = (imageToRemove: string) => {
    setSelectedImages(prev => prev.filter(img => img !== imageToRemove));
  };


  const handleConfirm = () => {
    onConfirm(selectedImages);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-card border border-border w-[900px] h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-panel p-6 border-b border-border flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
               <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-main">Import Preview</h2>
              <p className="text-xs text-text-muted">Review images before adding to queue ({selectedImages.length} selected)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Grid Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-bg-main/50">
          {selectedImages.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-text-muted gap-2">
                <AlertCircle className="w-8 h-8 opacity-50" />
                <p>No images selected.</p>
             </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {selectedImages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((img, idx) => (
                  <div key={`${idx}-${img}`} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-black/40">
                    <img 
                      src={img} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => handleRemove(img)}
                        className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full transform scale-90 group-hover:scale-100 transition-all"
                        title="Remove image"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedImages.length > itemsPerPage && (
                <div className="flex justify-center items-center gap-4 mt-4 py-4 border-t border-border/50">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-4 py-2 rounded-lg bg-panel border border-border text-text-main disabled:opacity-30 hover:bg-bg-main transition-colors text-sm font-medium"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-text-muted">
                    Page <span className="text-text-main font-bold">{currentPage}</span> of {Math.ceil(selectedImages.length / itemsPerPage)}
                  </span>
                  <button 
                    disabled={currentPage === Math.ceil(selectedImages.length / itemsPerPage)}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-4 py-2 rounded-lg bg-panel border border-border text-text-main disabled:opacity-30 hover:bg-bg-main transition-colors text-sm font-medium"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-panel flex justify-between items-center flex-shrink-0">
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text-main font-medium text-sm px-4 py-2"
          >
            DISCARD ALL
          </button>
          
          <button 
            onClick={handleConfirm}
            disabled={selectedImages.length === 0}
            className="bg-accent-blue hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
          >
            <Check className="w-4 h-4" />
            ADD TO QUEUE
          </button>
        </div>

      </div>
    </div>
  );
};

export default PreviewModal;