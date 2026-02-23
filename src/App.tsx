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
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Collections from "./pages/Collections";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import MyOrders from "./pages/MyOrders";
import MyProfile from "./pages/MyProfile";
import ResetPassword from "./pages/ResetPassword";

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAbandonedCarts = lazy(() => import("./pages/admin/AdminAbandonedCarts"));
const AdminCourier = lazy(() => import("./pages/admin/AdminCourier"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminHeroSlides = lazy(() => import("./pages/admin/AdminHeroSlides"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminFooter = lazy(() => import("./pages/admin/AdminFooter"));
const AdminReels = lazy(() => import("./pages/admin/AdminReels"));

const queryClient = new QueryClient();

const DynamicFavicon = () => {
  useDynamicFavicon();
  return null;
};

const AdminFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
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
              <Route path="/product/:slug" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
              <Route path="/collections" element={<Collections />} />
              <Route path="/collections/:slug" element={<Collections />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/my-profile" element={<MyProfile />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Admin routes */}
              <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="dashboard" element={<Suspense fallback={<AdminFallback />}><AdminDashboard /></Suspense>} />
                <Route path="orders" element={<Suspense fallback={<AdminFallback />}><AdminOrders /></Suspense>} />
                <Route path="products" element={<Suspense fallback={<AdminFallback />}><AdminProducts /></Suspense>} />
                <Route path="customers" element={<Suspense fallback={<AdminFallback />}><AdminCustomers /></Suspense>} />
                <Route path="coupons" element={<Suspense fallback={<AdminFallback />}><AdminCoupons /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<AdminFallback />}><AdminSettings /></Suspense>} />
                <Route path="abandoned-carts" element={<Suspense fallback={<AdminFallback />}><AdminAbandonedCarts /></Suspense>} />
                <Route path="courier" element={<Suspense fallback={<AdminFallback />}><AdminCourier /></Suspense>} />
                <Route path="payments" element={<Suspense fallback={<AdminFallback />}><AdminPayments /></Suspense>} />
                <Route path="hero-slides" element={<Suspense fallback={<AdminFallback />}><AdminHeroSlides /></Suspense>} />
                <Route path="categories" element={<Suspense fallback={<AdminFallback />}><AdminCategories /></Suspense>} />
                <Route path="footer" element={<Suspense fallback={<AdminFallback />}><AdminFooter /></Suspense>} />
                <Route path="reels" element={<Suspense fallback={<AdminFallback />}><AdminReels /></Suspense>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
