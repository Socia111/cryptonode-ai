import { useEffect, useRef, useState } from "react";
import { openLiveTicker } from "@/lib/liveTicker";

interface LivePriceData {
  price: number | null;
  exchange: string;
  change24h: number;
  isConnected: boolean;
}

export function useLivePrice() {
  const [data, setData] = useState<LivePriceData>({
    price: null,
    exchange: "",
    change24h: 0,
    isConnected: false
  });
  
  const last24hPrice = useRef<number | null>(null);
  const lastUpdate = useRef<number>(0);

  useEffect(() => {
    const close = openLiveTicker(
      (tick) => {
        // Throttle updates to avoid excessive re-renders
        const now = Date.now();
        if (now - lastUpdate.current < 100) return;
        lastUpdate.current = now;

        setData(prev => {
          // Calculate 24h change (simplified - in reality you'd use historical data)
          let change24h = prev.change24h;
          if (last24hPrice.current !== null && last24hPrice.current !== tick.price) {
            change24h = ((tick.price - last24hPrice.current) / last24hPrice.current) * 100;
          }
          
          // Update 24h reference price periodically
          if (last24hPrice.current === null) {
            last24hPrice.current = tick.price;
          }

          return {
            price: tick.price,
            exchange: tick.exchange,
            change24h,
            isConnected: true
          };
        });
      },
      (exchangeName) => {
        setData(prev => ({
          ...prev,
          exchange: exchangeName,
          isConnected: true
        }));
      }
    );

    return () => {
      close();
      setData(prev => ({ ...prev, isConnected: false }));
    };
  }, []);

  return data;
}