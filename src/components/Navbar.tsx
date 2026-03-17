import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, LogIn, LogOut, Settings, Cake, ChevronDown, User as UserIcon, Shield, LayoutDashboard, Package, Heart, Search } from 'lucide-react';
import { signInWithGoogle, logout, db, auth } from '../firebase';
import { User } from 'firebase/auth';
import { UserProfile } from '../App';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  user: User | null;
  profile: UserProfile | null;
}

export default function Navbar({ user, profile }: NavbarProps) {
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isLoginMenuOpen, setIsLoginMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsLoginMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) {
      setCartCount(0);
      setWishlistCount(0);
      return;
    }

    const q = query(collection(db, `users/${user.uid}/cart`));
    const unsubscribeCart = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach((doc) => {
        count += doc.data().quantity || 0;
      });
      setCartCount(count);
    }, (error) => {
      console.error("Error fetching cart count", error);
    });

    const wq = query(collection(db, `users/${user.uid}/wishlist`));
    const unsubscribeWishlist = onSnapshot(wq, (snapshot) => {
      setWishlistCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching wishlist count", error);
    });

    return () => {
      unsubscribeCart();
      unsubscribeWishlist();
    };
  }, [user]);

  const handleLogin = async () => {
    setIsLoginMenuOpen(false);
    await signInWithGoogle();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate(`/`);
    }
  };

  const isAdmin = profile?.role === 'admin' || user?.email === 'tohidul.islam2016@gmail.com';

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white shadow-sm border-b border-[#e5e5e5] relative z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center gap-2 group">
              <motion.div whileHover={{ rotate: 15 }}>
                <Cake className="h-8 w-8 text-[#5A5A40]" />
              </motion.div>
              <span className="text-2xl font-bold tracking-tight text-[#5A5A40] hidden lg:block group-hover:text-[#4a4a35] transition-colors">Sweet & More</span>
            </Link>
          </div>

          <div className="flex-1 max-w-md px-2">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 rounded-full border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent bg-[#f5f5f0] text-sm transition-all focus:bg-white"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </form>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
            <Link to="/" className="hidden sm:block text-gray-600 hover:text-[#5A5A40] transition-colors font-medium">Shop</Link>
            
            {user ? (
              <>
                <Link to="/wishlist" className="relative text-gray-600 hover:text-[#5A5A40] transition-colors group" title="Wishlist">
                  <motion.div whileHover={{ scale: 1.2 }}>
                    <Heart className="h-6 w-6" />
                  </motion.div>
                  {wishlistCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-[#5A5A40] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                    >
                      {wishlistCount}
                    </motion.span>
                  )}
                </Link>
                <Link to="/cart" className="relative text-gray-600 hover:text-[#5A5A40] transition-colors group" title="Cart">
                  <motion.div whileHover={{ scale: 1.2 }}>
                    <ShoppingCart className="h-6 w-6" />
                  </motion.div>
                  {cartCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-[#5A5A40] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </Link>
                <Link to="/my-orders" className="text-gray-600 hover:text-[#5A5A40] transition-colors" title="My Orders">
                  <motion.div whileHover={{ scale: 1.2 }}>
                    <Package className="h-6 w-6" />
                  </motion.div>
                </Link>
                <Link to="/profile" className="text-gray-600 hover:text-[#5A5A40] transition-colors" title="My Profile">
                  <motion.div whileHover={{ scale: 1.2 }}>
                    <UserIcon className="h-6 w-6" />
                  </motion.div>
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-1 text-gray-600 hover:text-[#5A5A40] transition-colors font-medium" title="Admin Dashboard">
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                      <LayoutDashboard className="h-5 w-5" />
                    </motion.div>
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 text-gray-600 hover:text-[#5A5A40] transition-colors"
                >
                  <motion.div whileHover={{ x: 3 }}>
                    <LogOut className="h-5 w-5" />
                  </motion.div>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="relative" ref={menuRef}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsLoginMenuOpen(!isLoginMenuOpen)}
                  className="flex items-center gap-2 bg-[#5A5A40] text-white px-4 py-2 rounded-full hover:bg-[#4a4a35] transition-colors shadow-sm"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Sign In</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isLoginMenuOpen ? 'rotate-180' : ''}`} />
                </motion.button>
                
                <AnimatePresence>
                  {isLoginMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#e5e5e5] overflow-hidden py-1 origin-top-right"
                    >
                      <button
                        onClick={handleLogin}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-[#f5f5f0] transition-colors"
                      >
                        <UserIcon className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="font-medium text-sm">Customer Login</div>
                          <div className="text-[10px] text-gray-500">Shop our products</div>
                        </div>
                      </button>
                      <button
                        onClick={handleLogin}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-[#f5f5f0] transition-colors border-t border-[#e5e5e5]"
                      >
                        <Shield className="h-4 w-4 text-[#5A5A40]" />
                        <div>
                          <div className="font-medium text-sm">Admin Login</div>
                          <div className="text-[10px] text-gray-500">Manage your store</div>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
