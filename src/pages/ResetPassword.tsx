import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/layout/Navigation";
import AnnouncementBar from "@/components/layout/AnnouncementBar";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <AnnouncementBar />
      <Navigation />
      <main className="flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-sm">
          <h1 className="font-heading text-3xl text-foreground text-center mb-8">Reset Password</h1>

          {success ? (
            <p className="font-body text-sm text-foreground bg-muted p-4 text-center">
              Password updated! Redirecting...
            </p>
          ) : !isRecovery ? (
            <p className="font-body text-sm text-muted-foreground text-center">
              Invalid or expired reset link. Please request a new one.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">New Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">Confirm Password</label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="font-body text-xs text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] py-6 rounded-none"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
