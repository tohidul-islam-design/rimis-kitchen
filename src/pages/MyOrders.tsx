import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User } from 'firebase/auth';
import { Package, Clock, CheckCircle, Truck, XCircle, X, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  createdAt: any;
}

interface MyOrdersProps {
  user: User | null;
}

export default function MyOrders({ user }: MyOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders: Order[] = [];
      snapshot.forEach((doc) => {
        fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'Shipped': return <Truck className="h-5 w-5 text-blue-500" />;
      case 'Delivered': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Package className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Shipped': return 'bg-blue-100 text-blue-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;

    setCancelling(true);
    try {
      const orderRef = doc(db, 'orders', orderToCancel);
      await updateDoc(orderRef, { status: 'Cancelled' });
      setOrderToCancel(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderToCancel}`);
    } finally {
      setCancelling(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-3xl font-bold text-[#1a1a1a]">My Orders</h2>
        <p className="text-gray-600">Please sign in to view your orders.</p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading orders..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold text-[#1a1a1a] font-serif flex items-center gap-3">
        <Package className="h-8 w-8 text-[#5A5A40]" />
        My Orders
      </h1>

      {orders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl shadow-sm border border-[#e5e5e5] text-center space-y-4">
          <h2 className="text-2xl font-bold text-[#1a1a1a]">No Orders Yet</h2>
          <p className="text-gray-600">You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-[#e5e5e5] overflow-hidden">
              <div className="p-6 border-b border-[#e5e5e5] bg-[#f5f5f0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order ID</p>
                  <p className="font-mono text-[#1a1a1a]">{order.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium text-[#1a1a1a]">
                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Just now'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="font-bold text-[#1a1a1a]">${order.total.toFixed(2)}</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  {order.status}
                </div>
                {order.status === 'Pending' && (
                  <button
                    onClick={() => setOrderToCancel(order.id)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors text-sm font-medium"
                  >
                    <X className="h-4 w-4" />
                    Cancel Order
                  </button>
                )}
              </div>
              
              <div className="p-6">
                <ul className="divide-y divide-[#e5e5e5]">
                  {order.items.map((item, index) => (
                    <li key={index} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-16 h-16 object-cover rounded-xl"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-[#1a1a1a]">{item.name}</h4>
                        <p className="text-gray-500 text-sm">Qty: {item.quantity}</p>
                      </div>
                      <div className="font-medium text-[#5A5A40]">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-[#1a1a1a] mb-2">Cancel Order?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel order <span className="font-mono font-bold text-[#1a1a1a]">#{orderToCancel}</span>? 
                This action is <span className="text-red-600 font-bold">permanent</span> and cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setOrderToCancel(null)}
                  disabled={cancelling}
                  className="flex-1 px-6 py-3 rounded-full border border-[#e5e5e5] text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  No, Keep Order
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="flex-1 px-6 py-3 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
