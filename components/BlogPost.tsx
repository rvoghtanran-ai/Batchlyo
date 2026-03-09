import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { Logo } from './Logo';
import { db } from '../services/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { BlogPost as BlogPostType } from './BlogPage';
import ReactMarkdown from 'react-markdown';

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const q = query(
          collection(db, 'blog_posts'),
          where('slug', '==', slug),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setPost({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as BlogPostType);
        }
      } catch (err: any) {
        console.error("Error fetching blog post:", err);
        if (err.message && err.message.includes('Missing or insufficient permissions')) {
            setError("Firestore Permission Denied: Please update your Firebase Security Rules to allow public read access to the 'blog_posts' collection.");
        } else if (err.message && err.message.includes('requires an index')) {
            const urlMatch = err.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
            if (urlMatch) {
                setError(`Firestore Index Required: Please click [this link](${urlMatch[0]}) to create the required composite index.`);
            } else {
                setError("Firestore Index Required: Please check your browser console for the link to create the required composite index.");
            }
        } else {
            setError("Failed to load blog post. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPost();
    }
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 selection:bg-violet-500 selection:text-white font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => window.location.href = '/'}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
              <Logo className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900 group-hover:text-violet-600 transition-colors">Batchlyo</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/blog" className="text-[15px] font-bold text-gray-600 hover:text-violet-600 transition-colors">Blog</Link>
            <Link to="/dashboard" className="px-6 py-2.5 rounded-full bg-gray-900 text-white font-bold text-[15px] hover:bg-violet-600 transition-colors shadow-md hover:shadow-lg">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-36 pb-24 px-6 max-w-[850px] mx-auto">
        <Link to="/blog" className="inline-flex items-center gap-2 text-[15px] font-bold text-gray-500 hover:text-violet-600 transition-colors mb-12 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back to Knowledge Base
        </Link>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-red-50 rounded-[32px] border border-red-100 shadow-sm">
            <h3 className="text-2xl font-bold mb-3 text-red-600">Error Loading Post</h3>
            <div className="text-red-500 max-w-lg mx-auto text-[16px]">
                <ReactMarkdown
                    components={{
                        a: ({node, ...props}) => <a {...props} className="text-red-600 font-bold underline hover:text-red-800" target="_blank" rel="noopener noreferrer" />
                    }}
                >
                    {error}
                </ReactMarkdown>
            </div>
          </div>
        ) : !post ? (
          <div className="text-center py-24 bg-white rounded-[32px] border border-gray-100 shadow-sm">
            <h3 className="text-[22px] font-bold text-gray-900 mb-3">Post not found</h3>
            <p className="text-gray-500 text-[16px]">The article you're looking for doesn't exist.</p>
          </div>
        ) : (
          <article className="animate-in fade-in slide-in-from-bottom-8 duration-700 bg-white p-8 md:p-12 rounded-[40px] border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
            <div className="mb-10 text-center">
              <h1 className="text-4xl md:text-[54px] font-black tracking-tight mb-8 leading-[1.1] text-gray-900 max-w-[800px] mx-auto">
                {post.title}
              </h1>
              <div className="flex items-center justify-center gap-8 text-[14px] font-bold text-gray-400 uppercase tracking-wider">
                <span className="flex items-center gap-2"><Calendar className="w-5 h-5 text-violet-500" /> {new Date(post.date).toLocaleDateString()}</span>
                <span className="flex items-center gap-2"><User className="w-5 h-5 text-fuchsia-500" /> {post.author}</span>
              </div>
            </div>

            {post.imageUrl && (
              <div className="mb-14 rounded-[28px] overflow-hidden border border-gray-100 shadow-lg">
                <img 
                  src={post.imageUrl} 
                  alt={post.title} 
                  className="w-full h-[400px] md:h-[500px] object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="prose prose-lg md:prose-xl max-w-none 
              prose-headings:font-bold prose-headings:text-gray-900
              prose-p:text-gray-700 prose-p:leading-relaxed
              prose-strong:text-gray-900 prose-strong:font-bold
              prose-a:text-violet-600 hover:prose-a:text-fuchsia-500 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-[24px] prose-img:shadow-md
              prose-code:text-violet-700 prose-code:bg-violet-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-[#1A0B2E] prose-pre:text-purple-100
              prose-blockquote:border-l-4 prose-blockquote:border-violet-500 prose-blockquote:bg-violet-50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:text-gray-700 prose-blockquote:font-medium prose-blockquote:not-italic">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
          </article>
        )}
      </main>
    </div>
  );
};

export default BlogPost;
