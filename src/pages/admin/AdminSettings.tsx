import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Save, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import BrandingSection from "@/components/admin/BrandingSection";

interface Setting {
  id: string;
  key: string;
  value: string | null;
}

const SETTING_META: Record<string, { label: string; type?: string; placeholder?: string }> = {
  whatsapp_number: { label: "WhatsApp Number", placeholder: "8801883132020" },
  delivery_charge: { label: "Delivery Charge (৳)", type: "number", placeholder: "80" },
  admin_password: { label: "Admin Password", type: "password", placeholder: "••••••••" },
  admin_email: { label: "Admin Email (for dashboard access)", type: "email", placeholder: "admin@example.com" },
  store_name: { label: "Store Name", placeholder: "BROWN" },
  store_email: { label: "Store Email", placeholder: "hello@brownbd.com" },
  store_url: { label: "Store URL", placeholder: "https://brownbd.com" },
  size_chart_url: { label: "Size Chart Image URL", placeholder: "https://... image URL" },
  bkash_number: { label: "bKash Number", placeholder: "01XXXXXXXXX" },
  nagad_number: { label: "Nagad Number", placeholder: "01XXXXXXXXX" },
  studio_name: { label: "Studio Name", placeholder: "Brown House Experience Studio" },
  studio_address: { label: "Studio Address", placeholder: "Full address here" },
  studio_city: { label: "City", placeholder: "Dhaka" },
  studio_map_url: { label: "Google Maps URL", placeholder: "https://maps.google.com/..." },
  studio_hours: { label: "Opening Hours", placeholder: "Sat–Thu: 11am–8pm" },
  instagram_url: { label: "Instagram URL", placeholder: "https://instagram.com/brownhouse" },
  delivery_inside_dhaka: { label: "Delivery Charge Inside Dhaka (৳)", type: "number", placeholder: "100" },
  delivery_outside_dhaka: { label: "Delivery Charge Outside Dhaka (৳)", type: "number", placeholder: "130" },
  return_policy_content: { label: "Return Policy Content", placeholder: "Enter your return policy here..." },
  pathao_client_id: { label: "Client ID", type: "password", placeholder: "Pathao Client ID" },
  pathao_client_secret: { label: "Client Secret", type: "password", placeholder: "Pathao Client Secret" },
  pathao_username: { label: "Merchant Email", placeholder: "merchant@example.com" },
  pathao_password: { label: "Merchant Password", type: "password", placeholder: "••••••••" },
  pathao_store_id: { label: "Store ID", placeholder: "372992" },
  pathao_sender_phone: { label: "Sender Phone", placeholder: "01XXXXXXXXX" },
};

