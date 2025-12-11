import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getPendingActionCount } from '../services/offlineQueue';
import { useEffect, useState } from 'react';

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updatePendingCount = () => {
      setPendingCount(getPendingActionCount());
    };
    updatePendingCount();
    // Reduce polling frequency from 2s to 5s for better performance
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory Scanner</h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <span className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-[200px] sm:max-w-none">{user?.email}</span>
              <button
                onClick={() => signOut()}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-md hover:bg-gray-100 transition min-h-[44px]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Status Banner */}
        <div className={`mb-6 sm:mb-8 p-3 sm:p-4 rounded-lg border-2 ${online ? 'bg-green-50 border-green-200 text-green-900' : 'bg-yellow-50 border-yellow-200 text-yellow-900'}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${online ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span className="font-semibold text-sm sm:text-base">
                Status: {online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              {!online && (
                <span className="text-yellow-800">
                  Changes will sync when you're back online
                </span>
              )}
              {pendingCount > 0 && (
                <span className="font-semibold bg-white px-3 py-1.5 rounded-md">
                  {pendingCount} pending action{pendingCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Primary Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Link
            to="/scan-shelf"
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-8 sm:py-10 px-4 sm:px-6 rounded-xl text-center text-lg sm:text-xl shadow-lg hover:shadow-xl transition-all duration-200 min-h-[120px] sm:min-h-[140px] flex flex-col items-center justify-center"
          >
            <div className="text-3xl sm:text-4xl mb-2">📷</div>
            <span>Scan Shelf</span>
          </Link>
          <Link
            to="/search-item"
            className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-8 sm:py-10 px-4 sm:px-6 rounded-xl text-center text-lg sm:text-xl shadow-lg hover:shadow-xl transition-all duration-200 min-h-[120px] sm:min-h-[140px] flex flex-col items-center justify-center"
          >
            <div className="text-3xl sm:text-4xl mb-2">🔍</div>
            <span>Search Item</span>
          </Link>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Link
            to="/shelves"
            className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 font-semibold py-4 sm:py-5 px-4 sm:px-6 rounded-xl text-center shadow-sm hover:shadow-md transition-all duration-200 text-gray-900 min-h-[60px] flex items-center justify-center text-sm sm:text-base"
          >
            View All Shelves
          </Link>
          <Link
            to="/reports"
            className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 font-semibold py-4 sm:py-5 px-4 sm:px-6 rounded-xl text-center shadow-sm hover:shadow-md transition-all duration-200 text-gray-900 min-h-[60px] flex items-center justify-center text-sm sm:text-base"
          >
            Reports & Export
          </Link>
          <Link
            to="/barcode-generator"
            className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 font-semibold py-4 sm:py-5 px-4 sm:px-6 rounded-xl text-center shadow-sm hover:shadow-md transition-all duration-200 text-gray-900 min-h-[60px] flex items-center justify-center text-sm sm:text-base sm:col-span-2 lg:col-span-1"
          >
            QR Code Generator
          </Link>
        </div>
      </div>
    </div>
  );
};

