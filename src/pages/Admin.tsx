import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, onSnapshot, query, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { User } from 'firebase/auth';
import { PlusCircle, Database, LayoutDashboard, Package, ShoppingCart, FileText, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Clock, Truck, CheckCircle, Upload, Pencil, X, XCircle } from 'lucide-react';

interface AdminProps {
  user: User | null;
}

const DEMO_PRODUCTS = [
  {
    name: "Chocolate Truffle Cake",
    description: "Rich, dense, and incredibly moist chocolate cake layered with silky chocolate truffle frosting.",
    price: 35.00,
    category: "cakes",
    imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Strawberry Shortcake",
    description: "Light and fluffy vanilla sponge cake layered with fresh strawberries and whipped cream.",
    price: 28.50,
    category: "cakes",
    imageUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Red Velvet Cupcakes (Half Dozen)",
    description: "Classic red velvet cupcakes topped with our signature cream cheese frosting.",
    price: 18.00,
    category: "cakes",
    imageUrl: "https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Lemon Blueberry Cheesecake",
    description: "Creamy New York style cheesecake swirled with wild blueberry compote and a hint of lemon.",
    price: 42.00,
    category: "cakes",
    imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Vintage Denim Jacket",
    description: "Classic blue denim jacket with a relaxed fit. Perfect for any casual outing.",
    price: 55.00,
    category: "clothes",
    imageUrl: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Cotton Basic T-Shirt",
    description: "100% organic cotton t-shirt. Breathable, comfortable, and sustainably made.",
    price: 22.00,
    category: "clothes",
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Classic White Sneakers",
    description: "Minimalist white leather sneakers. Comfortable for all-day wear and matches any outfit.",
    price: 85.00,
    category: "clothes",
    imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Ceramic Coffee Mug",
    description: "Handcrafted ceramic mug with a beautiful speckled glaze finish. Holds 12oz.",
    price: 14.50,
    category: "household",
    imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Scented Soy Candle",
    description: "Hand-poured soy wax candle with notes of vanilla, sandalwood, and lavender. 40-hour burn time.",
    price: 24.00,
    category: "household",
    imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Woven Throw Blanket",
    description: "Cozy and soft woven throw blanket with fringe details. Perfect for chilly evenings.",
    price: 45.00,
    category: "household",
    imageUrl: "https://images.unsplash.com/photo-1585058178804-9b221081643c?auto=format&fit=crop&q=80&w=800"
  }
];

