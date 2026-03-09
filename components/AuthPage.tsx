
import React, { useState } from 'react';
import { ArrowRight, Lock, Mail, Loader2, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { Logo } from './Logo';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN LOGIC
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        
        // Check Firestore Profile
        try {
            const userDocRef = doc(db, "users", uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.status === 'banned') {
                    await auth.signOut();
                    throw new Error("Access Denied: Your account has been suspended.");
                }
                // Update Last Login
                await setDoc(userDocRef, { lastLogin: Date.now() }, { merge: true });
            } else {
                // Create profile for legacy user if missing
                await setDoc(userDocRef, {
                    uid: uid,
                    email: userCredential.user.email,
                    displayName: userCredential.user.displayName || 'User',
                    role: 'user',
                    status: 'active',
                    createdAt: Date.now(),
                    lastLogin: Date.now()
                });
            }
        } catch (e: any) {
            // If firestore fails (e.g. permission error), we might still want to let them in 
            // OR fail if security is strict. For now, if banned check fails, we throw.
            if (e.message.includes("Access Denied")) throw e;
            console.warn("Firestore profile check failed:", e);
        }

      } else {
        // SIGN UP LOGIC
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (name) {
            await updateProfile(user, { displayName: name });
        }

        // Create User Profile in Firestore
        // Default role is 'user'. 
        // TIP: To make yourself admin, edit this field in Firebase Console after signing up.
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: name || 'User',
            role: 'user', 
            status: 'active',
            createdAt: Date.now(),
            lastLogin: Date.now()
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      let msg = "An error occurred.";
      if (err.code === 'auth/invalid-credential') msg = "Invalid email or password.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
      if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
      if (err.message) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-bg-main text-text-main overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-900/10 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md p-6 relative z-10">
        <div className="text-center mb-8">
            <div 
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-accent-red to-red-700 rounded-xl shadow-[0_0_30px_rgba(255,0,51,0.4)] mb-4 cursor-pointer hover:scale-110 transition-transform group"
            >
               <Logo className="text-white w-6 h-6" />
            </div>
            <h1 
                onClick={() => navigate('/')}
                className="text-3xl font-bold tracking-tight mb-2 text-text-main cursor-pointer hover:text-white transition-colors"
            >
                {isLogin ? 'Welcome Back' : 'Join Elite'}
            </h1>
            <p className="text-text-muted text-sm">
                {isLogin ? 'Enter your credentials to access the workspace.' : 'Create an account to start automating.'}
            </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
            {error && (
                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-xs font-bold animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Full Name</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-panel border border-border rounded-xl px-4 py-3 pl-10 text-sm text-text-main focus:outline-none focus:border-accent-blue transition-colors"
                                placeholder="John Doe"
                                required={!isLogin}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                <UserPlus className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-panel border border-border rounded-xl px-4 py-3 pl-10 text-sm text-text-main focus:outline-none focus:border-accent-blue transition-colors"
                            placeholder="name@example.com"
                            required
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                            <Mail className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Password</label>
                    <div className="relative">
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-panel border border-border rounded-xl px-4 py-3 pl-10 text-sm text-text-main focus:outline-none focus:border-accent-blue transition-colors"
                            placeholder="••••••••"
                            required
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                            <Lock className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent-blue hover:bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            {isLogin ? 'Sign In' : 'Create Account'}
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                <button 
                    onClick={() => navigate('/')}
                    className="text-xs text-text-muted hover:text-text-main transition-colors font-medium"
                >
                    &larr; Back to Home
                </button>
                <button 
                    onClick={() => { setIsLogin(!isLogin); setError(null); }}
                    className="text-xs text-accent-blue hover:text-blue-400 transition-colors font-bold"
                >
                    {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
