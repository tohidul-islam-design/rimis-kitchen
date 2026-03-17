import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User } from 'firebase/auth';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface CartProps {
  user: User | null;
}

export default function Cart({ user }: CartProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, `users/${user.uid}/cart`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cartItems: CartItem[] = [];
      snapshot.forEach((doc) => {
        cartItems.push({ id: doc.id, ...doc.data() } as CartItem);
      });
      setItems(cartItems);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/cart`);
    });

    return () => unsubscribe();
  }, [user]);

  const updateQuantity = async (id: string, newQuantity: number) => {
    if (!user) return;
    if (newQuantity < 1) return;

    try {
      const itemRef = doc(db, `users/${user.uid}/cart`, id);
      await updateDoc(itemRef, { quantity: newQuantity });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/cart`);
    }
  };

  const removeItem = async (id: string) => {
    if (!user) return;

    try {
      const itemRef = doc(db, `users/${user.uid}/cart`, id);
      await deleteDoc(itemRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/cart`);
    }
  };

  const handleCheckout = async () => {
    if (!user || items.length === 0) return;
    setCheckoutLoading(true);

    try {
      // 1. Create the order
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'Anonymous',
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl
        })),
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        status: 'Pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);

      // 2. Clear the cart
      const batch = writeBatch(db);
      items.forEach(item => {
        const itemRef = doc(db, `users/${user.uid}/cart`, item.id);
        batch.delete(itemRef);
      });
      await batch.commit();

      alert('Order placed successfully!');
      navigate('/my-orders');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!user) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-3xl font-bold text-[#1a1a1a]">Your Cart</h2>
        <p className="text-gray-600">Please sign in to view your cart.</p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading cart..." />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 space-y-4">
        <div className="bg-[#f5f5f0] p-8 rounded-full text-[#5A5A40] mb-4">
          <ShoppingCart className="h-16 w-16" strokeWidth={1.5} />
        </div>
        <h2 className="text-3xl font-bold text-[#1a1a1a]">Your Cart is Empty</h2>
        <p className="text-gray-600 max-w-md mx-auto pb-4">Looks like you haven't added anything delicious yet. Browse our collection and find something you love!</p>
        <Link to="/" className="inline-block bg-[#5A5A40] text-white px-8 py-3 rounded-full hover:bg-[#4a4a35] transition-colors font-medium shadow-sm">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold text-[#1a1a1a] font-serif">Your Cart</h1>
      
      <div className="bg-white rounded-3xl shadow-sm border border-[#e5e5e5] overflow-hidden">
        <ul className="divide-y divide-[#e5e5e5]">
          {items.map((item) => (
            <li key={item.id} className="p-6 flex flex-col sm:flex-row items-center gap-6">
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-24 h-24 object-cover rounded-2xl"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-bold text-[#1a1a1a]">{item.name}</h3>
                <p className="text-[#5A5A40] font-medium">${item.price.toFixed(2)} <span className="text-sm text-gray-500 font-normal">each</span></p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-[#e5e5e5] rounded-full overflow-hidden bg-white">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-2 hover:bg-[#f5f5f0] transition-colors text-gray-600"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center font-medium text-[#1a1a1a]">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-2 hover:bg-[#f5f5f0] transition-colors text-gray-600"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="w-20 text-right hidden sm:block">
                  <p className="font-bold text-[#1a1a1a] text-lg">${(item.price * item.quantity).toFixed(2)}</p>
                </div>

                <button 
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        
        <div className="p-6 sm:p-8 bg-[#f5f5f0] border-t border-[#e5e5e5]">
          <div className="max-w-sm ml-auto space-y-4 mb-8">
            <div className="flex justify-between items-center text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-[#1a1a1a]">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-600">
              <span>Shipping</span>
              <span className="font-medium text-[#1a1a1a]">Calculated at checkout</span>
            </div>
            <div className="pt-4 border-t border-[#e5e5e5] flex justify-between items-center">
              <span className="text-xl text-[#1a1a1a] font-bold">Total</span>
              <span className="text-3xl font-bold text-[#1a1a1a]">${total.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full sm:w-auto px-12 bg-[#5A5A40] text-white py-4 rounded-full text-lg font-bold hover:bg-[#4a4a35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {checkoutLoading ? 'Processing...' : 'Proceed to Checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
