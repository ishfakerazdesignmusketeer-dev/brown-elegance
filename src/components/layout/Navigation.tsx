import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingBag, User, Menu, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import logo from "@/assets/logo.png";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const navLinks = [
  { label: "SHOP", href: "#shop" },
  { label: "CRAFTSMANSHIP", href: "#craftsmanship" },
  { label: "ABOUT", href: "#about" },
  { label: "CONTACT", href: "#contact" },
];

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const { itemCount, setIsOpen: openCart } = useCart();

  const { data: categories = [] } = useQuery({
    queryKey: ["nav-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <header className="bg-cream h-14 sticky top-0 z-40">
      <div className="h-full px-6 lg:px-12 flex items-center justify-between">
        {/* Left - Logo */}
        <Link to="/" className="h-10">
          <img src={logo} alt="Brown House" className="h-full w-auto" />
        </Link>

        {/* Center - Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-10">
          {navLinks.slice(0, 1).map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-body text-[14px] text-foreground hover:opacity-70 transition-opacity"
            >
              {link.label}
            </a>
          ))}

          {/* Collections dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setCollectionsOpen(true)}
            onMouseLeave={() => setCollectionsOpen(false)}
          >
            <button className="font-body text-[14px] text-foreground hover:opacity-70 transition-opacity flex items-center gap-1">
              COLLECTIONS
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collectionsOpen ? "rotate-180" : ""}`} />
            </button>
            {collectionsOpen && (
              <div className="absolute top-full left-0 mt-1 bg-cream border border-border shadow-lg min-w-[180px] py-2 z-50">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/collections/${cat.slug}`}
                    className="block px-4 py-2 font-body text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {navLinks.slice(1).map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-body text-[14px] text-foreground hover:opacity-70 transition-opacity"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right - Utility Icons */}
        <div className="flex items-center gap-5">
          <button className="text-foreground hover:opacity-70 transition-opacity" aria-label="Search">
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={() => openCart(true)}
            className="relative text-foreground hover:opacity-70 transition-opacity"
            aria-label="Shopping cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-foreground text-background text-[10px] font-body w-4 h-4 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>

          <button className="hidden sm:block text-foreground hover:opacity-70 transition-opacity" aria-label="Account">
            <User className="w-5 h-5" />
          </button>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button className="lg:hidden text-foreground hover:opacity-70 transition-opacity" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-cream border-border w-full sm:max-w-md">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <nav className="flex flex-col gap-8 mt-12">
                <a href="#shop" onClick={() => setIsOpen(false)} className="font-heading text-2xl text-foreground hover:opacity-70 transition-opacity">
                  SHOP
                </a>

                {/* Collections in mobile */}
                <div>
                  <p className="font-heading text-2xl text-foreground mb-4">COLLECTIONS</p>
                  <div className="pl-4 space-y-3">
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/collections/${cat.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="block font-body text-lg text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>

                {navLinks.slice(1).map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="font-heading text-2xl text-foreground hover:opacity-70 transition-opacity"
                  >
                    {link.label}
                  </a>
                ))}

                <div className="border-t border-border pt-8 mt-4">
                  <a
                    href="#account"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 font-body text-lg text-foreground hover:opacity-70 transition-opacity"
                  >
                    <User className="w-5 h-5" />
                    Account
                  </a>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
