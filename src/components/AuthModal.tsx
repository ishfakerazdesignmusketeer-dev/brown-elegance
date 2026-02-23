import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, X } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const { signIn, signUp } = useAuth();

  const reset = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setError("");
    setMessage("");
    setForgotMode(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    try {
      await signUp(email, password, name);
      setMessage("Check your email to confirm your account.");
    } catch (err: any) {
      setError(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage("Check your email for a password reset link.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="bg-cream border-border max-w-md p-0 gap-0 [&>button]:hidden">
        <button
          onClick={() => { onOpenChange(false); reset(); }}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-8 pt-8 pb-2 text-center">
          <h2 className="font-heading text-2xl text-foreground">Welcome to Brown House</h2>
          <p className="font-body text-sm text-muted-foreground mt-1">
            {forgotMode ? "Reset your password" : "Sign in for a better experience"}
          </p>
        </div>

        {message ? (
          <div className="px-8 pb-8 pt-4 text-center">
            <p className="font-body text-sm text-foreground bg-muted p-4 rounded">{message}</p>
            <button
              onClick={() => { reset(); onOpenChange(false); }}
              className="font-body text-sm text-muted-foreground hover:text-foreground mt-4 underline"
            >
              Close
            </button>
          </div>
        ) : forgotMode ? (
          <form onSubmit={handleForgotPassword} className="px-8 pb-8 pt-4 space-y-4">
            <div>
              <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
                placeholder="your@email.com"
              />
            </div>
            {error && <p className="font-body text-xs text-destructive">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] py-6 rounded-none"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
            </Button>
            <button
              type="button"
              onClick={() => { setForgotMode(false); setError(""); }}
              className="font-body text-sm text-muted-foreground hover:text-foreground w-full text-center"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-border mx-8 mt-4">
              <button
                onClick={() => { setTab("signin"); setError(""); }}
                className={`flex-1 pb-3 font-body text-sm uppercase tracking-[1.5px] border-b-2 transition-colors ${
                  tab === "signin" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setTab("signup"); setError(""); }}
                className={`flex-1 pb-3 font-body text-sm uppercase tracking-[1.5px] border-b-2 transition-colors ${
                  tab === "signup" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>

            {tab === "signin" ? (
              <form onSubmit={handleSignIn} className="px-8 pb-6 pt-4 space-y-4">
                <div>
                  <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="font-body text-xs text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </button>
                {error && <p className="font-body text-xs text-destructive">{error}</p>}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] py-6 rounded-none"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="px-8 pb-6 pt-4 space-y-4">
                <div>
                  <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">Full Name</label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-transparent border-border rounded-none font-body text-sm focus-visible:ring-foreground"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="font-body text-xs uppercase tracking-[1.5px] text-foreground block mb-2">Password</label>
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
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                </Button>
              </form>
            )}

            {/* Guest option */}
            <div className="px-8 pb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 border-t border-border" />
                <span className="font-body text-xs text-muted-foreground uppercase">or continue as guest</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <button
                onClick={() => { onOpenChange(false); reset(); }}
                className="w-full font-body text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Continue without account →
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
