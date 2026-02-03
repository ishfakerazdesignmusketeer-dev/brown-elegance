import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Newsletter = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder - would integrate with backend
    console.log("Newsletter signup:", email);
    setEmail("");
  };

  return (
    <section className="bg-cream py-20 lg:py-28">
      <div className="px-6 lg:px-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* Content */}
          <span className="font-body text-[12px] uppercase tracking-[2px] text-muted-foreground">
            Join the Circle
          </span>
          <h2 className="font-heading text-4xl lg:text-5xl text-foreground mt-3">
            The Brown Circle
          </h2>
          <p className="font-body text-base text-muted-foreground mt-6 leading-relaxed">
            Be the first to know about new collections, exclusive pre-orders, and behind-the-scenes stories. 
            Members receive 10% off their first purchase.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-10 flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 h-12 bg-background border-border font-body text-sm rounded-none focus-visible:ring-foreground"
            />
            <Button
              type="submit"
              className="h-12 px-8 bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] rounded-none"
            >
              Join Now
            </Button>
          </form>

          <p className="font-body text-[11px] text-muted-foreground mt-4">
            By joining, you agree to receive marketing emails. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
