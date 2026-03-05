import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CurrencyContextType {
  currency: "BDT" | "USD";
  setCurrency: (c: "BDT" | "USD") => void;
  exchangeRate: number;
  formatPrice: (bdtAmount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "BDT",
  setCurrency: () => {},
  exchangeRate: 110,
  formatPrice: (n) => `৳${n.toLocaleString("en-IN")}`,
});

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<"BDT" | "USD">("BDT");
  const [exchangeRate, setExchangeRate] = useState(110);

  useEffect(() => {
    supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "usd_exchange_rate")
      .single()
      .then(({ data }) => {
        if (data?.value) setExchangeRate(Number(data.value) || 110);
      });
  }, []);

  const formatPrice = (bdtAmount: number): string => {
    if (currency === "USD") {
      const usd = bdtAmount / exchangeRate;
      return `$${usd.toFixed(2)}`;
    }
    return `৳${bdtAmount.toLocaleString("en-IN")}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, exchangeRate, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};
