import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { formatPrice } from "@/lib/format";
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { CartItem } from "@/contexts/CartContext";

interface AbandonedCart {
  id: string;
  session_id: string;
  customer_phone: string | null;
  customer_name: string | null;
  items: CartItem[];
  subtotal: number;
  recovery_sent: boolean;
  recovery_sent_at: string | null;
  converted: boolean;
  converted_order_id: string | null;
  created_at: string;
  updated_at: string;
}

type FilterTab = "all" | "has_phone" | "no_phone" | "sent" | "converted";

const StatusBadge = ({ cart }: { cart: AbandonedCart }) => {
  if (cart.converted) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Converted</span>;
  if (cart.recovery_sent) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Sent</span>;
  if (cart.customer_phone) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Recoverable</span>;
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">No Phone</span>;
};

const AdminAbandonedCarts = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [storeUrl, setStoreUrl] = useState("https://brownbd.com");
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.from("admin_settings").select("value").eq("key", "store_url").single().then(({ data }) => {
      if (data?.value) setStoreUrl(data.value);
    });
  }, []);

  const { data: carts = [], isLoading } = useQuery({
    queryKey: ["admin-abandoned-carts"],
    queryFn: async (): Promise<AbandonedCart[]> => {
      const { data, error } = await supabase
        .from("abandoned_carts")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        items: (row.items as unknown as CartItem[]) ?? [],
      }));
    },
    refetchInterval: 60000,
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "has_phone", label: "Has Phone" },
    { key: "no_phone", label: "No Phone" },
    { key: "sent", label: "Recovery Sent" },
    { key: "converted", label: "Converted" },
  ];

  const filtered = carts.filter((c) => {
    if (activeTab === "has_phone") return !!c.customer_phone;
    if (activeTab === "no_phone") return !c.customer_phone;
    if (activeTab === "sent") return c.recovery_sent && !c.converted;
    if (activeTab === "converted") return c.converted;
    return true;
  });

  const totalAbandoned = carts.filter((c) => !c.converted).length;
  const recoverySent = carts.filter((c) => c.recovery_sent && !c.converted).length;
  const converted = carts.filter((c) => c.converted).length;
  const recoveryRate = carts.length > 0 ? Math.round((converted / carts.length) * 100) : 0;

  const buildRecoveryMessage = (cart: AbandonedCart): string => {
    const name = cart.customer_name || "there";
    const itemsList = cart.items.map((i) => `${i.name} | Size: ${i.size} | ${formatPrice(i.unit_price)}`).join("\n");
    return `🟤 Hey ${name}!\n\nYou left something behind at BROWN 👀\n\nYour cart:\n${itemsList}\n\nTotal: ${formatPrice(cart.subtotal)}\n\nComplete your order here 👇\n${storeUrl}/checkout\n\nUse code COMEBACK10 for 10% off — valid for 24 hours! 🎁\n\nReply to this message if you need help. — Brown House Team`;
  };

  const sendRecovery = async (cart: AbandonedCart) => {
    if (!cart.customer_phone) return;
    const msg = buildRecoveryMessage(cart);
    const phone = cart.customer_phone.replace(/^0/, "88");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    const { error } = await supabase
      .from("abandoned_carts")
      .update({ recovery_sent: true, recovery_sent_at: new Date().toISOString() })
      .eq("id", cart.id);
    if (error) toast.error("Failed to mark recovery sent");
    else {
      toast.success("Recovery message opened in WhatsApp");
      queryClient.invalidateQueries({ queryKey: ["admin-abandoned-carts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-abandoned-count"] });
    }
  };

  const isOld = (updatedAt: string) => {
    return new Date().getTime() - new Date(updatedAt).getTime() > 2 * 60 * 60 * 1000;
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Abandoned Carts</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Abandoned", value: totalAbandoned },
          { label: "Recovery Sent", value: recoverySent },
          { label: "Converted", value: converted },
          { label: "Recovery Rate", value: `${recoveryRate}%` },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === tab.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-6 px-4 py-3"></th>
                {["Time", "Customer", "Phone", "Items", "Value", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No abandoned carts found</td>
                </tr>
              ) : (
                filtered.map((cart) => (
                  <>
                    <tr
                      key={cart.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === cart.id ? null : cart.id)}
                    >
                      <td className="px-4 py-3">
                        {expandedId === cart.id
                          ? <ChevronUp className="w-4 h-4 text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-400" />
                        }
                      </td>
                      <td className={`px-4 py-3 text-xs whitespace-nowrap ${isOld(cart.updated_at) ? "text-red-500 font-medium" : "text-gray-500"}`}>
                        {formatDistanceToNow(new Date(cart.updated_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{cart.customer_name || <span className="text-gray-400 italic">Anonymous</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{cart.customer_phone || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {cart.items.length} item{cart.items.length !== 1 ? "s" : ""}
                        {cart.items.length > 0 && (
                          <span className="text-gray-400"> — {cart.items.slice(0, 2).map((i) => i.name).join(", ")}{cart.items.length > 2 ? "..." : ""}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{formatPrice(cart.subtotal)}</td>
                      <td className="px-4 py-3"><StatusBadge cart={cart} /></td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {cart.converted ? (
                          <a
                            href={`/admin/orders`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View Order →
                          </a>
                        ) : cart.customer_phone ? (
                          <button
                            onClick={() => sendRecovery(cart)}
                            className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                              cart.recovery_sent
                                ? "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                                : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                          >
                            <MessageCircle className="w-3 h-3 inline mr-1" />
                            {cart.recovery_sent ? "Resend" : "Send Recovery"}
                          </button>
                        ) : (
                          <button disabled className="text-xs px-3 py-1.5 rounded bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed">
                            No phone
                          </button>
                        )}
                      </td>
                    </tr>

                    {expandedId === cart.id && (
                      <tr key={`${cart.id}-expanded`} className="bg-gray-50/80">
                        <td colSpan={8} className="px-8 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Cart Items */}
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cart Items</p>
                              <div className="space-y-2">
                                {cart.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <div>
                                      <span className="text-gray-900 font-medium">{item.name}</span>
                                      <span className="text-gray-400 ml-2 text-xs">{item.size} × {item.quantity}</span>
                                    </div>
                                    <span className="text-gray-700">{formatPrice(item.unit_price * item.quantity)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="border-t border-gray-200 mt-3 pt-2 flex justify-between text-sm font-semibold text-gray-900">
                                <span>Subtotal</span>
                                <span>{formatPrice(cart.subtotal)}</span>
                              </div>
                              {cart.recovery_sent_at && (
                                <p className="text-xs text-gray-400 mt-3">
                                  Recovery sent {formatDistanceToNow(new Date(cart.recovery_sent_at), { addSuffix: true })}
                                </p>
                              )}
                            </div>

                            {/* Recovery Message Preview */}
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recovery Message Preview</p>
                              <textarea
                                readOnly
                                value={cart.customer_phone ? buildRecoveryMessage(cart) : "No phone number captured — cannot send recovery."}
                                rows={10}
                                className="w-full text-xs border border-gray-200 rounded px-3 py-2 text-gray-600 resize-none bg-gray-50 font-mono"
                              />
                              {cart.customer_phone && !cart.converted && (
                                <button
                                  onClick={() => sendRecovery(cart)}
                                  className={`mt-2 flex items-center gap-1.5 text-xs px-4 py-2 rounded font-medium transition-colors ${
                                    cart.recovery_sent
                                      ? "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                                      : "bg-green-600 text-white hover:bg-green-700"
                                  }`}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  {cart.recovery_sent ? "Resend Recovery" : "Send Recovery via WhatsApp"}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAbandonedCarts;
