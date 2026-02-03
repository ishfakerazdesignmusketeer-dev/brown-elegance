import { useState } from "react";
import { Search, ShoppingBag, User, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const navLinks = [
  { label: "SHOP", href: "#shop" },
  { label: "COLLECTION", href: "#collection" },
  { label: "CRAFTSMANSHIP", href: "#craftsmanship" },
  { label: "ABOUT", href: "#about" },
  { label: "CONTACT", href: "#contact" },
];

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const cartCount = 2; // Static placeholder

  return (
    <header className="bg-cream h-20 sticky top-0 z-40">
      <div className="h-full px-6 lg:px-12 flex items-center justify-between">
        {/* Left - Logo */}
        <a href="/" className="font-heading text-[28px] text-foreground font-normal tracking-wide">
          Brown
        </a>

        {/* Center - Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
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
          <button 
            className="text-foreground hover:opacity-70 transition-opacity"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          
          <button 
            className="relative text-foreground hover:opacity-70 transition-opacity"
            aria-label="Shopping cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-foreground text-background text-[10px] font-body w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          
          <button 
            className="hidden sm:block text-foreground hover:opacity-70 transition-opacity"
            aria-label="Account"
          >
            <User className="w-5 h-5" />
          </button>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button 
                className="lg:hidden text-foreground hover:opacity-70 transition-opacity"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-cream border-border w-full sm:max-w-md">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <nav className="flex flex-col gap-8 mt-12">
                {navLinks.map((link) => (
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
