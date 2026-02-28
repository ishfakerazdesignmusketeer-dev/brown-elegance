import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format, subDays, startOfDay, differenceInHours } from "date-fns";
import { formatPrice } from "@/lib/format";
import { ChevronDown, ChevronUp, MessageCircle, Copy, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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

type FilterTab = "all" | "has_phone" | "no_phone" | "sent" | "converted" | "expired";

const StatusBadge = ({ cart }: { cart: AbandonedCart }) => {
  if (cart.converted) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Converted</span>;
  if (differenceInHours(new Date(), new Date(cart.updated_at)) > 48 && !cart.recovery_sent)
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Expired</span>;
  if (cart.recovery_sent) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Sent</span>;
  if (cart.customer_phone) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Active</span>;
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">No Phone</span>;
};

const AdminAbandonedCarts = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [storeUrl, setStoreUrl] = useState("https://brownbd.com");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[] | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.from("admin_settings").select("value").eq("key", "store_url").single().then(({ data }) => {
      if (data?.value) setStoreUrl(data.value);
    });
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('abandoned-carts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'abandoned_carts' }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-abandoned-carts"] });
        queryClient.invalidateQueries({ queryKey: ["admin-abandoned-count"] });
        queryClient.invalidateQueries({ queryKey: ["admin-abandoned-stats"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

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

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("abandoned_carts").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["admin-abandoned-carts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-abandoned-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-abandoned-stats"] });
      setSelectedIds(new Set());
      setDeleteConfirmIds(null);
      toast.success(`${ids.length} cart${ids.length > 1 ? "s" : ""} deleted`);
    },
    onError: () => toast.error("Failed to delete"),
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "has_phone", label: "Active" },
    { key: "expired", label: "Expired" },
    { key: "sent", label: "Recovery Sent" },
    { key: "converted", label: "Converted" },
    { key: "no_phone", label: "No Phone" },
  ];

  const isExpired = (cart: AbandonedCart) => differenceInHours(new Date(), new Date(cart.updated_at)) > 48 && !cart.converted && !cart.recovery_sent;

  const filtered = carts.filter((c) => {
    if (activeTab === "has_phone") return !!c.customer_phone && !c.converted && !isExpired(c);
    if (activeTab === "no_phone") return !c.customer_phone;
    if (activeTab === "sent") return c.recovery_sent && !c.converted;
    if (activeTab === "converted") return c.converted;
    if (activeTab === "expired") return isExpired(c);
    return true;
  });

  const totalAbandoned = carts.filter((c) => !c.converted).length;
  const abandonedRevenue = carts.filter((c) => !c.converted).reduce((s, c) => s + c.subtotal, 0);
  const converted = carts.filter((c) => c.converted).length;
  const recoveryRate = carts.length > 0 ? Math.round((converted / carts.length) * 100) : 0;
  const avgCartValue = totalAbandoned > 0 ? Math.round(abandonedRevenue / totalAbandoned) : 0;

  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = startOfDay(date).toDateString();
    const abandoned = carts.filter((c) => !c.converted && startOfDay(new Date(c.created_at)).toDateString() === dateStr).length;
    const recovered = carts.filter((c) => c.converted && startOfDay(new Date(c.updated_at)).toDateString() === dateStr).length;
    return { date: format(date, "MMM d"), abandoned, recovered };
  });

  const buildRecoveryMessage = (cart: AbandonedCart): string => {
    const name = cart.customer_name || "ভাই";
    const itemsList = cart.items.map((i) => `• ${i.name} | Size: ${i.size} | ${formatPrice(i.unit_price)}`).join("\n");
    return `আসসালামু আলাইকুম ${name} ভাই,\n\nআপনি Brown House-এ কিছু পণ্য কার্টে রেখেছিলেন কিন্তু অর্ডার সম্পন্ন করেননি।\n\nআপনার কার্টে আছে:\n${itemsList}\n\nমোট: ৳${cart.subtotal}\n\nঅর্ডার করতে এখানে যান:\n${storeUrl}/checkout\n\nযেকোনো প্রশ্নে আমাদের মেসেজ করুন! 🙏`;
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

  const copyMessage = (cart: AbandonedCart) => {
    const msg = buildRecoveryMessage(cart);
    navigator.clipboard.writeText(msg);
    setCopiedId(cart.id);
    toast.success("Message copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const toggleAll = () => {
    if (allFilteredSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((c) => c.id)));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Abandoned Carts</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Total Abandoned</p>
          <p className="text-2xl font-semibold text-gray-900">{totalAbandoned}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Abandoned Revenue</p>
          <p className="text-2xl font-semibold text-gray-900">{formatPrice(abandonedRevenue)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Recovery Rate</p>
          <p className="text-2xl font-semibold text-green-600">{recoveryRate}%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Avg Cart Value</p>
          <p className="text-2xl font-semibold text-gray-900">{formatPrice(avgCartValue)}</p>
        </div>
      </div>

      {/* Recovery Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Recovery Trend — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="abandoned" stroke="#F59E0B" strokeWidth={2} dot={false} name="Abandoned" />
            <Line type="monotone" dataKey="recovered" stroke="#10B981" strokeWidth={2} dot={false} name="Recovered" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === tab.key ? "bg-[#2C1810] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-xs font-medium text-gray-700">{selectedIds.size} selected</span>
          <button
            onClick={() => setDeleteConfirmIds(Array.from(selectedIds))}
            className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
          >
            Delete Selected
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-4 py-3">
                  <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} />
                </th>
                <th className="w-6 px-2 py-3"></th>
                {["Time", "Customer", "Phone", "Items", "Value", "Status", "Action", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={10} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400">No abandoned carts found</td></tr>
              ) : (
                filtered.map((cart) => (
                  <>
                    <tr
                      key={cart.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(cart.id)} onCheckedChange={() => toggleSelect(cart.id)} />
                      </td>
                      <td className="px-2 py-3 cursor-pointer" onClick={() => setExpandedId(expandedId === cart.id ? null : cart.id)}>
                        {expandedId === cart.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap cursor-pointer" onClick={() => setExpandedId(expandedId === cart.id ? null : cart.id)}>
                        {formatDistanceToNow(new Date(cart.updated_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{cart.customer_name || <span className="text-gray-400 italic">Anonymous</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{cart.customer_phone || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {cart.items.length} item{cart.items.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{formatPrice(cart.subtotal)}</td>
                      <td className="px-4 py-3"><StatusBadge cart={cart} /></td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {cart.converted ? (
                          <a href="/admin/orders" className="text-xs text-blue-600 hover:underline">View Order →</a>
                        ) : cart.customer_phone ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyMessage(cart)}
                              className="text-xs px-2 py-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                              title="Copy message"
                            >
                              {copiedId === cart.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => sendRecovery(cart)}
                              className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                                cart.recovery_sent
                                  ? "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                                  : "bg-green-600 text-white hover:bg-green-700"
                              }`}
                            >
                              <MessageCircle className="w-3 h-3 inline mr-1" />
                              {cart.recovery_sent ? "Resend" : "WhatsApp"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">No phone</span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setDeleteConfirmIds([cart.id])}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete cart"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {expandedId === cart.id && (
                      <tr key={`${cart.id}-expanded`} className="bg-gray-50/80">
                        <td colSpan={10} className="px-8 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            </div>

                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recovery Message Preview</p>
                              <textarea
                                readOnly
                                value={cart.customer_phone ? buildRecoveryMessage(cart) : "No phone number captured."}
                                rows={10}
                                className="w-full text-xs border border-gray-200 rounded px-3 py-2 text-gray-600 resize-none bg-gray-50 font-mono"
                              />
                              {cart.customer_phone && !cart.converted && (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => copyMessage(cart)}
                                    className="flex items-center gap-1.5 text-xs px-4 py-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
                                  >
                                    {copiedId === cart.id ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Message</>}
                                  </button>
                                  <button
                                    onClick={() => sendRecovery(cart)}
                                    className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded font-medium transition-colors ${
                                      cart.recovery_sent
                                        ? "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                                        : "bg-green-600 text-white hover:bg-green-700"
                                    }`}
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    {cart.recovery_sent ? "Resend" : "Open WhatsApp"}
                                  </button>
                                </div>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmIds} onOpenChange={(open) => !open && setDeleteConfirmIds(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteConfirmIds?.length === 1 ? "this abandoned cart" : `${deleteConfirmIds?.length} abandoned carts`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmIds && deleteMutation.mutate(deleteConfirmIds)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete{deleteConfirmIds && deleteConfirmIds.length > 1 ? ` ${deleteConfirmIds.length} Carts` : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAbandonedCarts;
