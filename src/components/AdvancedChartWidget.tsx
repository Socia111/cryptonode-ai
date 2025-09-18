import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdvancedChartWidgetProps {
  symbol?: string;
  height?: number;
  theme?: 'light' | 'dark';
  interval?: string;
}

export function AdvancedChartWidget({ 
  symbol = 'BYBIT:BTCUSDT',
  height = 400,
  theme = 'dark',
  interval = '1H'
}: AdvancedChartWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing widget
    containerRef.current.innerHTML = '';

    // Create TradingView widget script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "autosize": false,
      "width": "100%",
      "height": height,
      "symbol": symbol,
      "interval": interval,
      "timezone": "Etc/UTC",
      "theme": theme,
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "withdateranges": true,
      "range": "YTD",
      "hide_side_toolbar": false,
      "allow_symbol_change": true,
      "details": true,
      "hotlist": true,
      "calendar": false,
      "studies": [
        "STD;SMA",
        "STD;EMA",
        "STD;Volume",
        "STD;RSI",
        "STD;MACD",
        "STD;Stochastic"
      ],
      "container_id": "tradingview_chart"
    });

    // Create container div for the widget
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.id = 'tradingview_chart';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';

    widgetContainer.appendChild(widgetDiv);
    widgetContainer.appendChild(script);

    containerRef.current.appendChild(widgetContainer);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, height, theme, interval]);

  return (
    <Card className="surface-elevated">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Advanced Chart - {symbol.replace('BYBIT:', '')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={containerRef} 
          style={{ height: `${height}px`, width: '100%' }}
          className="rounded-lg overflow-hidden"
        />
      </CardContent>
    </Card>
  );
}

// Simple price chart component as fallback
export function SimplePriceChart({ symbol }: { symbol: string }) {
  return (
    <Card className="surface-elevated">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Price Chart - {symbol}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground">
              TradingView Chart Loading...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Advanced charting for {symbol}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}