import React, { useState, useEffect } from 'react';
import { X, Save, Layers, Link as LinkIcon, Type, Hash, CalendarClock } from 'lucide-react';
import { Pin, Board } from '../types';

interface EditPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  pin: Pin | null;
  boards: Board[];
  onSave: (updatedPin: Pin) => void;
  activeAccountId?: string; // NEW PROP
}

const EditPinModal: React.FC<EditPinModalProps> = ({ isOpen, onClose, pin, boards, onSave, activeAccountId }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    destinationLink: '',
    board: '',
    tags: '',
    scheduledTime: ''
  });

  // Filter boards for the dropdown based on active context
  const filteredBoards = activeAccountId 
      ? boards.filter(b => b.accountId === activeAccountId)
      : boards;

  useEffect(() => {
    if (pin) {
      setFormData({
        title: pin.title || '',
        description: pin.description || '',
        destinationLink: pin.destinationLink || '',
        board: pin.board || '',
        tags: pin.tags ? pin.tags.join(' ') : '',
        scheduledTime: pin.scheduledTime ? pin.scheduledTime.slice(0, 16) : '' // Format for input value (YYYY-MM-DDTHH:mm)
      });
    }
  }, [pin]);

  if (!isOpen || !pin) return null;

  const handleSave = () => {
    // 1. Validate Destination Link
    let validatedLink = formData.destinationLink.trim();
    if (validatedLink) {
        // Auto-fix missing protocol
        if (!/^https?:\/\//i.test(validatedLink)) {
            validatedLink = 'https://' + validatedLink;
        }
        
        try {
            // Strict check
            new URL(validatedLink);
        } catch (e) {
            alert("Invalid Destination URL. Please enter a valid link (e.g., https://example.com).");
            return;
        }
    }

    const updatedTags = formData.tags
      .split(/[\s,]+/)
      .filter(t => t.trim().length > 0)
      .map(t => t.startsWith('#') ? t : `#${t}`);

    onSave({
      ...pin,
      title: formData.title,
      description: formData.description,
      destinationLink: validatedLink, // Use validated link
      board: formData.board,
      tags: updatedTags,
      scheduledTime: formData.scheduledTime || undefined,
      status: (formData.title && formData.description && validatedLink && formData.board) ? 'ready' : 'draft' // Auto-update status if valid
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-[600px] rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-border bg-panel">
          <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
            Edit Pin
            <span className="text-xs font-normal text-text-muted bg-card px-2 py-0.5 rounded border border-border">ID: {pin.id.slice(0, 4)}</span>
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          
          <div className="flex gap-4">
            {/* Image Preview */}
            <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-border bg-panel">
              <img src={pin.imageUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="w-3 h-3" /> Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-panel border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent-blue focus:bg-card transition-all"
                  placeholder="Pin Title"
                />
              </div>

               {/* Board */}
               <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3 h-3" /> Board
                </label>
                <select
                  value={formData.board}
                  onChange={e => setFormData({...formData, board: e.target.value})}
                  className="w-full bg-panel border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent-blue focus:bg-card transition-all"
                >
                  <option value="">Select Board</option>
                  {filteredBoards.map(b => (
                    <option key={b.id} value={b.name}>
                        {b.name} {b.externalId ? `(${b.externalId})` : ''}
                    </option>
                  ))}
                </select>
                {activeAccountId && (
                    <p className="text-[9px] text-emerald-500/80">Filtered by active workspace</p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full h-24 bg-panel border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent-blue focus:bg-card transition-all resize-none custom-scrollbar"
              placeholder="Enter description..."
            />
          </div>

          {/* Scheduled Time */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <CalendarClock className="w-3 h-3" /> Scheduled Time
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledTime}
              onChange={e => setFormData({...formData, scheduledTime: e.target.value})}
              className="w-full bg-panel border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent-blue focus:bg-card transition-all font-mono"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Destination Link */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <LinkIcon className="w-3 h-3" /> Destination URL
            </label>
            <input
              type="text"
              value={formData.destinationLink}
              onChange={e => setFormData({...formData, destinationLink: e.target.value})}
              className="w-full bg-panel border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-accent-blue focus:bg-card transition-all font-mono"
              placeholder="https://..."
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="w-3 h-3" /> Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={e => setFormData({...formData, tags: e.target.value})}
              className="w-full bg-panel border border-border rounded-lg px-3 py-2 text-sm text-accent-blue focus:outline-none focus:border-accent-blue focus:bg-card transition-all font-mono"
              placeholder="#design #decor"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border bg-panel flex justify-end gap-3 rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="bg-accent-blue hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditPinModal;