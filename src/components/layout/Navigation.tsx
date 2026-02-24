import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingBag, User, Menu, ChevronDown, LogOut, Package, UserCircle, LayoutDashboard } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import defaultLogo from "@/assets/logo.png";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/use-branding";
import AuthModal from "@/components/AuthModal";
import ContactModal from "@/components/ContactModal";

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
  const [authOpen, setAuthOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { itemCount, setIsOpen: openCart } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const { data: branding } = useBranding();
  const logoSrc = branding?.logoUrl || defaultLogo;
  const navigate = useNavigate();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-public"],
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

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "User";

  const handleUserClick = () => {
    if (user) {
      setUserDropdown(!userDropdown);
    } else {
      setAuthOpen(true);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUserDropdown(false);
  };

  const handleAdminClick = () => {
    sessionStorage.setItem("brown_admin_auth", "true");
    setUserDropdown(false);
    navigate("/admin/dashboard");
  };

  return (
    <>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
      <header className="bg-cream h-14 sticky top-0 z-40">
        <div className="h-full px-6 lg:px-12 flex items-center justify-between">
          {/* Left - Logo */}
          <Link to="/" className="h-10">
            <img src={logoSrc} alt="Brown House" className="h-full w-auto" />
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

            {navLinks.slice(1).map((link) =>
              link.label === "CONTACT" ? (
                <button
                  key={link.label}
                  onClick={() => setContactOpen(true)}
                  className="font-body text-[14px] text-foreground hover:opacity-70 transition-opacity"
                >
                  {link.label}
                </button>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="font-body text-[14px] text-foreground hover:opacity-70 transition-opacity"
                >
                  {link.label}
                </a>
              )
            )}
          </nav>

          {/* Right - Utility Icons */}
          <div className="flex items-center gap-5 [&_button]:flex [&_button]:items-center [&_button]:justify-center">
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

            {/* User icon + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleUserClick}
                className="text-foreground hover:opacity-70 transition-opacity"
                aria-label="Account"
              >
                <User className="w-5 h-5" />
              </button>

              {userDropdown && user && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="font-body text-sm text-foreground font-medium">Hi, {firstName} 👋</p>
                    <p className="font-body text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/my-orders"
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 font-body text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      My Orders
                    </Link>
                    <Link
                      to="/my-profile"
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 font-body text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <UserCircle className="w-4 h-4" />
                      My Profile
                    </Link>
                    {isAdmin && (
                      <button
                        onClick={handleAdminClick}
                        className="flex items-center gap-3 px-4 py-2.5 font-body text-sm text-foreground hover:bg-muted transition-colors w-full text-left"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Admin Dashboard
                      </button>
                    )}
                  </div>
                  <div className="border-t border-border py-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-2.5 font-body text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

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

                  {navLinks.slice(1).map((link) =>
                    link.label === "CONTACT" ? (
                      <button
                        key={link.label}
                        onClick={() => { setIsOpen(false); setContactOpen(true); }}
                        className="font-heading text-2xl text-foreground hover:opacity-70 transition-opacity text-left"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        key={link.label}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className="font-heading text-2xl text-foreground hover:opacity-70 transition-opacity"
                      >
                        {link.label}
                      </a>
                    )
                  )}

                  <div className="border-t border-border pt-8 mt-4 space-y-4">
                    {user ? (
                      <>
                        <p className="font-body text-sm text-muted-foreground">Hi, {firstName} 👋</p>
                        <Link
                          to="/my-orders"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 font-body text-lg text-foreground hover:opacity-70 transition-opacity"
                        >
                          <Package className="w-5 h-5" />
                          My Orders
                        </Link>
                        <Link
                          to="/my-profile"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 font-body text-lg text-foreground hover:opacity-70 transition-opacity"
                        >
                          <UserCircle className="w-5 h-5" />
                          My Profile
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => { handleAdminClick(); setIsOpen(false); }}
                            className="flex items-center gap-3 font-body text-lg text-foreground hover:opacity-70 transition-opacity"
                          >
                            <LayoutDashboard className="w-5 h-5" />
                            Admin Dashboard
                          </button>
                        )}
                        <button
                          onClick={() => { handleSignOut(); setIsOpen(false); }}
                          className="flex items-center gap-3 font-body text-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <LogOut className="w-5 h-5" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setIsOpen(false); setAuthOpen(true); }}
                        className="flex items-center gap-3 font-body text-lg text-foreground hover:opacity-70 transition-opacity"
                      >
                        <User className="w-5 h-5" />
                        Sign In / Create Account
                      </button>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navigation;
