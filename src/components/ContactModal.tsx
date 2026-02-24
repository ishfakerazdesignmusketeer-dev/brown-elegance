import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContactModal = ({ open, onOpenChange }: ContactModalProps) => {
  const { data } = useQuery({
    queryKey: ["contact-info"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("footer_settings")
        .select("key, value")
        .in("key", ["contact_email", "contact_phone", "contact_address"]);
      if (error) throw error;
      const map: Record<string, string | null> = {};
      data.forEach((s) => { map[s.key] = s.value; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const email = data?.contact_email || "hello@brownhouse.in";
  const phone = data?.contact_phone || "+91 98765 43210";
  const address = data?.contact_address;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cream border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground">Get in Touch</DialogTitle>
          <DialogDescription className="font-body text-sm text-muted-foreground">
            We'd love to hear from you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-4 group"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wide">Email</p>
              <p className="font-body text-sm text-foreground group-hover:underline">{email}</p>
            </div>
          </a>

          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex items-center gap-4 group"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
              <p className="font-body text-sm text-foreground group-hover:underline">{phone}</p>
            </div>
          </a>

          {address && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground uppercase tracking-wide">Address</p>
                <p className="font-body text-sm text-foreground">{address}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactModal;
