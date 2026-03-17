import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5A5A40]"></div>
      <p className="text-[#5A5A40] text-lg font-medium">{message}</p>
    </div>
  );
}
