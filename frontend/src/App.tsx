import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from './store/store';
import { syncFromLocalStorage } from './store/slices/authSlice';
import { fetchCart } from './store/slices/cartSlice';
import { checkAuthentication } from './utils/authHelpers';
import { suppressChromeExtensionErrors } from './utils/errorHandler';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Footer from './components/Footer';
import ChatBot from './components/ChatBot';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CategoriesPage from './pages/CategoriesPage';
import WishlistPage from './pages/WishlistPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import VirtualTryOnPage from './pages/VirtualTryOnPage';
import PaymentDashboard from './pages/PaymentDashboard';
import AdminInventoryPage from './pages/AdminInventoryPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import ComingSoon from './pages/ComingSoon';
import ProtectedRoute from './components/ProtectedRoute';
import ConnectionStatus from './components/ConnectionStatus';
import DevelopmentBanner from './components/DevelopmentBanner';
import CookieConsent from './components/CookieConsent';
import EnvironmentBadge from './components/EnvironmentBadge';
import EnvironmentInfo from './components/EnvironmentInfo';
import VendorDashboardPage from './pages/VendorDashboardPage';
import VendorLoginPage from './pages/VendorLoginPage';
import BecomeVendorPage from './pages/BecomeVendorPage';
import VendorBanner from './components/VendorBanner';
// Temporarily commenting out missing imports
// import ApiDebug from './components/ApiDebug';
// Debug components removed for production
import VendorProductViewPage from './pages/VendorProductViewPage';
import PayPalTest from './components/PayPalTest';
import PaymentTestPage from './pages/PaymentTestPage';
import PaymentMethodsDebug from './components/PaymentMethodsDebug';
import PaymentDebugPage from './pages/PaymentDebugPage';
import PaymentPage from './pages/PaymentPage';
import OrderTrackingPage from './pages/OrderTrackingPage';


// Optional: Use ApiStatusIndicator for enhanced connection feedback
// import ApiStatusIndicator from './components/ApiStatusIndicator';
import './styles/globals.css';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  useEffect(() => {
    // Auth is pre-hydrated in index.tsx to prevent menu flicker; keep as no-op here
    // dispatch(syncFromLocalStorage());
    
    // Initialize error suppression
    suppressChromeExtensionErrors();
    
    // Handle runtime.lastError and other Chrome extension errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && 
          (event.reason.message.includes('runtime.lastError') ||
           event.reason.message.includes('message channel closed') ||
           event.reason.message.includes('Extension context invalidated'))) {
        // Suppress Chrome extension errors
        event.preventDefault();
        return;
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (event.message && 
          (event.message.includes('runtime.lastError') ||
           event.message.includes('message channel closed') ||
           event.message.includes('Extension context invalidated'))) {
        // Suppress Chrome extension errors
        event.preventDefault();
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Fetch cart when user is authenticated
  useEffect(() => {
    const authResult = checkAuthentication(user);
    if (authResult.isAuthenticated) {
      console.log('🛒 App: User authenticated, fetching cart');
      dispatch(fetchCart()).catch((error) => {
        console.error('❌ App: Failed to fetch cart:', error);
      });
    } else {
      console.log('👤 App: User not authenticated, skipping cart fetch');
    }
  }, [dispatch, user]);

  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <ErrorBoundary>
            <DevelopmentBanner />
          </ErrorBoundary>
          <ErrorBoundary>
            <Header />
          </ErrorBoundary>
          <main className="flex-grow">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/quick-coming-soon" element={<ComingSoon />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route
                  path="/vendor/products/:id"
                  element={
                    <ProtectedRoute requiredRole="seller">
                      <VendorProductViewPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/categories/:slug" element={<CategoriesPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/virtual-try-on" element={<VirtualTryOnPage />} />
                <Route path="/virtual-try-on/:productId" element={<VirtualTryOnPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/vendor/login" element={<VendorLoginPage />} />
                <Route path="/become-vendor" element={<BecomeVendorPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route
                  path="/checkout"
                  element={<CheckoutPage />}
                />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <OrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:id"
                  element={
                    <ProtectedRoute>
                      <OrderDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/payments"
                  element={
                    <ProtectedRoute>
                      <PaymentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/inventory"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminInventoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vendor/dashboard"
                  element={
                    <ProtectedRoute requiredRole="seller">
                      <VendorDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/cookie-policy" element={<CookiePolicyPage />} />
                <Route path="/test-paypal" element={<PayPalTest />} />
                <Route path="/test-payments" element={<PaymentTestPage />} />
                <Route path="/debug-payments" element={<PaymentMethodsDebug />} />
                <Route path="/payment-debug" element={<PaymentDebugPage />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/checkout" element={<PaymentPage />} />
                {/* Order Tracking */}
                <Route path="/order-tracking" element={<OrderTrackingPage />} />
                <Route path="/order-tracking/:orderId" element={<OrderTrackingPage />} />
              </Routes>
            </ErrorBoundary>
          </main>
          <ErrorBoundary>
            <Footer />
          </ErrorBoundary>
          <ErrorBoundary>
            <ChatBot />
          </ErrorBoundary>
          <ErrorBoundary>
            <ConnectionStatus />
            {/* Optional: Replace ConnectionStatus with ApiStatusIndicator for enhanced UX */}
            {/* <ApiStatusIndicator /> */}
          </ErrorBoundary>
          <ErrorBoundary>
            <CookieConsent />
          </ErrorBoundary>
          {/* <ApiDebug /> */}
          <ErrorBoundary>
            <EnvironmentBadge />
          </ErrorBoundary>
          <ErrorBoundary>
            <EnvironmentInfo />
          </ErrorBoundary>
          {/* Debug components removed for cleaner UI */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#10b981',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
