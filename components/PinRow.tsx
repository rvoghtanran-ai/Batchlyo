
import React from 'react';
import { Pin } from '../types';
import { Trash2, Layers, Link as LinkIcon, CheckCircle2, Pencil, CalendarClock, Copy, Check, MoreVertical, ExternalLink } from 'lucide-react';

interface PinRowProps {
  pin: Pin;
  onDelete: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onEdit?: (pin: Pin) => void; 
}

const PinRow: React.FC<PinRowProps> = ({ pin, onDelete, onToggleSelect, onEdit }) => {
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

  const getStatusColor = () => {
      if (hasError) return 'bg-red-500';
      if (isReady) return 'bg-emerald-500';
      if (pin.status === 'processing') return 'bg-blue-500 animate-pulse';
      return 'bg-gray-500';
  };

  return (
    <div 
      className={`
        flex items-center gap-3 p-2 rounded-xl border transition-all duration-300 bg-panel group
        ${pin.selected 
          ? 'border-emerald-500/50 bg-emerald-500/5 shadow-sm' 
          : 'border-border hover:border-border/80 hover:bg-card/50'
        }
      `}
      onClick={() => onToggleSelect(pin.id)}
    >
      {/* Thumbnail */}
      <div className="relative w-9 h-9 rounded-md overflow-hidden bg-black/20 flex-shrink-0 border border-border">
          <img 
            src={pin.imageUrl} 
            alt="" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className={`absolute top-0 left-0 w-1 h-full ${getStatusColor()}`} />
      </div>

      {/* Title & Board */}
      <div className="flex-1 w-1/3 min-w-0 pr-4">
          <h4 className="text-[13px] font-bold text-text-main truncate mb-1 leading-tight">
              {pin.title || <span className="text-text-muted italic font-semibold">Untitled Pin</span>}
          </h4>
          <div className="flex items-center gap-2 overflow-hidden">
               <span className="text-[11px] text-text-muted flex items-center gap-1 font-semibold truncate shrink-0">
                  <Layers className="w-3.5 h-3.5" /> {pin.board || 'Unsorted'}
               </span>
               {pin.status === 'ready' && (
                   <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-md font-bold uppercase tracking-wide shrink-0">Ready</span>
               )}
          </div>
      </div>

      {/* Keywords / Content Preview (Mid Section) */}
      <div className="hidden lg:flex flex-1 w-1/3 items-center gap-3 pr-4">
          <div className="flex-1 min-w-0">
              <div className="flex gap-1 overflow-hidden flex-wrap h-[18px]">
                  {(pin.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} className="text-[9px] font-semibold text-text-muted bg-main border border-border px-1.5 py-0.5 rounded flex items-center whitespace-nowrap">#{tag}</span>
                  ))}
              </div>
          </div>
          <div className="w-24 bg-border/50 h-2 rounded-full overflow-hidden shrink-0">
              <div className={`h-full rounded-full ${isReady ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: isReady ? '100%' : '40%' }}></div>
          </div>
      </div>

      {/* Destination Link */}
      <div className="hidden md:flex items-center gap-2 w-1/4 max-w-[180px] shrink-0">
          {pin.destinationLink ? (
              <a 
                href={pin.destinationLink} 
                target="_blank" 
                rel="noreferrer" 
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-blue-500 hover:text-blue-600 truncate flex items-center gap-1 font-bold border border-blue-500/20 bg-blue-500/10 px-2 py-1 rounded-md w-full"
              >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{new URL(pin.destinationLink).hostname}</span>
              </a>
          ) : (
              <span className="text-[10px] font-semibold text-text-muted opacity-60">No link set</span>
          )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(pin); }}
                className="p-2 text-text-muted hover:text-text-main hover:bg-white/5 rounded-lg transition-colors"
              >
                  <Pencil className="w-4 h-4" />
              </button>
          )}
          <button 
                onClick={(e) => { e.stopPropagation(); onDelete(pin.id); }}
                className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
              <Trash2 className="w-4 h-4" />
          </button>
      </div>
    </div>
  );
};

export default PinRow;
