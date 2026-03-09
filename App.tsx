
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import InfoPage, { InfoPageType } from './components/InfoPage';
import AuthPage from './components/AuthPage';
import PricingPage from './components/PricingPage';
import AdminPage from './components/AdminPage';
import BlogPage from './components/BlogPage';
import BlogPost from './components/BlogPost';
import NotFound from './components/NotFound';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, AlertTriangle } from 'lucide-react';
import { GlobalSettings } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  useEffect(() => {
    // Check Global Settings for Maintenance Mode
    const checkMaintenance = async () => {
        try {
            const docRef = doc(db, "settings", "global");
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data() as GlobalSettings;
                setMaintenanceMode(data.maintenanceMode || false);
            }
        } catch (e: any) { 
            console.warn("Failed to check maintenance mode"); 
            if (e.message && e.message.includes('Missing or insufficient permissions')) {
                setFirestoreError("Firestore Permission Denied: Please update your Firebase Security Rules to allow read access to the 'settings' collection.");
            }
        }
    };
    checkMaintenance();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
          try {
              // Hardcoded Super Admin for the owner
              if (currentUser.email === 'chemrahsoufiyan@gmail.com') {
                  setIsAdmin(true);
                  setAuthLoading(false);
                  return;
              }

              // Fetch user role from Firestore
              const userDoc = await getDoc(doc(db, "users", currentUser.uid));
              if (userDoc.exists()) {
                  const role = userDoc.data().role;
                  if (role === 'admin' || role === 'super_admin') {
                      setIsAdmin(true);
                  } else {
                      setIsAdmin(false);
                  }
              } else {
                  setIsAdmin(false);
              }
          } catch (e: any) {
              console.error("Error fetching user role", e);
              setIsAdmin(false);
              if (e.message && e.message.includes('Missing or insufficient permissions')) {
                  setFirestoreError("Firestore Permission Denied: Please update your Firebase Security Rules to allow users to read their own profile in the 'users' collection.");
              }
          }
      } else {
          setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
      return (
          <div className="h-screen w-full bg-[#050507] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
          </div>
      );
  }

  if (firestoreError) {
      return (
          <div className="min-h-screen w-full bg-[#050507] flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Database Access Denied</h1>
              <p className="text-red-400 max-w-md mb-6">
                  {firestoreError}
              </p>
              <div className="bg-[#15151a] p-6 rounded-xl border border-white/10 text-left max-w-2xl w-full">
                  <h3 className="text-white font-bold mb-4">Required Firestore Rules:</h3>
                  <p className="text-gray-400 text-sm mb-4">Go to Firebase Console &gt; Firestore Database &gt; Rules, and paste the following:</p>
                  <pre className="text-sm text-gray-300 bg-black/50 p-4 rounded-lg overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Only admins can write to settings, everyone can read
    match /settings/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin');
    }
    // Blog posts are public, only staff can write
    match /blog_posts/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin', 'editor']);
    }
  }
}`}
                  </pre>
              </div>
          </div>
      );
  }

  // Maintenance Mode Check (Admins bypass)
  if (maintenanceMode && !isAdmin) {
      return (
          <div className="h-screen w-full bg-[#050507] flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 border border-yellow-500/20">
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">System Maintenance</h1>
              <p className="text-gray-400 max-w-md">
                  We are currently performing scheduled maintenance to improve our services. 
                  Please check back shortly.
              </p>
          </div>
      );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} isAdmin={isAdmin} onLogout={() => auth.signOut()} /> : <Navigate to="/auth" />} />
        <Route path="/admin" element={user && isAdmin ? <AdminPage user={user} /> : <Navigate to="/dashboard" />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <AuthPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/docs" element={<InfoPage type="docs" />} />
        <Route path="/api" element={<InfoPage type="api" />} />
        <Route path="/support" element={<InfoPage type="support" />} />
        <Route path="/workflow" element={<InfoPage type="workflow" />} />
        <Route path="/privacy" element={<InfoPage type="privacy" />} />
        <Route path="/terms" element={<InfoPage type="terms" />} />
        <Route path="/contact" element={<InfoPage type="contact" />} />
        <Route path="/about" element={<InfoPage type="about" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