const AdminSettings = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPathaoPasswords, setShowPathaoPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pathaoConnecting, setPathaoConnecting] = useState(false);
  const [pathaoTesting, setPathaoTesting] = useState(false);
  const [pathaoStatus, setPathaoStatus] = useState<"idle" | "connected" | "error">("idle");
  const [pathaoExpiry, setPathaoExpiry] = useState<string | null>(null);
  const [pathaoTestResult, setPathaoTestResult] = useState<"idle" | "ok" | "error">("idle");

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async (): Promise<Setting[]> => {
      const { data, error } = await supabase.from("admin_settings").select("*");
      if (error) throw error;
      const initial: Record<string, string> = {};
      (data as Setting[]).forEach((s) => { initial[s.key] = s.value ?? ""; });
      setValues(initial);
      // Check if Pathao is connected
      const expiry = initial["pathao_token_expires_at"];
      if (expiry && new Date(expiry).getTime() > Date.now()) {
        setPathaoStatus("connected");
        setPathaoExpiry(expiry);
      }
      return data as Setting[];
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const allKeys = new Set([...settings.map(s => s.key), ...Object.keys(values)]);
      const upserts = Array.from(allKeys).map((key) => {
        const existing = settings.find(s => s.key === key);
        if (existing) {
          return supabase.from("admin_settings").update({ value: values[key] ?? existing.value }).eq("key", key);
        }
        return supabase.from("admin_settings").insert({ key, value: values[key] ?? "" });
      });
      const results = await Promise.all(upserts);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePathaoConnect = async () => {
    setPathaoConnecting(true);
    setPathaoStatus("idle");
    try {
      // Save credentials first
      await handleSave();
      const { data, error } = await supabase.functions.invoke("pathao-auth");
      if (error || data?.error) throw new Error(data?.error || "Connection failed");
      setPathaoStatus("connected");
      setPathaoExpiry(data.expires_at);
      toast.success("Connected to Pathao ✓");
    } catch (err: any) {
      setPathaoStatus("error");
      toast.error(err.message || "Failed to connect to Pathao");
    } finally {
      setPathaoConnecting(false);
    }
  };

  const handlePathaoTest = async () => {
    setPathaoTesting(true);
    setPathaoTestResult("idle");
    try {
      const { data, error } = await supabase.functions.invoke("pathao-get-cities");
      if (error || data?.error) throw new Error(data?.error || "Test failed");
      if (data?.cities?.length > 0) {
        setPathaoTestResult("ok");
        toast.success(`Connection working ✓ (${data.cities.length} cities loaded)`);
      } else {
        throw new Error("No cities returned");
      }
    } catch (err: any) {
      setPathaoTestResult("error");
      toast.error(err.message || "Test failed");
    } finally {
      setPathaoTesting(false);
    }
  };

  const orderedKeys = ["store_name", "store_email", "store_url", "admin_email", "whatsapp_number", "instagram_url", "bkash_number", "nagad_number", "size_chart_url", "delivery_charge", "admin_password"];
  const studioKeys = ["studio_name", "studio_address", "studio_city", "studio_map_url", "studio_hours"];
  const deliveryKeys = ["delivery_inside_dhaka", "delivery_outside_dhaka"];
  const pathaoKeys = ["pathao_client_id", "pathao_client_secret", "pathao_username", "pathao_password", "pathao_store_id", "pathao_sender_phone"];

  const renderField = (key: string, showPw?: boolean) => {
    const meta = SETTING_META[key];
    if (!meta) return null;
    const isPassword = meta.type === "password";
    const isAdminPassword = key === "admin_password";
    const showVal = isPassword ? (isAdminPassword ? showPassword : (showPw ?? false)) : true;
    return (
      <div key={key}>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
          {meta.label}
        </label>
        <div className="relative">
          <Input
            type={isPassword && !showVal ? "password" : (meta.type === "number" ? "number" : "text")}
            value={values[key] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
            placeholder={meta.placeholder}
            className="h-9 text-sm pr-10"
          />
          {isAdminPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {key === "size_chart_url" && values[key] && (
          <img src={values[key]} alt="Size chart preview" className="mt-2 max-h-32 rounded border border-border object-contain" />
        )}
        {key === "pathao_store_id" && (
          <p className="text-[10px] text-muted-foreground mt-1">Find in Pathao Merchant Panel → Developer API → Store List</p>
        )}
      </div>
    );
  };

  const saveButton = (
    <button
      onClick={handleSave}
      disabled={saving}
      className="flex items-center gap-2 bg-foreground text-background text-sm px-5 py-2.5 rounded-lg hover:opacity-80 transition-colors disabled:opacity-50 mt-2"
    >
      <Save className="w-4 h-4" />
      {saving ? "Saving..." : "Save All"}
    </button>
  );

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-6">Settings</h1>

      <div className="mb-8"><BrandingSection /></div>

      <div className="bg-background border border-border rounded-lg p-6 max-w-lg">
        {isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-muted rounded w-1/3 mb-2" />
                <div className="h-9 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {orderedKeys.map((k) => renderField(k))}
            {saveButton}
          </div>
        )}
      </div>

      {/* Delivery Charges */}
      <div className="bg-background border border-border rounded-lg p-6 max-w-lg mt-8">
        <h2 className="text-base font-semibold text-foreground mb-1">📦 Delivery Charges</h2>
        <p className="text-xs text-muted-foreground mb-5">Set delivery fees for Inside and Outside Dhaka.</p>
        {!isLoading && (
          <div className="space-y-5">
            {deliveryKeys.map((k) => renderField(k))}
            {saveButton}
          </div>
        )}
      </div>

      {/* Pathao Courier Integration */}
      <div className="bg-background border border-border rounded-lg p-6 max-w-lg mt-8">
        <h2 className="text-base font-semibold text-foreground mb-1">🚚 Pathao Courier Integration</h2>
        <p className="text-xs text-muted-foreground mb-5">Connect your Pathao Merchant account to send orders directly.</p>

        {pathaoStatus === "connected" && (
          <div className="flex items-center gap-2 mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-700 font-medium">Connected</span>
            {pathaoExpiry && (
              <span className="text-[10px] text-emerald-600 ml-auto">
                Token expires: {new Date(pathaoExpiry).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {pathaoStatus === "error" && (
          <div className="flex items-center gap-2 mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">Connection failed. Check credentials.</span>
          </div>
        )}

        {!isLoading && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Show passwords</span>
              <button
                type="button"
                onClick={() => setShowPathaoPasswords(!showPathaoPasswords)}
                className="text-xs text-primary hover:underline"
              >
                {showPathaoPasswords ? "Hide" : "Show"}
              </button>
            </div>
            {pathaoKeys.map((k) => renderField(k, showPathaoPasswords))}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handlePathaoConnect}
                disabled={pathaoConnecting}
                className="gap-1"
              >
                {pathaoConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
                {pathaoConnecting ? "Connecting..." : "Connect to Pathao"}
              </Button>
              <Button
                variant="outline"
                onClick={handlePathaoTest}
                disabled={pathaoTesting || pathaoStatus !== "connected"}
                className="gap-1"
              >
                {pathaoTesting && <Loader2 className="w-4 h-4 animate-spin" />}
                {pathaoTestResult === "ok" ? "✓ Working" : "Test Connection"}
              </Button>
            </div>
            {saveButton}
          </div>
        )}
      </div>

      {/* Experience Studio */}
      <div className="bg-background border border-border rounded-lg p-6 max-w-lg mt-8">
        <h2 className="text-base font-semibold text-foreground mb-1">🏛️ Experience Studio Information</h2>
        <p className="text-xs text-muted-foreground mb-5">Studio details shown on studio-exclusive product pages.</p>
        {isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-muted rounded w-1/3 mb-2" />
                <div className="h-9 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {studioKeys.map((k) => renderField(k))}
            {saveButton}
          </div>
        )}
      </div>

      {/* Return Policy */}
      <div className="bg-background border border-border rounded-lg p-6 max-w-lg mt-8">
        <h2 className="text-base font-semibold text-foreground mb-1">↩️ Return Policy</h2>
        <p className="text-xs text-muted-foreground mb-5">This content is displayed in the Return Policy modal on product pages.</p>
        {!isLoading && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                Return Policy Content
              </label>
              <Textarea
                value={values["return_policy_content"] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, return_policy_content: e.target.value }))}
                placeholder="Enter your return policy here..."
                rows={8}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {(values["return_policy_content"] ?? "").length} characters · Supports line breaks
              </p>
            </div>
            {saveButton}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