export default function Admin({ user }: AdminProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('cakes');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('cakes');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Sorting and Pagination State
  const [sortField, setSortField] = useState<'name' | 'category' | 'price'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      const prods: any[] = [];
      snapshot.forEach((doc) => {
        prods.push({ id: doc.id, ...doc.data() });
      });
      setProducts(prods);
    }, (error) => {
      console.error("Error fetching products:", error);
    });

    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ords: any[] = [];
      snapshot.forEach((doc) => {
        ords.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ords);
    }, (error) => {
      console.error("Error fetching orders:", error);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, []);

  const loadDemoData = async () => {
    if (!user) return;
    if (!window.confirm("This will add several demo products to your store. Continue?")) return;
    
    setDemoLoading(true);
    try {
      for (const product of DEMO_PRODUCTS) {
        await addDoc(collection(db, 'products'), {
          ...product,
          createdAt: serverTimestamp()
        });
      }
      alert('Demo products added successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!imageFile) {
      alert('Please select an image for the product.');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload image to Firebase Storage
      const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
      const snapshot = await uploadBytes(storageRef, imageFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // 2. Save product to Firestore
      await addDoc(collection(db, 'products'), {
        name,
        description,
        price: parseFloat(price),
        category,
        imageUrl: downloadUrl,
        createdAt: serverTimestamp()
      });
      
      setName('');
      setDescription('');
      setPrice('');
      setCategory('cakes');
      setImageFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('product-image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      alert('Product added successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleEditClick = (product: any) => {
    setEditingProductId(product.id);
    setEditName(product.name);
    setEditDescription(product.description);
    setEditPrice(product.price.toString());
    setEditCategory(product.category);
    setEditImageUrl(product.imageUrl);
    setEditImageFile(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingProductId) return;

    setEditLoading(true);
    try {
      let finalImageUrl = editImageUrl;

      if (editImageFile) {
        const storageRef = ref(storage, `products/${Date.now()}_${editImageFile.name}`);
        const snapshot = await uploadBytes(storageRef, editImageFile);
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }

      const productRef = doc(db, 'products', editingProductId);
      await updateDoc(productRef, {
        name: editName,
        description: editDescription,
        price: parseFloat(editPrice),
        category: editCategory,
        imageUrl: finalImageUrl
      });

      setIsEditModalOpen(false);
      setEditingProductId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${editingProductId}`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleSort = (field: 'name' | 'category' | 'price') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedProducts = [...products].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / itemsPerPage));
  const paginatedProducts = sortedProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Ensure current page is valid when products are deleted
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#1a1a1a]">Overview</h2>
        <button
          onClick={loadDemoData}
          disabled={demoLoading}
          className="flex items-center gap-2 bg-white border border-[#e5e5e5] text-gray-600 px-4 py-2 rounded-full hover:bg-[#f5f5f0] transition-colors disabled:opacity-50"
        >
          <Database className="h-4 w-4" />
          {demoLoading ? 'Loading...' : 'Load Demo Data'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e5e5e5]">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#f5f5f0] rounded-full text-[#5A5A40]">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Products</p>
              <p className="text-3xl font-bold text-[#1a1a1a]">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e5e5e5]">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#f5f5f0] rounded-full text-[#5A5A40]">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Orders</p>
              <p className="text-3xl font-bold text-[#1a1a1a]">{orders.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e5e5e5]">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#f5f5f0] rounded-full text-[#5A5A40]">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Pages</p>
              <p className="text-3xl font-bold text-[#1a1a1a]">3</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#e5e5e5]">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6 flex items-center gap-2">
          <PlusCircle className="h-6 w-6 text-[#5A5A40]" />
          Add New Product
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
              placeholder="e.g., Chocolate Truffle Cake"
              maxLength={100}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all h-32 resize-none"
              placeholder="Describe the product..."
              maxLength={2000}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="cakes">Cakes</option>
                <option value="clothes">Clothes</option>
                <option value="household">Household</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[#e5e5e5] border-dashed rounded-xl hover:border-[#5A5A40] transition-colors bg-white">
              <div className="space-y-1 text-center">
                {imageFile ? (
                  <div className="flex flex-col items-center">
                    <div className="text-sm text-gray-600 mb-2 font-medium">Selected: {imageFile.name}</div>
                    <button 
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        const fileInput = document.getElementById('product-image') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label
                        htmlFor="product-image"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-[#5A5A40] hover:text-[#4a4a35] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#5A5A40]"
                      >
                        <span>Upload a file</span>
                        <input
                          id="product-image"
                          name="product-image"
                          type="file"
                          accept="image/*"
                          required
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setImageFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-bold hover:bg-[#4a4a35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding Product...' : 'Add Product'}
          </button>
        </form>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#e5e5e5]">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6 flex items-center gap-2">
          <Package className="h-6 w-6 text-[#5A5A40]" />
          Manage Products
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e5e5e5] text-gray-500 text-sm">
                <th className="pb-4 font-medium cursor-pointer hover:text-[#1a1a1a] transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    Product
                    {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </div>
                </th>
                <th className="pb-4 font-medium cursor-pointer hover:text-[#1a1a1a] transition-colors" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">
                    Category
                    {sortField === 'category' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </div>
                </th>
                <th className="pb-4 font-medium cursor-pointer hover:text-[#1a1a1a] transition-colors" onClick={() => handleSort('price')}>
                  <div className="flex items-center gap-1">
                    Price
                    {sortField === 'price' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </div>
                </th>
                <th className="pb-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5]">
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-[#f5f5f0] transition-colors">
                  <td className="py-4 flex items-center gap-4">
                    <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <span className="font-medium text-[#1a1a1a]">{product.name}</span>
                  </td>
                  <td className="py-4 text-gray-600 capitalize">{product.category}</td>
                  <td className="py-4 text-gray-600">${product.price.toFixed(2)}</td>
                  <td className="py-4 text-right">
                    <button 
                      onClick={() => handleEditClick(product)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors inline-flex mr-2"
                      title="Edit Product"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors inline-flex"
                      title="Delete Product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No products found. Add some above or load demo data!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-[#e5e5e5] pt-4">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, products.length)} of {products.length} products
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-[#e5e5e5] text-gray-600 hover:bg-[#f5f5f0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-[#5A5A40] text-white'
                        : 'text-gray-600 hover:bg-[#f5f5f0]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-[#e5e5e5] text-gray-600 hover:bg-[#f5f5f0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#e5e5e5] flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-2xl font-bold text-[#1a1a1a]">Edit Product</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdateProduct} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                    maxLength={100}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    required
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all h-32 resize-none"
                    maxLength={2000}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="cakes">Cakes</option>
                      <option value="clothes">Clothes</option>
                      <option value="household">Household</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[#e5e5e5] border-dashed rounded-xl hover:border-[#5A5A40] transition-colors bg-white">
                    <div className="space-y-1 text-center">
                      {editImageFile ? (
                        <div className="flex flex-col items-center">
                          <div className="text-sm text-gray-600 mb-2 font-medium">New Image: {editImageFile.name}</div>
                          <button 
                            type="button"
                            onClick={() => {
                              setEditImageFile(null);
                              const fileInput = document.getElementById('edit-product-image') as HTMLInputElement;
                              if (fileInput) fileInput.value = '';
                            }}
                            className="text-red-500 text-sm hover:underline"
                          >
                            Remove New Image
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <img src={editImageUrl} alt="Current" className="h-20 w-20 object-cover rounded-lg mb-4" referrerPolicy="no-referrer" />
                          <div className="flex text-sm text-gray-600 justify-center">
                            <label
                              htmlFor="edit-product-image"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-[#5A5A40] hover:text-[#4a4a35] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#5A5A40]"
                            >
                              <span>Upload new image</span>
                              <input
                                id="edit-product-image"
                                name="edit-product-image"
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setEditImageFile(e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Leave empty to keep current image</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 bg-white border border-[#e5e5e5] text-gray-700 py-4 rounded-full font-bold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 bg-[#5A5A40] text-white py-4 rounded-full font-bold hover:bg-[#4a4a35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const handleUpdateOrderStatus = async (order: any, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, { status: newStatus });
      
      // Send email notification
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: order.userEmail,
            subject: `Order Status Update: ${newStatus}`,
            html: `
              <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
                <h2 style="color: #5A5A40;">Order Status Update</h2>
                <p>Hi ${order.userName},</p>
                <p>The status of your order (<strong>#${order.id}</strong>) has been updated to: <strong style="color: #5A5A40;">${newStatus}</strong>.</p>
                <p>Thank you for shopping with Sweet & More!</p>
              </div>
            `
          })
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // We don't want to block the UI if email fails, just log it
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Shipped': return <Truck className="h-4 w-4 text-blue-500" />;
      case 'Delivered': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderOrders = () => (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#e5e5e5]">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6 flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-[#5A5A40]" />
          Manage Orders
        </h2>
        
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No orders found.
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="border border-[#e5e5e5] rounded-2xl overflow-hidden">
                <div className="bg-[#f5f5f0] p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e5e5e5]">
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-mono font-medium text-[#1a1a1a]">{order.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium text-[#1a1a1a]">{order.userName}</p>
                    <p className="text-xs text-gray-500">{order.userEmail}</p>
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Status:</span>
                    <div className="relative">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order, e.target.value)}
                        className="appearance-none bg-white border border-[#e5e5e5] rounded-full py-1.5 pl-8 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40] cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        {getStatusIcon(order.status)}
                      </div>
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Order Items</h4>
                  <ul className="space-y-3">
                    {order.items.map((item: any, index: number) => (
                      <li key={index} className="flex items-center gap-3 text-sm">
                        <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                        <div className="flex-1">
                          <p className="font-medium text-[#1a1a1a]">{item.name}</p>
                          <p className="text-gray-500">Qty: {item.quantity}</p>
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
      </div>
    </div>
  );

  const renderPlaceholder = (title: string, description: string) => (
    <div className="bg-white p-12 rounded-3xl shadow-sm border border-[#e5e5e5] text-center space-y-4">
      <h2 className="text-2xl font-bold text-[#1a1a1a]">{title}</h2>
      <p className="text-gray-600">{description}</p>
      <div className="inline-block px-4 py-2 bg-[#f5f5f0] text-[#5A5A40] rounded-full text-sm font-medium">
        Coming Soon
      </div>
    </div>
  );

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'content', label: 'Content Management', icon: FileText },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <nav className="bg-white p-4 rounded-3xl shadow-sm border border-[#e5e5e5] space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                  isActive 
                    ? 'bg-[#5A5A40] text-white font-medium' 
                    : 'text-gray-600 hover:bg-[#f5f5f0]'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'content' && renderPlaceholder('Content Management', 'Edit homepage banners, update about us information, and manage blog posts.')}
      </main>
    </div>
  );
}
