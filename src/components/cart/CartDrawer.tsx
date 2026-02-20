import { useCart } from "@/contexts/CartContext";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "@/lib/format";

const DELIVERY_CHARGE = 80;

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, itemCount, subtotal } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-cream border-border flex flex-col p-0">
        <SheetTitle className="sr-only">Shopping Cart</SheetTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-foreground" />
            <span className="font-heading text-xl text-foreground">Your Cart</span>
            {itemCount > 0 && (
              <span className="font-body text-xs text-muted-foreground">({itemCount} items)</span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-foreground hover:opacity-60 transition-opacity"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
            <ShoppingBag className="w-14 h-14 text-muted-foreground/40" />
            <div className="text-center">
              <p className="font-heading text-2xl text-foreground mb-2">Your cart is empty</p>
              <p className="font-body text-sm text-muted-foreground">Discover our curated collection</p>
            </div>
            <Button
              asChild
              onClick={() => setIsOpen(false)}
              className="bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] px-8 py-5 rounded-none"
            >
              <Link to="/">Shop Now</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {items.map((item) => (
                <div key={`${item.id}-${item.size}`} className="flex gap-4">
                  {/* Image */}
                  <Link
                    to={`/product/${item.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="flex-shrink-0 w-20 h-24 bg-muted overflow-hidden"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link
                          to={`/product/${item.slug}`}
                          onClick={() => setIsOpen(false)}
                          className="font-heading text-base text-foreground hover:opacity-70 transition-opacity leading-tight"
                        >
                          {item.name}
                        </Link>
                        <p className="font-body text-xs text-muted-foreground mt-0.5">Size: {item.size}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id, item.size)}
                        className="text-muted-foreground hover:text-foreground transition-colors ml-2 flex-shrink-0"
                        aria-label="Remove item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-border">
                        <button
                          onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-body text-sm text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-body text-sm text-foreground">
                        {formatPrice(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-5 space-y-3">
              <div className="flex justify-between font-body text-sm text-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between font-body text-sm text-muted-foreground">
                <span>Delivery</span>
                <span>{formatPrice(DELIVERY_CHARGE)}</span>
              </div>
              <div className="flex justify-between font-heading text-lg text-foreground border-t border-border pt-3">
                <span>Total</span>
                <span>{formatPrice(subtotal + DELIVERY_CHARGE)}</span>
              </div>
              <Button
                asChild
                className="w-full bg-foreground text-background hover:bg-foreground/90 font-body text-[12px] uppercase tracking-[1.5px] py-6 rounded-none mt-2"
                onClick={() => setIsOpen(false)}
              >
                <Link to="/checkout">Proceed to Checkout</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
