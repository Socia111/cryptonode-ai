import { useEffect, useRef, useState } from "react";
import { openLiveTicker } from "@/lib/liveTicker";

export default function LivePrice() {
  const [price, setPrice] = useState<number | null>(null);
  const [ex, setEx] = useState<string>("");
  const [change, setChange] = useState<number>(0);
  const last = useRef<number>(0);
  const prevPrice = useRef<number | null>(null);

  useEffect(() => {
    const close = openLiveTicker((t) => {
      // throttle UI to ~10 updates/sec
      const now = Date.now();
      if (now - last.current < 100) return;
      last.current = now;
      
      // Calculate price change
      if (prevPrice.current !== null) {
        setChange(((t.price - prevPrice.current) / prevPrice.current) * 100);
      }
      prevPrice.current = t.price;
      setPrice(t.price);
    }, setEx);
    return () => close();
  }, []);

  const changeColor = change >= 0 ? "text-green-500" : "text-red-500";
  const changeIcon = change >= 0 ? "+" : "";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">BTC/USDT</span>
      <div className="flex flex-col">
        <span className="text-2xl font-semibold tabular-nums">
          ${price ? price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
        </span>
        {change !== 0 && (
          <span className={`text-sm ${changeColor} tabular-nums`}>
            {changeIcon}{change.toFixed(2)}%
          </span>
        )}
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/50 text-accent-foreground">
        live • {ex || "…"}
      </span>
    </div>
  );
}