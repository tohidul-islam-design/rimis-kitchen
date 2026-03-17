import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User } from 'firebase/auth';
import { Trash2, ShoppingBag, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  description: string;
}

interface WishlistProps {
  user: User | null;
}

export default function Wishlist({ user }: WishlistProps) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, `users/${user.uid}/wishlist`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const wishlistItems: WishlistItem[] = [];
      snapshot.forEach((doc) => {
        wishlistItems.push({ id: doc.id, ...doc.data() } as WishlistItem);
      });
      setItems(wishlistItems);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/wishlist`);
    });

    return () => unsubscribe();
  }, [user]);

  const removeItem = async (id: string) => {
    if (!user) return;

    try {
      const itemRef = doc(db, `users/${user.uid}/wishlist`, id);
      await deleteDoc(itemRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/wishlist`);
    }
  };

  const addToCart = async (item: WishlistItem) => {
    if (!user) return;

    try {
      const cartRef = doc(db, `users/${user.uid}/cart`, item.productId);
      const cartSnap = await getDoc(cartRef);

      if (cartSnap.exists()) {
        await setDoc(cartRef, {
          ...cartSnap.data(),
          quantity: cartSnap.data().quantity + 1
        });
      } else {
        await setDoc(cartRef, {
          productId: item.productId,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl,
          quantity: 1
        });
      }
      alert(`${item.name} added to cart!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/cart`);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-3xl font-bold text-[#1a1a1a]">Your Wishlist</h2>
        <p className="text-gray-600">Please sign in to view your wishlist.</p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading wishlist..." />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 space-y-4">
        <div className="bg-[#f5f5f0] p-8 rounded-full text-[#5A5A40] mb-4">
          <Heart className="h-16 w-16" strokeWidth={1.5} />
        </div>
        <h2 className="text-3xl font-bold text-[#1a1a1a]">Your Wishlist is Empty</h2>
        <p className="text-gray-600 max-w-md mx-auto pb-4">Save items you love to your wishlist so you can easily find them later when you're ready to buy.</p>
        <Link to="/" className="inline-block bg-[#5A5A40] text-white px-8 py-3 rounded-full hover:bg-[#4a4a35] transition-colors font-medium shadow-sm">
          Explore Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold text-[#1a1a1a] font-serif flex items-center gap-3">
        <Heart className="h-8 w-8 text-[#5A5A40] fill-current" />
        Your Wishlist
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-[#e5e5e5] relative">
            <button 
              onClick={() => removeItem(item.id)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm hover:bg-red-50 text-red-500 transition-colors z-10"
              title="Remove from Wishlist"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <div className="aspect-w-4 aspect-h-3">
              <img 
                src={item.imageUrl} 
                alt={item.name}
                className="w-full h-64 object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-[#1a1a1a]">{item.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{item.category}</p>
                </div>
                <span className="text-xl font-bold text-[#5A5A40]">${item.price.toFixed(2)}</span>
              </div>
              <p className="text-gray-600 line-clamp-2">{item.description}</p>
              <button
                onClick={() => addToCart(item)}
                className="w-full flex items-center justify-center gap-2 bg-[#5A5A40] text-white px-4 py-3 rounded-full hover:bg-[#4a4a35] transition-colors"
              >
                <ShoppingBag className="h-5 w-5" />
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
