import { ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";

const CartReminder = () => {
  const { itemCount, subtotal, setIsOpen } = useCart();

  if (itemCount === 0) return null;

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-0 left-0 right-0 z-50 bg-foreground text-background py-3.5 px-6 flex items-center justify-between lg:hidden"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <ShoppingBag className="w-5 h-5" />
          <span className="absolute -top-1.5 -right-1.5 bg-background text-foreground text-[9px] font-body w-4 h-4 rounded-full flex items-center justify-center">
            {itemCount}
          </span>
        </div>
        <span className="font-body text-[12px] uppercase tracking-[1.5px]">
          View Cart
        </span>
      </div>
      <span className="font-body text-sm">
        {formatPrice(subtotal)} BDT
      </span>
    </button>
  );
};

export default CartReminder;
