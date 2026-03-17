import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User } from 'firebase/auth';
import { ArrowLeft, Star, ShoppingBag, Heart } from 'lucide-react';
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

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: any;
}

interface ProductDetailProps {
  user: User | null;
}

export default function ProductDetail({ user }: ProductDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  
  // Review Form State
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        } else {
          navigate('/');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `products/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();

    // Listen to reviews
    const q = query(collection(db, `products/${id}/reviews`), orderBy('createdAt', 'desc'));
    const unsubscribeReviews = onSnapshot(q, (snapshot) => {
      const revs: Review[] = [];
      snapshot.forEach((doc) => {
        revs.push({ id: doc.id, ...doc.data() } as Review);
      });
      setReviews(revs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `products/${id}/reviews`);
    });

    // Listen to wishlist status
    let unsubscribeWishlist = () => {};
    if (user) {
      const wishlistRef = doc(db, `users/${user.uid}/wishlist`, id);
      unsubscribeWishlist = onSnapshot(wishlistRef, (docSnap) => {
        setInWishlist(docSnap.exists());
      });
    }

    return () => {
      unsubscribeReviews();
      unsubscribeWishlist();
    };
  }, [id, user, navigate]);

  const handleAddToCart = async () => {
    if (!user) {
      alert("Please sign in to add items to your cart.");
      return;
    }
    if (!product) return;

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

  const handleToggleWishlist = async () => {
    if (!user) {
      alert("Please sign in to add items to your wishlist.");
      return;
    }
    if (!product) return;

    try {
      const wishlistRef = doc(db, `users/${user.uid}/wishlist`, product.id);
      if (inWishlist) {
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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in to leave a review.");
      return;
    }
    if (!id || !reviewText.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, `products/${id}/reviews`), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        rating,
        text: reviewText.trim(),
        createdAt: serverTimestamp()
      });
      setReviewText('');
      setRating(5);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `products/${id}/reviews`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading product details..." />;
  }

  if (!product) {
    return <div className="text-center py-20 text-xl text-gray-500">Product not found.</div>;
  }

  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length 
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto space-y-12"
    >
      <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1a1a1a] transition-colors">
        <ArrowLeft className="h-5 w-5" />
        Back to Shop
      </Link>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e5e5e5] flex flex-col md:flex-row"
      >
        <div className="md:w-1/2 overflow-hidden">
          <motion.img 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8 }}
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover min-h-[400px]"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{product.category}</p>
            <h1 className="text-4xl font-bold text-[#1a1a1a] font-serif">{product.name}</h1>
            <div className="flex items-center gap-2 text-yellow-500">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-5 w-5 ${star <= averageRating ? 'fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-gray-600 text-sm font-medium">({reviews.length} reviews)</span>
            </div>
          </div>
          
          <p className="text-3xl font-bold text-[#5A5A40]">${product.price.toFixed(2)}</p>
          
          <p className="text-gray-600 leading-relaxed text-lg">{product.description}</p>
          
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-2 bg-[#5A5A40] text-white px-6 py-4 rounded-full font-bold hover:bg-[#4a4a35] transition-all transform active:scale-95"
            >
              <ShoppingBag className="h-5 w-5" />
              Add to Cart
            </button>
            <button
              onClick={handleToggleWishlist}
              className={`p-4 rounded-full border-2 transition-all flex items-center justify-center transform active:scale-90 ${
                inWishlist 
                  ? 'border-red-500 text-red-500 bg-red-50' 
                  : 'border-[#e5e5e5] text-gray-400 hover:border-red-500 hover:text-red-500'
              }`}
              title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
            >
              <Heart className={`h-6 w-6 ${inWishlist ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="bg-white rounded-3xl shadow-sm border border-[#e5e5e5] p-8 md:p-12"
      >
        <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif mb-8">Customer Reviews</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            {reviews.length === 0 ? (
              <p className="text-gray-500 italic">No reviews yet. Be the first to review this product!</p>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-[#e5e5e5] pb-6 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-[#1a1a1a]">{review.userName}</p>
                        <p className="text-xs text-gray-500">
                          {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Just now'}
                        </p>
                      </div>
                      <div className="flex text-yellow-500">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`h-4 w-4 ${star <= review.rating ? 'fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 mt-2">{review.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-[#f5f5f0] p-6 rounded-2xl">
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-4">Write a Review</h3>
              {user ? (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="focus:outline-none"
                        >
                          <Star className={`h-6 w-6 ${star <= rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Review</label>
                    <textarea
                      required
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all resize-none h-32"
                      placeholder="What did you think about this product?"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#5A5A40] text-white py-3 rounded-full font-bold hover:bg-[#4a4a35] transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <p className="text-gray-600">Please sign in to leave a review.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
