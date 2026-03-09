
import React, { useEffect, useState } from 'react';
import { X, Check, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300); // Wait for animation
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <Check className="w-4 h-4 text-green-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
    info: <Info className="w-4 h-4 text-blue-400" />,
    warning: <AlertCircle className="w-4 h-4 text-yellow-400" />
  };

  const bgColors = {
    success: 'bg-[#1a1a20] border-green-500/20 shadow-[0_4px_20px_rgba(34,197,94,0.15)]',
    error: 'bg-[#1a1a20] border-red-500/20 shadow-[0_4px_20px_rgba(239,68,68,0.15)]',
    info: 'bg-[#1a1a20] border-blue-500/20 shadow-[0_4px_20px_rgba(59,130,246,0.15)]',
    warning: 'bg-[#1a1a20] border-yellow-500/20 shadow-[0_4px_20px_rgba(234,179,8,0.15)]'
  };

  return (
    <div 
      className={`
        pointer-events-auto flex items-center gap-3 p-4 rounded-xl border min-w-[300px] backdrop-blur-md
        transition-all duration-300 transform
        ${bgColors[toast.type]}
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        animate-in slide-in-from-right-10 fade-in
      `}
    >
      <div className={`p-1.5 rounded-full bg-white/5 border border-white/5`}>
        {icons[toast.type]}
      </div>
      <p className="text-xs font-medium text-gray-200 flex-1">{toast.message}</p>
      <button 
        onClick={() => { setIsExiting(true); setTimeout(() => onRemove(toast.id), 300); }}
        className="text-gray-500 hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default Toast;
