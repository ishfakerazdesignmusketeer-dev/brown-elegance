import { Instagram, Facebook } from "lucide-react";
import logo from "@/assets/logo.png";

const footerLinks = {
  shop: [
    { label: "All Products", href: "#" },
    { label: "New Arrivals", href: "#" },
    { label: "Pre-Order", href: "#" },
    { label: "Gift Cards", href: "#" },
  ],
  about: [
    { label: "Our Story", href: "#" },
    { label: "Craftsmanship", href: "#" },
    { label: "Sustainability", href: "#" },
    { label: "Press", href: "#" },
  ],
  support: [
    { label: "Contact Us", href: "#" },
    { label: "Shipping & Returns", href: "#" },
    { label: "Size Guide", href: "#" },
    { label: "FAQs", href: "#" },
  ],
};

const Footer = () => {
  return (
    <footer className="bg-espresso text-cream">
      <div className="px-6 lg:px-12 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <img src={logo} alt="Brown" className="h-12 w-auto brightness-0 invert" />
            <p className="font-body text-sm text-cream/70 mt-6 max-w-sm leading-relaxed">
              Small-batch panjabis in premium fabrics, designed for those who know quality when they see it. 
              Handcrafted in Dhaka with love.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="#"
                className="w-10 h-10 border border-cream/30 flex items-center justify-center hover:bg-cream hover:text-espresso transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-10 h-10 border border-cream/30 flex items-center justify-center hover:bg-cream hover:text-espresso transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-body text-[12px] uppercase tracking-[2px] text-cream/50 mb-6">
              Shop
            </h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-body text-sm text-cream/80 hover:text-cream transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* About Links */}
          <div>
            <h4 className="font-body text-[12px] uppercase tracking-[2px] text-cream/50 mb-6">
              About
            </h4>
            <ul className="space-y-3">
              {footerLinks.about.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-body text-sm text-cream/80 hover:text-cream transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-body text-[12px] uppercase tracking-[2px] text-cream/50 mb-6">
              Support
            </h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-body text-sm text-cream/80 hover:text-cream transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-cream/10 mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-body text-[11px] text-cream/50">
            © 2026 Brown. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="font-body text-[11px] text-cream/50 hover:text-cream transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="font-body text-[11px] text-cream/50 hover:text-cream transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
