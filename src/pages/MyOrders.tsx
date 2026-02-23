import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { format } from "date-fns";
import Navigation from "@/components/layout/Navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const MyOrders = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-cream">
      <AnnouncementBar />
      <Navigation />
      <main className="px-6 lg:px-12 py-10 max-w-3xl mx-auto">
        <h1 className="font-heading text-4xl text-foreground mb-8">My Orders</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-heading text-xl text-foreground mb-2">No orders yet</p>
            <p className="font-body text-sm text-muted-foreground mb-6">Start shopping to see your orders here.</p>
            <Button asChild className="bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] px-8 py-5 rounded-none">
              <Link to="/">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <div key={order.id} className="border border-border bg-card p-5">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  <div>
                    <p className="font-heading text-lg text-foreground">{order.order_number}</p>
                    <p className="font-body text-xs text-muted-foreground">
                      {format(new Date(order.created_at), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-body text-xs px-2.5 py-1 rounded-full capitalize ${statusColors[order.status] || "bg-muted text-muted-foreground"}`}>
                      {order.status}
                    </span>
                    <span className="font-heading text-lg text-foreground">{formatPrice(order.total)}</span>
                    {expanded === order.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {expanded === order.id && order.order_items && (
                  <div className="mt-4 pt-4 border-t border-border space-y-2">
                    {order.order_items.map((item: any) => (
                      <div key={item.id} className="flex justify-between font-body text-sm">
                        <span className="text-foreground">
                          {item.product_name} <span className="text-muted-foreground">· {item.size} · ×{item.quantity}</span>
                        </span>
                        <span className="text-foreground">{formatPrice(item.total_price)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-body text-xs text-muted-foreground pt-2">
                      <span>Delivery</span>
                      <span>{formatPrice(order.delivery_charge)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between font-body text-xs text-green-600">
                        <span>Discount</span>
                        <span>-{formatPrice(order.discount_amount)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyOrders;
