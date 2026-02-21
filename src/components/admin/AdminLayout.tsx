import { useEffect } from "react";
import { useNavigate, Link, useLocation, Outlet } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, Grid3X3, Settings, LogOut, Menu, Users, Tag, ShoppingCart, Truck, CreditCard, Image, Layers, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Hero Slides", icon: Image, href: "/admin/hero-slides" },
  { label: "Orders", icon: ShoppingBag, href: "/admin/orders", badge: "pending" },
  { label: "Abandoned Carts", icon: ShoppingCart, href: "/admin/abandoned-carts", badge: "abandoned" },
  { label: "Products", icon: Grid3X3, href: "/admin/products" },
  { label: "Categories", icon: Layers, href: "/admin/categories" },
  { label: "Customers", icon: Users, href: "/admin/customers" },
  { label: "Coupons", icon: Tag, href: "/admin/coupons" },
  { label: "Courier", icon: Truck, href: "/admin/courier", badge: "courier" },
  { label: "Payments", icon: CreditCard, href: "/admin/payments" },
  { label: "Footer", icon: LinkIcon, href: "/admin/footer" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

const SidebarContent = ({
  pendingCount,
  abandonedCount,
  courierTodayCount,
  onClose,
}: {
  pendingCount: number;
  abandonedCount: number;
  courierTodayCount: number;
  onClose?: () => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("brown_admin_auth");
    navigate("/admin");
  };

  const getBadgeCount = (badge?: string) => {
    if (badge === "pending") return pendingCount;
    if (badge === "abandoned") return abandonedCount;
    if (badge === "courier") return courierTodayCount;
    return 0;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-900 uppercase tracking-widest">Brown House Admin</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const count = getBadgeCount(item.badge);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && count > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem("brown_admin_auth");
    if (!auth) navigate("/admin");
  }, [navigate]);

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["admin-pending-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  const { data: abandonedCount = 0 } = useQuery({
    queryKey: ["admin-abandoned-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("abandoned_carts")
        .select("*", { count: "exact", head: true })
        .eq("converted", false)
        .eq("recovery_sent", false)
        .not("customer_phone", "is", null);
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  const { data: courierTodayCount = 0 } = useQuery({
    queryKey: ["admin-courier-today"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("courier_bookings")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-200 flex-shrink-0">
        <SidebarContent pendingCount={pendingCount} abandonedCount={abandonedCount} courierTodayCount={courierTodayCount} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-56 p-0 bg-white">
          <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
          <SidebarContent pendingCount={pendingCount} abandonedCount={abandonedCount} courierTodayCount={courierTodayCount} onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <p className="text-sm font-semibold text-gray-900 lg:hidden uppercase tracking-widest">Brown House Admin</p>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
