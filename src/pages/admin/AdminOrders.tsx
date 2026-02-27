import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { formatDistanceToNow, format, startOfMonth, subMonths } from "date-fns";
import { Search, Eye, Printer, Trash2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
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
import { toast } from "sonner";
import InvoicePrint from "@/components/admin/InvoicePrint";
import { cn } from "@/lib/utils";
import CreateOrderPanel from "@/components/admin/CreateOrderPanel";
import OrderDetailModal from "@/components/admin/OrderDetailModal";
import { Plus } from "lucide-react";

const PAGE_SIZE = 20;

const STATUS_LIST = ["pending", "processing", "confirmed", "completed", "cancelled", "refunded"] as const;
type OrderStatus = (typeof STATUS_LIST)[number];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  processing: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  confirmed: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
  completed: "bg-green-100 text-green-800 hover:bg-green-200",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-200",
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
}

type DateFilter = "all" | "this_month" | "last_month" | "custom";

const AdminOrders = () => {
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
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["admin-out-of-stock"] });
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
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-overview"] });
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

  return (
    <div>
      {printOrder && <InvoicePrint order={printOrder} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">Orders</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title="Refresh data"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
              queryClient.invalidateQueries({ queryKey: ["admin-order-counts"] });
            }}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={() => setShowCreatePanel(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Order
          </Button>
        </div>
      </div>

      <CreateOrderPanel open={showCreatePanel} onClose={() => setShowCreatePanel(false)} />

      <OrderDetailModal
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />

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
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={selectedIds.size === 0 || bulkMutation.isPending}
            onClick={() => {
              bulkMutation.mutate({ ids: Array.from(selectedIds), action: bulkAction });
            }}
          >
            Apply
          </Button>
        </div>

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
              <TableHead className="text-xs font-medium">Payment</TableHead>
              <TableHead className="text-xs font-medium">Source</TableHead>
              <TableHead className="text-xs font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No orders found</TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setSelectedOrderId(order.id)}
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
                    {(() => {
                      const ps = order.payment_status || "unpaid";
                      if (ps === "paid") return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Paid</span>;
                      if (ps === "partial") return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Partial ৳{formatPrice(order.total - ((order as any).advance_amount || 0))} due</span>;
                      return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Unpaid ৳{formatPrice(order.total)} due</span>;
                    })()}
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", SOURCE_COLORS[order.source ?? "Website"] || "bg-muted text-muted-foreground")}>
                      {order.source ?? "Website"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedOrderId(order.id)}>
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
