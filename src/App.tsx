import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Admin from './pages/Admin';
import MyOrders from './pages/MyOrders';
import Wishlist from './pages/Wishlist';
import ProductDetail from './pages/ProductDetail';
import Profile from './pages/Profile';
import { motion, AnimatePresence } from 'motion/react';

export interface UserProfile {
  name: string;
  email: string;
  role: 'admin' | 'customer';
  createdAt: any;
}

function AnimatedRoutes({ user, profile }: { user: User | null, profile: UserProfile | null }) {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/cart" element={<Cart user={user} />} />
          <Route path="/product/:id" element={<ProductDetail user={user} />} />
          <Route path="/my-orders" element={<MyOrders user={user} />} />
          <Route path="/wishlist" element={<Wishlist user={user} />} />
          <Route path="/profile" element={<Profile user={user} profile={profile} />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute user={user} profile={profile} requireAdmin={true}>
                <Admin user={user} />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result if user signed in via redirect
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            name: result.user.displayName || 'Anonymous',
            email: result.user.email || '',
            role: 'customer',
            createdAt: serverTimestamp()
          });
        }
      }
    }).catch(console.error);

    let profileUnsubscribe: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          profileUnsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
            } else {
              setProfile(null);
            }
            setLoading(false);
          }, (error) => {
            console.error("Error fetching user profile", error);
            setLoading(false);
          });
        } catch (error) {
          console.error("Error setting up profile listener", error);
          setLoading(false);
        }
      } else {
        setProfile(null);
        if (profileUnsubscribe) {
          profileUnsubscribe();
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <LoadingSpinner message="Starting application..." />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#f5f5f0] font-serif text-[#1a1a1a]">
        <Navbar user={user} profile={profile} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatedRoutes user={user} profile={profile} />
        </main>
      </div>
    </Router>
  );
}
