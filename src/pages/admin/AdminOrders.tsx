import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { formatDistanceToNow, format, startOfMonth, subMonths } from "date-fns";
import { Search, Eye, Printer, Trash2, ChevronLeft, ChevronRight, Loader2, Check, AlertTriangle, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import InvoicePrint from "@/components/admin/InvoicePrint";
import { cn } from "@/lib/utils";
import CreateOrderPanel from "@/components/admin/CreateOrderPanel";
import PathaoLocationModal from "@/components/admin/PathaoLocationModal";
import { Plus } from "lucide-react";

const PAGE_SIZE = 20;

const STATUS_LIST = ["pending", "processing", "confirmed", "sent_to_courier", "picked_up", "in_transit", "completed", "delivered", "cancelled", "returned", "refunded"] as const;
type OrderStatus = (typeof STATUS_LIST)[number];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  processing: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  confirmed: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
  sent_to_courier: "bg-sky-100 text-sky-800 hover:bg-sky-200",
  picked_up: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
  in_transit: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  completed: "bg-green-100 text-green-800 hover:bg-green-200",
  delivered: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-200",
  returned: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  refunded: "bg-purple-100 text-purple-800 hover:bg-purple-200",
};

const SOURCE_COLORS: Record<string, string> = {
  Website: "bg-gray-100 text-gray-700",
  Messenger: "bg-blue-50 text-blue-700",
  Instagram: "bg-pink-50 text-pink-700",
  Phone: "bg-green-50 text-green-700",
  "Walk-in": "bg-amber-50 text-amber-700",
};

interface OrderItem {
  id: string;
  product_name: string;
  product_id: string | null;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  notes: string | null;
  delivery_note: string | null;
  coupon_code: string | null;
  discount_amount: number | null;
  status: string;
  subtotal: number;
  delivery_charge: number;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  source: string | null;
  created_at: string;
  order_items: OrderItem[];
  pathao_consignment_id: string | null;
  pathao_status: string | null;
  pathao_sent_at: string | null;
  recipient_city_id: number | null;
  recipient_zone_id: number | null;
  recipient_area_id: number | null;
  item_weight: number | null;
  amount_to_collect: number | null;
}

type DateFilter = "all" | "this_month" | "last_month" | "custom";

