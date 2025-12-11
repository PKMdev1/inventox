import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useOnlineStatus } from './hooks/useOnlineStatus';

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ScanShelf = lazy(() => import('./pages/ScanShelf').then(m => ({ default: m.ScanShelf })));
const CheckIn = lazy(() => import('./pages/CheckIn').then(m => ({ default: m.CheckIn })));
const CheckOut = lazy(() => import('./pages/CheckOut').then(m => ({ default: m.CheckOut })));
const SearchItem = lazy(() => import('./pages/SearchItem').then(m => ({ default: m.SearchItem })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const BarcodeGenerator = lazy(() => import('./pages/BarcodeGenerator').then(m => ({ default: m.BarcodeGenerator })));
const Shelves = lazy(() => import('./pages/Shelves').then(m => ({ default: m.Shelves })));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="text-4xl mb-4">⏳</div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

const AppRoutes = () => {
  const { user } = useAuth();
  useOnlineStatus(); // Monitor online status

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan-shelf"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <ScanShelf />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/check-in"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <CheckIn />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/check-out"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <CheckOut />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/search-item"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <SearchItem />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Reports />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/barcode-generator"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <BarcodeGenerator />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/shelves"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Shelves />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster 
          position="top-right" 
          toastOptions={{
            duration: 4000,
            // Prevent duplicate toasts
            id: undefined,
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

