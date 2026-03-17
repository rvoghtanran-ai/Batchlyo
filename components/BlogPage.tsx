import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, ChevronRight } from 'lucide-react';
import { Logo } from './Logo';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  date: number;
  imageUrl?: string;
  published: boolean;
}

const BlogPage: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indexUrl, setIndexUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(
          collection(db, 'blog_posts'),
          where('published', '==', true),
          orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedPosts: BlogPost[] = [];
        querySnapshot.forEach((doc) => {
          fetchedPosts.push({ id: doc.id, ...doc.data() } as BlogPost);
        });
        setPosts(fetchedPosts);
      } catch (err: any) {
        console.error("Error fetching blog posts:", err);
        if (err.message && err.message.includes('Missing or insufficient permissions')) {
            setError("Firestore Permission Denied: Please update your Firebase Security Rules to allow public read access to the 'blog_posts' collection.");
        } else if (err.message && err.message.includes('requires an index')) {
            const urlMatch = err.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
            if (urlMatch) {
                setIndexUrl(urlMatch[0]);
                setError("Firestore Index Required: A composite index is required to query published posts by date.");
            } else {
                setError("Firestore Index Required: Please check your browser console for the link to create the required composite index for 'published' and 'date'.");
            }
        } else {
            setError("Failed to load blog posts. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 selection:bg-violet-500 selection:text-white font-sans">
      {/* Navbar - Sticky and Glassmorphic */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
              <Logo className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900 group-hover:text-violet-600 transition-colors">Pinlly</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-[15px] font-bold text-gray-600 hover:text-violet-600 transition-colors">Home</Link>
            <Link to="/dashboard" className="px-6 py-2.5 rounded-full bg-gray-900 text-white font-bold text-[15px] hover:bg-violet-600 transition-colors shadow-md hover:shadow-lg">
              Launch Workspace
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-36 pb-24 px-6 max-w-7xl mx-auto relative z-10">
        <div className="mb-20 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 text-[13px] font-bold tracking-wider uppercase mb-6 shadow-sm border border-violet-200">
             Knowledge Base
          </span>
          <h1 className="text-5xl md:text-[64px] font-black tracking-tight mb-6 leading-tight text-gray-900">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">Blog</span>
          </h1>
          <p className="text-[19px] text-gray-600 max-w-2xl mx-auto font-normal">
            Insights, tutorials, and proven strategies on Pinterest marketing and automation at scale.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-red-50 rounded-[32px] border border-red-100 shadow-sm">
            <h3 className="text-2xl font-bold mb-3 text-red-600">Error Loading Posts</h3>
            <p className="text-red-500 max-w-lg mx-auto mb-6">{error}</p>
            {indexUrl && (
              <a 
                href={indexUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-colors shadow-md"
              >
                Create Required Index in Firebase
              </a>
            )}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[32px] border border-gray-100 shadow-sm">
            <h3 className="text-[22px] font-bold text-gray-900 mb-3">No posts yet</h3>
            <p className="text-gray-500 text-[16px]">Check back later for new expert articles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link 
                key={post.id} 
                to={`/blog/${post.slug}`}
                className="group bg-white rounded-[32px] border border-gray-100 overflow-hidden hover:border-gray-200 transition-all hover:-translate-y-2 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] flex flex-col h-full"
              >
                {post.imageUrl ? (
                  <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
                    <img 
                      src={post.imageUrl} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gray-100 flex items-center justify-center border-b border-gray-200">
                    <Logo className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <div className="p-8 flex flex-col flex-grow">
                  <div className="flex items-center gap-4 text-[13px] font-bold text-gray-400 mb-4 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-violet-500" /> {new Date(post.date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-fuchsia-500" /> {post.author}</span>
                  </div>
                  <h2 className="text-[22px] font-bold text-gray-900 mb-4 group-hover:text-violet-600 transition-colors line-clamp-2 leading-snug">{post.title}</h2>
                  <p className="text-gray-600 text-[15px] line-clamp-3 mb-8 font-normal flex-grow">{post.excerpt}</p>
                  <div className="flex items-center mt-auto text-[15px] font-bold text-violet-600 group-hover:text-fuchsia-500 transition-colors">
                    Read Article <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BlogPage;
