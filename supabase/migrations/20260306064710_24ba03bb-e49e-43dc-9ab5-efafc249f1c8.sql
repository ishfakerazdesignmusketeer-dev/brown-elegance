-- Drop the OLD triggers that cause double stock deduction
DROP TRIGGER IF EXISTS auto_decrement_stock ON public.order_items;
DROP TRIGGER IF EXISTS restore_stock_on_order_cancel ON public.orders;

-- Drop the OLD functions (no longer needed)
DROP FUNCTION IF EXISTS public.decrement_stock_on_order();
DROP FUNCTION IF EXISTS public.restore_stock_on_cancel();