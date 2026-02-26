import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { pathaoGetValidToken, pathaoGetCities, pathaoGetZones, pathaoGetAreas, pathaoCreateOrder } from "@/lib/pathaoApi";

interface PathaoCity { city_id: number; city_name: string; }
interface PathaoZone { zone_id: number; zone_name: string; }
interface PathaoArea { area_id: number; area_name: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  order: {
    id: string;
    order_number: string;
    total: number;
    item_weight?: number;
    recipient_city_id?: number;
    recipient_zone_id?: number;
    recipient_area_id?: number;
  };
  onSuccess: () => void;
}

const CACHE_KEY = "pathao_cities_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000;

function getCachedCities(): PathaoCity[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { cities, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return cities;
  } catch { return null; }
}

export default function PathaoLocationModal({ open, onClose, order, onSuccess }: Props) {
  const [cities, setCities] = useState<PathaoCity[]>([]);
  const [zones, setZones] = useState<PathaoZone[]>([]);
  const [areas, setAreas] = useState<PathaoArea[]>([]);
  const [cityId, setCityId] = useState<string>(order.recipient_city_id?.toString() || "");
  const [zoneId, setZoneId] = useState<string>(order.recipient_zone_id?.toString() || "");
  const [areaId, setAreaId] = useState<string>(order.recipient_area_id?.toString() || "");
  const [weight, setWeight] = useState(String(order.item_weight || 0.5));
  const [amountToCollect, setAmountToCollect] = useState(String(order.total));
  const [deliveryType, setDeliveryType] = useState("48");
  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  useEffect(() => {
    if (!open) return;
    const cached = getCachedCities();
    if (cached) { setCities(cached); return; }
    setLoadingCities(true);
    (async () => {
      try {
        const token = await pathaoGetValidToken(supabase);
        const cities = await pathaoGetCities(token);
        setCities(cities);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ cities, ts: Date.now() }));
      } catch { toast.error("Failed to load cities"); }
      finally { setLoadingCities(false); }
    })();
  }, [open]);

  useEffect(() => {
    if (!cityId) { setZones([]); setZoneId(""); setAreas([]); setAreaId(""); return; }
    setLoadingZones(true);
    setZones([]); setZoneId(""); setAreas([]); setAreaId("");
    (async () => {
      try {
        const token = await pathaoGetValidToken(supabase);
        const zones = await pathaoGetZones(token, parseInt(cityId));
        setZones(zones);
      } catch { toast.error("Failed to load zones"); }
      finally { setLoadingZones(false); }
    })();
  }, [cityId]);

  useEffect(() => {
    if (!zoneId) { setAreas([]); setAreaId(""); return; }
    setLoadingAreas(true);
    setAreas([]); setAreaId("");
    (async () => {
      try {
        const token = await pathaoGetValidToken(supabase);
        const areas = await pathaoGetAreas(token, parseInt(zoneId));
        setAreas(areas);
      } catch { toast.error("Failed to load areas"); }
      finally { setLoadingAreas(false); }
    })();
  }, [zoneId]);

  const handleSubmit = async () => {
    if (!cityId || !zoneId) { toast.error("City and Zone are required"); return; }
    setLoading(true);
    try {
      // Update order with location data
      const { error: updateErr } = await supabase.from("orders").update({
        recipient_city_id: parseInt(cityId),
        recipient_zone_id: parseInt(zoneId),
        recipient_area_id: areaId ? parseInt(areaId) : null,
        item_weight: parseFloat(weight) || 0.5,
        amount_to_collect: parseFloat(amountToCollect) || order.total,
        delivery_type: parseInt(deliveryType),
      } as any).eq("id", order.id);
      if (updateErr) throw updateErr;

      // Get store settings and send to Pathao
      const token = await pathaoGetValidToken(supabase);
      const { data: storeSettings } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["pathao_store_id", "pathao_sender_phone"]);
      const store: Record<string, string> = {};
      storeSettings?.forEach((r: any) => { store[r.key] = r.value || ""; });

      // Get full order data for payload
      const { data: fullOrder } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", order.id)
        .single();
      if (!fullOrder) throw new Error("Order not found");

      const totalItems = (fullOrder.order_items || []).reduce((sum: number, i: any) => sum + i.quantity, 0);
      const itemDesc = fullOrder.item_description ||
        (fullOrder.order_items || []).map((i: any) => `${i.product_name} (${i.size}) x${i.quantity}`).join(", ");

      const result = await pathaoCreateOrder(token, {
        store_id: parseInt(store.pathao_store_id || "372992"),
        merchant_order_id: fullOrder.order_number || "",
        sender_name: "Brown House",
        sender_phone: store.pathao_sender_phone || "",
        recipient_name: fullOrder.customer_name,
        recipient_phone: fullOrder.customer_phone,
        recipient_address: fullOrder.customer_address,
        recipient_city: parseInt(cityId),
        recipient_zone: parseInt(zoneId),
        recipient_area: areaId ? parseInt(areaId) : 0,
        delivery_type: parseInt(deliveryType),
        item_type: 2,
        special_instruction: fullOrder.notes || "",
        item_quantity: totalItems || 1,
        item_weight: parseFloat(weight) || 0.5,
        amount_to_collect: parseFloat(amountToCollect) || fullOrder.total,
        item_description: itemDesc,
      });

      const consignmentId = result.consignment_id;
      await supabase.from("orders").update({
        pathao_consignment_id: String(consignmentId),
        pathao_status: result.order_status || "Pending",
        pathao_sent_at: new Date().toISOString(),
        status: "sent_to_courier",
      }).eq("id", order.id);

      await supabase.from("order_notes").insert({
        order_id: order.id,
        note: `Sent to Pathao Courier. Consignment: ${consignmentId}`,
        created_by: "system",
      });

      toast.success(`Order sent to Pathao ✓ Consignment: ${consignmentId}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to send to Pathao");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Complete Delivery Details</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Order <span className="font-mono font-medium">#{order.order_number}</span></p>
        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">⚠ Pathao requires city, zone and area to create shipment</p>

        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs font-medium block mb-1">City *</label>
            <Select value={cityId} onValueChange={setCityId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={loadingCities ? "Loading..." : "Select city"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {cities.map((c) => (
                  <SelectItem key={c.city_id} value={String(c.city_id)}>{c.city_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">Zone *</label>
            <Select value={zoneId} onValueChange={setZoneId} disabled={!cityId || loadingZones}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={loadingZones ? "Loading..." : "Select zone"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {zones.map((z) => (
                  <SelectItem key={z.zone_id} value={String(z.zone_id)}>{z.zone_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">Area</label>
            <Select value={areaId} onValueChange={setAreaId} disabled={!zoneId || loadingAreas}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={loadingAreas ? "Loading..." : "Select area"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {areas.map((a) => (
                  <SelectItem key={a.area_id} value={String(a.area_id)}>{a.area_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Weight (kg)</label>
              <Input type="number" step="0.1" min="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Amount to Collect (৳)</label>
              <Input type="number" value={amountToCollect} onChange={(e) => setAmountToCollect(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">Delivery Type</label>
            <Select value={deliveryType} onValueChange={setDeliveryType}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="48">Normal (48hrs)</SelectItem>
                <SelectItem value="12">Express (12hrs)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading || !cityId || !zoneId} className="w-full mt-2">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {loading ? "Sending..." : "Save & Send to Pathao"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
