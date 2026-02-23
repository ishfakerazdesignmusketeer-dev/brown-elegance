import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";

const MyProfile = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    default_address: "",
    default_city: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name || user.user_metadata?.full_name || "",
            phone: data.phone || "",
            default_address: data.default_address || "",
            default_city: data.default_city || "",
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone: form.phone,
          default_address: form.default_address,
          default_city: form.default_city,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-cream">
      <AnnouncementBar />
      <Navigation />
      <main className="px-6 lg:px-12 py-10 max-w-lg mx-auto">
        <h1 className="font-heading text-4xl text-foreground mb-8">My Profile</h1>

        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-muted rounded w-1/3 mb-2" />
                <div className="h-9 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">Full Name</label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
              />
            </div>

            <div>
              <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">Email</label>
              <Input
                value={user.email || ""}
                disabled
                className="bg-muted border-border rounded-none font-body text-sm opacity-60"
              />
            </div>

            <div>
              <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">Phone Number</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="01XXXXXXXXX"
                className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
              />
            </div>

            <div>
              <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">Default Address</label>
              <Input
                value={form.default_address}
                onChange={(e) => setForm((p) => ({ ...p, default_address: e.target.value }))}
                placeholder="House no., road, area..."
                className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
              />
            </div>

            <div>
              <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">City / District</label>
              <Input
                value={form.default_city}
                onChange={(e) => setForm((p) => ({ ...p, default_city: e.target.value }))}
                placeholder="e.g. Dhaka"
                className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] px-8 py-5 rounded-none"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyProfile;
