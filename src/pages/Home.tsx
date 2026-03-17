import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, onSnapshot, query, addDoc, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User } from 'firebase/auth';
import { ShoppingBag, Heart } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion } from 'motion/react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
}

interface HomeProps {
  user: User | null;
}

export default function Home({ user }: HomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search')?.toLowerCase() || '';

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((doc) => {
        prods.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    let unsubscribeWishlist = () => {};
    if (user) {
      const wq = query(collection(db, `users/${user.uid}/wishlist`));
      unsubscribeWishlist = onSnapshot(wq, (snapshot) => {
        const wList: string[] = [];
        snapshot.forEach((doc) => {
          wList.push(doc.id);
        });
        setWishlist(wList);
      });
    } else {
      setWishlist([]);
    }

    return () => {
      unsubscribeProducts();
      unsubscribeWishlist();
    };
  }, [user]);

  const toggleWishlist = async (product: Product) => {
    if (!user) {
      alert("Please sign in to add items to your wishlist.");
      return;
    }

    try {
      const wishlistRef = doc(db, `users/${user.uid}/wishlist`, product.id);
      if (wishlist.includes(product.id)) {
        await deleteDoc(wishlistRef);
      } else {
        await setDoc(wishlistRef, {
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category,
          description: product.description
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/wishlist`);
    }
  };

  const addToCart = async (product: Product) => {
    if (!user) {
      alert("Please sign in to add items to your cart.");
      return;
    }

    try {
      const cartRef = doc(db, `users/${user.uid}/cart`, product.id);
      const cartSnap = await getDoc(cartRef);

      if (cartSnap.exists()) {
        await setDoc(cartRef, {
          ...cartSnap.data(),
          quantity: cartSnap.data().quantity + 1
        });
      } else {
        await setDoc(cartRef, {
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          quantity: 1
        });
      }
      alert(`${product.name} added to cart!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/cart`);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = filter === 'all' || p.category === filter;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner message="Loading delicious treats..." />;
  }

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <h1 className="text-5xl font-bold text-[#1a1a1a] font-serif">Sweet & More</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover our artisanal cakes, fresh bakes, and curated household items.
        </p>
      </motion.div>

      <div className="flex justify-center gap-4 py-4">
        {['all', 'cakes', 'clothes', 'household'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-6 py-2 rounded-full capitalize transition-colors ${
              filter === cat 
                ? 'bg-[#5A5A40] text-white' 
                : 'bg-white text-gray-600 hover:bg-[#e5e5e5]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {searchQuery && (
        <div className="text-center text-gray-600 mb-4">
          Showing results for "{searchQuery}"
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No products found matching your criteria. Check back soon!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product, index) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#e5e5e5] relative flex flex-col group"
            >
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  toggleWishlist(product);
                }}
                className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm hover:bg-red-50 text-red-500 transition-colors z-10 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 duration-300"
                title={wishlist.includes(product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <Heart className={`h-5 w-5 ${wishlist.includes(product.id) ? 'fill-current' : ''}`} />
              </button>
              <Link to={`/product/${product.id}`} className="flex-1 flex flex-col">
                <div className="overflow-hidden">
                  <motion.img 
                    src={product.imageUrl} 
                    alt={product.name}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.6 }}
                    className="w-full h-64 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-6 space-y-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-[#1a1a1a] group-hover:text-[#5A5A40] transition-colors">{product.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{product.category}</p>
                    </div>
                    <span className="text-xl font-bold text-[#5A5A40]">${product.price.toFixed(2)}</span>
                  </div>
                  <p className="text-gray-600 line-clamp-2 flex-1">{product.description}</p>
                </div>
              </Link>
              <div className="p-6 pt-0">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    addToCart(product);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#5A5A40] text-white px-4 py-3 rounded-full hover:bg-[#4a4a35] transition-all transform active:scale-95"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Add to Cart
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
