import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#050507] flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/20 animate-in zoom-in duration-300">
        <AlertTriangle className="w-12 h-12 text-red-500" />
      </div>
      
      <h1 className="text-6xl font-black text-white mb-4 tracking-tighter">404</h1>
      <h2 className="text-2xl font-bold text-text-main mb-6">Page Not Found</h2>
      
      <p className="text-text-muted max-w-md mb-8">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      
      <Link 
        to="/" 
        className="bg-accent-blue hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
      >
        <Home className="w-4 h-4" />
        RETURN HOME
      </Link>
    </div>
  );
};

export default NotFound;
