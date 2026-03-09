
import React from 'react';
import { Pin } from '../types';
import { Trash2, Layers, Link as LinkIcon, CheckCircle2, Pencil, CalendarClock, Copy, Check, MoreVertical } from 'lucide-react';

interface PinCardProps {
  pin: Pin;
  onDelete: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onEdit?: (pin: Pin) => void; 
}

const PinCard: React.FC<PinCardProps> = ({ pin, onDelete, onToggleSelect, onEdit }) => {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const hasError = pin.status === 'error';
  const isReady = pin.status === 'ready';

  const handleCopyLink = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (pin.destinationLink) {
          navigator.clipboard.writeText(pin.destinationLink);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
      }
  };

  // Generate a consistent color based on the board name
  const getBoardColorClass = (name: string | undefined) => {
    if (!name || name === 'Unsorted') return 'text-text-muted';
    const colors = [
      'text-pink-400', 'text-purple-400', 'text-indigo-400', 
      'text-blue-400', 'text-cyan-400', 'text-teal-400', 
      'text-emerald-400', 'text-lime-400', 'text-yellow-400', 
      'text-orange-400', 'text-rose-400', 'text-fuchsia-400'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const boardColorClass = getBoardColorClass(pin.board);

  return (
    <div 
      className={`
        relative group rounded-xl overflow-hidden border transition-all duration-300 flex flex-col w-full bg-card
        ${pin.selected 
          ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
          : 'border-border hover:border-text-muted/20 hover:shadow-lg'
        }
      `}
    >
      {/* --- Header Image Section (Compacted to h-28) --- */}
      <div 
        className="relative h-28 w-full overflow-hidden bg-black/40 cursor-pointer group/image border-b border-border flex-shrink-0" 
        onClick={() => onToggleSelect(pin.id)}
      >
         <img 
            src={pin.imageUrl} 
            alt="Pin" 
            className={`w-full h-full object-cover transition-transform duration-700 ease-out will-change-transform ${pin.selected ? 'scale-105 opacity-80' : 'group-hover/image:scale-105'}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
                e.currentTarget.src = "https://placehold.co/400x600/1a1a20/FFF?text=Image+Error";
                e.currentTarget.onerror = null; 
            }}
          />
          
          {/* Status Overlay */}
          <div className={`absolute top-0 left-0 right-0 h-1 z-20 ${
               hasError ? 'bg-red-500' : 
               isReady ? 'bg-emerald-500' : 
               pin.status === 'processing' ? 'bg-blue-500 animate-pulse' : 'bg-transparent'
           }`} />

          {/* Selection Indicator */}
          <div className={`absolute top-2 left-2 transition-all duration-200 z-10 ${pin.selected ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-90'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-colors ${pin.selected ? 'bg-emerald-500 text-white' : 'bg-black/60 text-white/70 border border-white/30 hover:bg-black/80'}`}>
               <CheckCircle2 className="w-3 h-3" />
            </div>
          </div>

          {/* Action Overlay (Hover Only) */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-10">
              {onEdit && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(pin); }}
                  className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/10 transition-colors"
                  title="Edit Pin"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(pin.id); }}
                className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 rounded-full border border-white/10 transition-colors"
                title="Delete Pin"
              >
                <Trash2 className="w-3 h-3" />
              </button>
          </div>
      </div>

      {/* --- Content Body --- */}
      <div className="p-2 flex flex-col gap-1 flex-1 min-h-[120px]">
        
        {/* Title */}
        <h3 
            className="font-bold text-text-main text-[11px] leading-tight hover:text-emerald-400 cursor-pointer transition-colors line-clamp-2"
            onClick={() => onEdit && onEdit(pin)}
            title={pin.title}
        >
        {pin.title || <span className="text-text-muted italic font-normal">Waiting...</span>}
        </h3>

        {/* Description */}
        <p className="text-[9px] text-text-muted leading-snug line-clamp-3">
            {pin.description || "Content pending..."}
        </p>

        {/* Footer Meta */}
        <div className="mt-auto space-y-1">
            
            {/* Tags */}
            {pin.tags && pin.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 h-3.5 overflow-hidden">
                    {pin.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[8px] text-text-muted bg-panel px-1 rounded border border-border whitespace-nowrap">
                            #{tag.replace('#','')}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-1.5">
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <Layers className={`w-3 h-3 flex-shrink-0 ${boardColorClass}`} />
                    <span className={`text-[9px] font-bold truncate max-w-[80px] ${boardColorClass}`} title={pin.board}>
                        {pin.board || 'Unsorted'}
                    </span>
                </div>

                {pin.scheduledTime && (
                    <div className="flex items-center gap-1 text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded text-[9px]" title="Scheduled">
                        <CalendarClock className="w-2.5 h-2.5" />
                    </div>
                )}
            </div>
            
             {/* Link */}
            {pin.destinationLink && (
                <div className="flex items-center gap-1.5 bg-panel px-1.5 py-0.5 rounded border border-border group/link h-5">
                    <LinkIcon className="w-2.5 h-2.5 text-blue-500/70" />
                    <a 
                        href={pin.destinationLink} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[9px] text-blue-400/80 hover:text-blue-300 truncate flex-1 block font-medium"
                    >
                        {new URL(pin.destinationLink).hostname}
                    </a>
                    <button 
                        onClick={handleCopyLink}
                        className="text-text-muted hover:text-text-main opacity-0 group-hover/link:opacity-100 transition-opacity"
                    >
                        {copiedLink ? <Check className="w-2.5 h-2.5 text-green-500" /> : <Copy className="w-2.5 h-2.5" />}
                    </button>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default PinCard;
