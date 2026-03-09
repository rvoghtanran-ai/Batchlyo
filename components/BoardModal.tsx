
import React, { useState } from 'react';
import { X, Plus, Trash2, List, Hash, Briefcase, LayoutGrid, Layers, Check, AlertCircle } from 'lucide-react';
import { Board, WebhookAccount } from '../types';

interface BoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: Board[];
  onAddBoard: (name: string, externalId?: string) => void;
  onDeleteBoard: (id: string) => void;
  onBulkAddBoards: (lines: string[]) => void;
  activeAccountId: string;
  webhookAccounts: WebhookAccount[];
}

const BoardModal: React.FC<BoardModalProps> = ({
  isOpen,
  onClose,
  boards,
  onAddBoard,
  onDeleteBoard,
  onBulkAddBoards,
  activeAccountId,
  webhookAccounts
}) => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardId, setNewBoardId] = useState(''); // New State for ID
  const [bulkText, setBulkText] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  if (!isOpen) return null;

  // Filter boards for the active view
  const filteredBoards = activeAccountId 
     ? boards.filter(b => b.accountId === activeAccountId)
     : boards;

  // Resolve Account Name for Global View
  const getAccountName = (accId?: string) => {
      if (!accId) return 'Unassigned';
      const acc = webhookAccounts.find(a => a.id === accId);
      return acc ? acc.name : 'Unknown';
  };

  const handleAdd = () => {
    if (newBoardName.trim()) {
      onAddBoard(newBoardName.trim(), newBoardId.trim());
      setNewBoardName('');
      setNewBoardId('');
      showFeedback('success', 'Board added successfully');
    }
  };

  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;
    
    // Split by new line, trim whitespace, remove empty lines
    const lines = bulkText.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
    
    if (lines.length > 0) {
        onBulkAddBoards(lines);
        setBulkText('');
        showFeedback('success', `Successfully imported ${lines.length} boards.`);
        setTimeout(() => {
             setMode('single'); // Switch back to view list after delay
        }, 1000);
    } else {
        showFeedback('error', 'No valid board data found.');
    }
  };
  
  const showFeedback = (type: 'success' | 'error', msg: string) => {
      setFeedback({ type, msg });
      setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border w-[600px] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-panel p-6 border-b border-border flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-text-main tracking-tight flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-accent-purple" />
              Manage Boards
            </h2>
            <p className="text-xs text-text-muted mt-1">
                {activeAccountId 
                  ? `Editing workspace: ${getAccountName(activeAccountId)}`
                  : 'Viewing all boards (Global Mode)'
                }
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="p-6 pb-0 flex-shrink-0">
             <div className="flex p-1 bg-panel rounded-lg border border-border">
                <button 
                    onClick={() => setMode('single')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'single' ? 'bg-card text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                >
                    <List className="w-3 h-3" /> BOARD LIST
                </button>
                <button 
                    onClick={() => setMode('bulk')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'bulk' ? 'bg-card text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                >
                    <Layers className="w-3 h-3" /> BULK IMPORT
                </button>
            </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
            <div className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-2 ${feedback.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {feedback.msg}
            </div>
        )}

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-0">
            {mode === 'single' ? (
                <>
                    {/* Input Row */}
                    <div className="flex gap-2 mb-6 flex-shrink-0">
                        <div className="flex-1 relative">
                             <input
                                type="text"
                                value={newBoardName}
                                onChange={(e) => setNewBoardName(e.target.value)}
                                placeholder="Board Name"
                                className="w-full bg-panel border border-border rounded-lg pl-9 pr-3 py-3 text-sm text-text-main focus:outline-none focus:border-accent-purple placeholder-text-muted transition-colors"
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                             />
                             <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        </div>
                        <div className="w-1/3 relative">
                            <input
                                type="text"
                                value={newBoardId}
                                onChange={(e) => setNewBoardId(e.target.value)}
                                placeholder="ID (Opt)"
                                className="w-full bg-panel border border-border rounded-lg pl-8 pr-3 py-3 text-sm text-text-main focus:outline-none focus:border-accent-purple placeholder-text-muted font-mono transition-colors"
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            />
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
                        </div>
                        <button 
                            onClick={handleAdd}
                            className="bg-accent-purple hover:bg-purple-600 text-white px-4 rounded-lg transition-colors shadow-lg shadow-purple-900/20"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {filteredBoards.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-text-muted border border-dashed border-border rounded-xl bg-panel/50">
                                <Layers className="w-8 h-8 opacity-20 mb-2" />
                                <p className="text-xs font-medium">No boards found for this workspace.</p>
                                <p className="text-[10px] text-text-muted">Add one above or check Global View.</p>
                            </div>
                        ) : (
                            filteredBoards.map(board => (
                                <div key={board.id} className="group flex items-center justify-between bg-panel hover:bg-card p-3 rounded-xl border border-border hover:border-text-muted/20 transition-all">
                                    <div className="flex flex-col gap-1 min-w-0">
                                        <span className="text-sm font-bold text-text-main truncate">{board.name}</span>
                                        
                                        <div className="flex items-center gap-2">
                                            {/* ID Badge */}
                                            {board.externalId && (
                                                <span className="text-[10px] bg-black/30 text-text-muted px-1.5 py-0.5 rounded border border-border font-mono flex items-center gap-1">
                                                    <Hash className="w-2.5 h-2.5 opacity-50" />
                                                    {board.externalId}
                                                </span>
                                            )}
                                            
                                            {/* Account Badge (Global View Only) */}
                                            {!activeAccountId && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-bold tracking-wide uppercase ${
                                                    board.accountId 
                                                    ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20' 
                                                    : 'bg-panel text-text-muted border-border'
                                                }`}>
                                                    <Briefcase className="w-2.5 h-2.5" />
                                                    {getAccountName(board.accountId)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => onDeleteBoard(board.id)}
                                        className="text-text-muted hover:text-red-500 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10"
                                        title="Delete Board"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col h-full">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4 flex-shrink-0">
                        <p className="text-[11px] text-blue-200 leading-relaxed">
                            <strong>Bulk Import Format:</strong>
                            <br />
                            One board per line. Optionally add an ID separated by a pipe symbol <code>|</code>.
                        </p>
                        <div className="mt-2 bg-black/40 rounded p-2 text-[10px] font-mono text-blue-100/70 border border-blue-500/10">
                            Home Decor<br />
                            DIY Crafts | 98273645<br />
                            Summer Outfits | 11223344
                        </div>
                    </div>
                    <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="Paste your list here..."
                        className="flex-1 w-full bg-panel border border-border rounded-xl p-4 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-accent-purple resize-none custom-scrollbar font-mono leading-relaxed"
                    />
                    <button 
                        onClick={handleBulkAdd}
                        disabled={!bulkText.trim()}
                        className="w-full mt-4 bg-accent-purple hover:bg-purple-600 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20"
                    >
                        IMPORT BOARDS
                    </button>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default BoardModal;
