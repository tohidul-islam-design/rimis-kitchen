import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User } from 'firebase/auth';
import { UserProfile } from '../App';
import { User as UserIcon, Mail, Shield, Calendar, Save } from 'lucide-react';

interface ProfileProps {
  user: User | null;
  profile: UserProfile | null;
}

export default function Profile({ user, profile }: ProfileProps) {
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setSuccess(false);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name,
        email
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="text-center py-20 text-gray-500">
        Please sign in to view your profile.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-[#1a1a1a] font-serif">My Profile</h1>
      
      <div className="bg-white rounded-3xl shadow-sm border border-[#e5e5e5] overflow-hidden">
        <div className="p-8 border-b border-[#e5e5e5] bg-[#f5f5f0] flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-[#5A5A40] text-white flex items-center justify-center text-3xl font-bold">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1a1a1a]">{profile.name}</h2>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <Shield className="h-4 w-4" />
              <span className="capitalize">{profile.role}</span>
            </p>
          </div>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Member Since
              </label>
              <input
                type="text"
                disabled
                value={profile.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            
            <div className="pt-4 flex items-center gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-[#5A5A40] text-white px-8 py-3 rounded-full font-bold hover:bg-[#4a4a35] transition-colors disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              
              {success && (
                <span className="text-green-600 font-medium animate-fade-in">
                  Profile updated successfully!
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
