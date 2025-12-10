import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useOnlineStatus } from './hooks/useOnlineStatus';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ScanShelf } from './pages/ScanShelf';
import { CheckIn } from './pages/CheckIn';
import { CheckOut } from './pages/CheckOut';
import { SearchItem } from './pages/SearchItem';
import { Reports } from './pages/Reports';
import { BarcodeGenerator } from './pages/BarcodeGenerator';
import { Shelves } from './pages/Shelves';

const AppRoutes = () => {
  const { user } = useAuth();
  useOnlineStatus(); // Monitor online status

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scan-shelf"
        element={
          <ProtectedRoute>
            <ScanShelf />
          </ProtectedRoute>
        }
      />
      <Route
        path="/check-in"
        element={
          <ProtectedRoute>
            <CheckIn />
          </ProtectedRoute>
        }
      />
      <Route
        path="/check-out"
        element={
          <ProtectedRoute>
            <CheckOut />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search-item"
        element={
          <ProtectedRoute>
            <SearchItem />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/barcode-generator"
        element={
          <ProtectedRoute>
            <BarcodeGenerator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shelves"
        element={
          <ProtectedRoute>
            <Shelves />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