const AdminOrders = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("processing");
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [inlineStatusOpen, setInlineStatusOpen] = useState<string | null>(null);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [pathaoModalOrder, setPathaoModalOrder] = useState<Order | null>(null);
  const [sendingPathao, setSendingPathao] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bulkPathaoModal, setBulkPathaoModal] = useState(false);
  const [bulkPathaoProgress, setBulkPathaoProgress] = useState({ current: 0, total: 0, sending: false });

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, dateFilter, customFrom, customTo]);

  // Status counts
  const { data: counts = {} } = useQuery({
    queryKey: ["admin-order-counts"],
    queryFn: async () => {
      const result: Record<string, number> = {};
      const { count: allCount } = await supabase.from("orders").select("*", { count: "exact", head: true });
      result.all = allCount ?? 0;
      for (const s of STATUS_LIST) {
        const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", s);
        result[s] = count ?? 0;
      }
      return result;
    },
    refetchInterval: 30000,
  });

  // Orders list
  const { data: ordersResult, isLoading } = useQuery({
    queryKey: ["admin-orders-list", statusFilter, debouncedSearch, page, dateFilter, customFrom?.toISOString(), customTo?.toISOString()],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("orders")
        .select("*, order_items(*)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      if (debouncedSearch) {
        query = query.or(
          `order_number.ilike.%${debouncedSearch}%,customer_name.ilike.%${debouncedSearch}%,customer_phone.ilike.%${debouncedSearch}%`
        );
      }

      const now = new Date();
      if (dateFilter === "this_month") {
        query = query.gte("created_at", startOfMonth(now).toISOString());
      } else if (dateFilter === "last_month") {
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        query = query.gte("created_at", lastMonthStart.toISOString()).lt("created_at", startOfMonth(now).toISOString());
      } else if (dateFilter === "custom") {
        if (customFrom) query = query.gte("created_at", customFrom.toISOString());
        if (customTo) {
          const endOfDay = new Date(customTo);
          endOfDay.setHours(23, 59, 59, 999);
          query = query.lte("created_at", endOfDay.toISOString());
        }
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return { orders: (data ?? []) as Order[], total: count ?? 0 };
    },
    refetchInterval: 30000,
  });

  const orders = ordersResult?.orders ?? [];
  const totalCount = ordersResult?.total ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Auto-poll Pathao statuses on load
  useEffect(() => {
    if (!orders.length) return;
    const toTrack = orders.filter(
      (o) => o.pathao_consignment_id && !["completed", "delivered", "returned", "cancelled"].includes(o.pathao_status || "")
    );
    if (!toTrack.length) return;

    let cancelled = false;
    const poll = async () => {
      setIsSyncing(true);
      for (const order of toTrack) {
        if (cancelled) break;
        try {
          await supabase.functions.invoke("pathao-track-order", {
            body: { order_id: order.id, consignment_id: order.pathao_consignment_id },
          });
        } catch {}
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!cancelled) {
        setIsSyncing(false);
        queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [orders.length]); // only run once when orders load

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      await supabase.from("order_notes").insert({
        order_id: id, note: `Status changed to ${status}`, created_by: "admin",
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-counts"] });
      toast.success("Status updated");
      setInlineStatusOpen(null);
    },
    onError: (err: any) => toast.error("Failed: " + err.message),
  });

  // Bulk mutation
  const bulkMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: string }) => {
      if (action === "delete") {
        const { error } = await supabase.from("orders").delete().in("id", ids);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("orders").update({ status: action }).in("id", ids);
        if (error) throw error;
        const notes = ids.map((id) => ({ order_id: id, note: `Status changed to ${action}`, created_by: "admin" }));
        await supabase.from("order_notes").insert(notes as any);
      }
    },
    onSuccess: (_, { ids, action }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-counts"] });
      setSelectedIds(new Set());
      toast.success(action === "delete" ? `${ids.length} orders deleted` : `${ids.length} orders → ${action}`);
    },
    onError: (err: any) => toast.error("Bulk action failed: " + err.message),
  });

  // Delete single
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-counts"] });
      toast.success("Order deleted");
    },
    onError: (err: any) => toast.error("Delete failed: " + err.message),
  });

  // Send to Pathao (direct, when location data exists)
  const handleSendToPathao = async (order: Order) => {
    if (!order.recipient_city_id || !order.recipient_zone_id) {
      setPathaoModalOrder(order);
      return;
    }
    setSendingPathao(order.id);
    try {
      const { data, error } = await supabase.functions.invoke("pathao-create-order", {
        body: { order_id: order.id },
      });
      if (error || data?.error) throw new Error(data?.error || "Failed");
      toast.success(`Order sent to Pathao ✓ Consignment: ${data.consignment_id}`);
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-counts"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingPathao(null);
    }
  };

  // Bulk send to Pathao
  const handleBulkPathao = async () => {
    const selected = orders.filter((o) => selectedIds.has(o.id));
    const eligible = selected.filter(
      (o) => ["confirmed", "processing"].includes(o.status) && !o.pathao_consignment_id && o.recipient_city_id
    );
    const skipped = selected.length - eligible.length;

    if (!eligible.length) {
      toast.error("No eligible orders to send");
      setBulkPathaoModal(false);
      return;
    }

    setBulkPathaoProgress({ current: 0, total: eligible.length, sending: true });
    setBulkPathaoModal(false);
    let sent = 0, failed = 0;

    for (let i = 0; i < eligible.length; i++) {
      setBulkPathaoProgress({ current: i + 1, total: eligible.length, sending: true });
      try {
        const { data, error } = await supabase.functions.invoke("pathao-create-order", {
          body: { order_id: eligible[i].id },
        });
        if (error || data?.error) throw new Error(data?.error || "Failed");
        sent++;
      } catch { failed++; }
      await new Promise((r) => setTimeout(r, 500));
    }

    setBulkPathaoProgress({ current: 0, total: 0, sending: false });
    queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
    queryClient.invalidateQueries({ queryKey: ["admin-order-counts"] });
    setSelectedIds(new Set());
    toast.success(`✓ ${sent} orders sent to Pathao${failed ? ` · ⚠ ${failed} failed` : ""}${skipped ? ` · ${skipped} skipped` : ""}`);
  };

  const handlePrint = (order: Order) => {
    setPrintOrder(order);
    setTimeout(() => window.print(), 100);
  };

  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(orders.map((o) => o.id)));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const tabs = [
    { key: "all", label: "All" },
    ...STATUS_LIST.map((s) => ({
      key: s,
      label: s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    })),
  ];

  const renderCourierCell = (order: Order) => {
    if (order.pathao_consignment_id) {
      return (
        <div className="space-y-0.5">
          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
            <Check className="w-3 h-3 mr-0.5" /> Sent
          </Badge>
          <button
            onClick={() => { navigator.clipboard.writeText(order.pathao_consignment_id!); toast.success("Copied"); }}
            className="block text-[10px] text-muted-foreground font-mono hover:text-foreground truncate max-w-[120px]"
            title={order.pathao_consignment_id}
          >
            {order.pathao_consignment_id}
          </button>
        </div>
      );
    }
    if (!["confirmed", "processing"].includes(order.status)) {
      return <span className="text-[10px] text-muted-foreground">Confirm first</span>;
    }
    if (sendingPathao === order.id) {
      return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    }
    return (
      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleSendToPathao(order)}>
        <Truck className="w-3 h-3" /> Send
      </Button>
    );
  };

  return (
    <div>
      {printOrder && <InvoicePrint order={printOrder} />}
      {pathaoModalOrder && (
        <PathaoLocationModal
          open={!!pathaoModalOrder}
          onClose={() => setPathaoModalOrder(null)}
          order={pathaoModalOrder}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
            queryClient.invalidateQueries({ queryKey: ["admin-order-counts"] });
          }}
        />
      )}

      {/* Syncing indicator */}
      {isSyncing && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-2 mb-4 flex items-center gap-2 text-sm text-sky-700">
          <Loader2 className="w-4 h-4 animate-spin" /> Syncing courier status...
        </div>
      )}

      {/* Bulk Pathao progress */}
      {bulkPathaoProgress.sending && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending {bulkPathaoProgress.current} of {bulkPathaoProgress.total}...
          </div>
          <Progress value={(bulkPathaoProgress.current / bulkPathaoProgress.total) * 100} className="h-2" />
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">Orders</h1>
        <Button size="sm" onClick={() => setShowCreatePanel(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Order
        </Button>
      </div>

      <CreateOrderPanel open={showCreatePanel} onClose={() => setShowCreatePanel(false)} />

      {/* Status Tabs */}
      <div className="flex flex-wrap border-b border-border mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
              statusFilter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.label} ({counts[tab.key] ?? 0})
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="processing">→ Processing</SelectItem>
              <SelectItem value="confirmed">→ Confirmed</SelectItem>
              <SelectItem value="completed">→ Completed</SelectItem>
              <SelectItem value="cancelled">→ Cancelled</SelectItem>
              <SelectItem value="delete">Delete permanently</SelectItem>
              <SelectItem value="send_pathao">Send to Pathao</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={selectedIds.size === 0 || bulkMutation.isPending || bulkPathaoProgress.sending}
            onClick={() => {
              if (bulkAction === "send_pathao") {
                setBulkPathaoModal(true);
              } else {
                bulkMutation.mutate({ ids: Array.from(selectedIds), action: bulkAction });
              }
            }}
          >
            Apply
          </Button>
        </div>

        {/* Bulk Pathao confirmation */}
        <AlertDialog open={bulkPathaoModal} onOpenChange={setBulkPathaoModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send orders to Pathao?</AlertDialogTitle>
              <AlertDialogDescription>
                {(() => {
                  const selected = orders.filter((o) => selectedIds.has(o.id));
                  const eligible = selected.filter(
                    (o) => ["confirmed", "processing"].includes(o.status) && !o.pathao_consignment_id && o.recipient_city_id
                  );
                  const skipped = selected.length - eligible.length;
                  return `${eligible.length} orders will be sent. ${skipped > 0 ? `${skipped} will be skipped (missing location data or already sent).` : ""}`;
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkPathao}>Send</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Date filter */}
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
            <SelectItem value="last_month">Last month</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>

        {dateFilter === "custom" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  {customFrom ? format(customFrom, "MMM d") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">–</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  {customTo ? format(customTo, "MMM d") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order #, name, or phone..."
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-2">
        {totalCount} items — Page {page} of {totalPages || 1}
      </div>

      {/* Table */}
      <div className="bg-background border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>
              <TableHead className="text-xs font-medium">Order</TableHead>
              <TableHead className="text-xs font-medium">Date</TableHead>
              <TableHead className="text-xs font-medium">Status</TableHead>
              <TableHead className="text-xs font-medium hidden md:table-cell min-w-[200px]">Products</TableHead>
              <TableHead className="text-xs font-medium">Total</TableHead>
              <TableHead className="text-xs font-medium">Source</TableHead>
              <TableHead className="text-xs font-medium">Courier</TableHead>
              <TableHead className="text-xs font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No orders found</TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                      className="text-primary hover:underline text-sm font-medium text-left"
                    >
                      #{order.order_number}
                      <span className="block text-xs text-muted-foreground font-normal">{order.customer_name}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground cursor-default">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{format(new Date(order.created_at), "PPpp")}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Popover open={inlineStatusOpen === order.id} onOpenChange={(open) => setInlineStatusOpen(open ? order.id : null)}>
                      <PopoverTrigger asChild>
                        <button>
                          <Badge className={cn("text-[11px] cursor-pointer capitalize", STATUS_COLORS[order.status] || "bg-muted text-muted-foreground")}>
                            {order.status?.replace(/_/g, " ")}
                          </Badge>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-1" align="start">
                        {STATUS_LIST.map((s) => (
                          <button
                            key={s}
                            onClick={() => statusMutation.mutate({ id: order.id, status: s })}
                            className={cn(
                              "w-full text-left text-xs px-3 py-1.5 rounded capitalize hover:bg-muted transition-colors",
                              order.status === s && "font-semibold"
                            )}
                          >
                            {s.replace(/_/g, " ")}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-0.5">
                      {order.order_items?.slice(0, 2).map((item) => (
                        <div key={item.id} className="text-sm flex items-center gap-1 flex-wrap">
                          <span className="text-foreground">{item.product_name}</span>
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">{item.size}</span>
                          <span className="text-xs text-accent-foreground font-medium">×{item.quantity}</span>
                        </div>
                      ))}
                      {(order.order_items?.length ?? 0) > 2 && (
                        <div className="text-xs text-muted-foreground italic">+{order.order_items!.length - 2} more</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{formatPrice(order.total)}</TableCell>
                  <TableCell>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", SOURCE_COLORS[order.source ?? "Website"] || "bg-muted text-muted-foreground")}>
                      {order.source ?? "Website"}
                    </span>
                  </TableCell>
                  <TableCell>{renderCourierCell(order)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrint(order)}>
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Print</TooltipContent>
                      </Tooltip>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete order #{order.order_number}?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(order.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Page</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (v >= 1 && v <= totalPages) setPage(v);
              }}
              className="h-8 w-14 text-center text-xs"
            />
            <span>of {totalPages}</span>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
