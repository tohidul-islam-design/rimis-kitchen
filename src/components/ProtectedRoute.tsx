import React from 'react';
import { Navigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { UserProfile } from '../App';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  user: User | null;
  profile: UserProfile | null;
  requireAdmin?: boolean;
  children: React.ReactNode;
}

export default function ProtectedRoute({ user, profile, requireAdmin = false, children }: ProtectedRouteProps) {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const isAdmin = profile?.role === 'admin' || user.email === 'tohidul.islam2016@gmail.com';

  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="bg-red-50 p-6 rounded-full">
          <ShieldAlert className="h-16 w-16 text-red-500" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-[#1a1a1a]">Access Denied</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            You do not have the required administrator privileges to access this area. 
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
