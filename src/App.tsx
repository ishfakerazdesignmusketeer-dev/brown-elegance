import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import CartDrawer from "@/components/cart/CartDrawer";
import CartReminder from "@/components/cart/CartReminder";
import ScrollToTop from "@/components/ScrollToTop";
import { useDynamicFavicon } from "@/hooks/use-dynamic-favicon";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import AdminLayout from "./components/admin/AdminLayout";
import AdminRoute from "./components/admin/AdminRoute";

const NotFound = lazy(() => import("./pages/NotFound"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const Collections = lazy(() => import("./pages/Collections"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAbandonedCarts = lazy(() => import("./pages/admin/AdminAbandonedCarts"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminHeroSlides = lazy(() => import("./pages/admin/AdminHeroSlides"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminFooter = lazy(() => import("./pages/admin/AdminFooter"));
const AdminReels = lazy(() => import("./pages/admin/AdminReels"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const DynamicFavicon = () => {
  useDynamicFavicon();
  return null;
};

const AdminFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="w-full max-w-4xl px-6 space-y-6">
      <div className="h-8 w-48 skeleton-shimmer rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 skeleton-shimmer rounded" />
        ))}
      </div>
      <div className="h-64 skeleton-shimmer rounded" />
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <DynamicFavicon />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <CartDrawer />
            <CartReminder />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/product/:slug" element={<Suspense fallback={<AdminFallback />}><ProductDetail /></Suspense>} />
              <Route path="/checkout" element={<Suspense fallback={<AdminFallback />}><Checkout /></Suspense>} />
              <Route path="/order-confirmation/:orderId" element={<Suspense fallback={<AdminFallback />}><OrderConfirmation /></Suspense>} />
              <Route path="/collections" element={<Suspense fallback={<AdminFallback />}><Collections /></Suspense>} />
              <Route path="/collections/:slug" element={<Suspense fallback={<AdminFallback />}><Collections /></Suspense>} />
              <Route path="/my-orders" element={<Suspense fallback={<AdminFallback />}><MyOrders /></Suspense>} />
              <Route path="/my-profile" element={<Suspense fallback={<AdminFallback />}><MyProfile /></Suspense>} />
              <Route path="/reset-password" element={<Suspense fallback={<AdminFallback />}><ResetPassword /></Suspense>} />

              {/* Admin routes */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin" element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                <Route path="dashboard" element={<Suspense fallback={<AdminFallback />}><AdminDashboard /></Suspense>} />
                <Route path="orders" element={<Suspense fallback={<AdminFallback />}><AdminOrders /></Suspense>} />
                <Route path="orders/:id" element={<Suspense fallback={<AdminFallback />}><AdminOrderDetail /></Suspense>} />
                <Route path="products" element={<Suspense fallback={<AdminFallback />}><AdminProducts /></Suspense>} />
                <Route path="customers" element={<Suspense fallback={<AdminFallback />}><AdminCustomers /></Suspense>} />
                <Route path="coupons" element={<Suspense fallback={<AdminFallback />}><AdminCoupons /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<AdminFallback />}><AdminSettings /></Suspense>} />
                <Route path="abandoned-carts" element={<Suspense fallback={<AdminFallback />}><AdminAbandonedCarts /></Suspense>} />
                <Route path="payments" element={<Suspense fallback={<AdminFallback />}><AdminPayments /></Suspense>} />
                <Route path="hero-slides" element={<Suspense fallback={<AdminFallback />}><AdminHeroSlides /></Suspense>} />
                <Route path="categories" element={<Suspense fallback={<AdminFallback />}><AdminCategories /></Suspense>} />
                <Route path="footer" element={<Suspense fallback={<AdminFallback />}><AdminFooter /></Suspense>} />
                <Route path="reels" element={<Suspense fallback={<AdminFallback />}><AdminReels /></Suspense>} />
                </Route>
              </Route>

              <Route path="*" element={<Suspense fallback={<AdminFallback />}><NotFound /></Suspense>} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
