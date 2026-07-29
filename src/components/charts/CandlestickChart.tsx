import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CrosshairMode, ColorType, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';
import { TrendingUp, TrendingDown, AlignVerticalJustifyCenter, MousePointer2, Trash2, Ruler } from 'lucide-react';

type Candle = { time: number; open: number; high: number; low: number; close: number };

type Props = {
  symbol: string;
  interval: string;
  currentPrice?: number;
};

const INTERVALS: Record<string, string> = {
  '15m': '15m', '1h': '1h', '4h': '4h', '1D': '1d',
};

type Tool = 'none' | 'long' | 'short' | 'vertical' | 'measure';

interface Drawing {
  id: string;
  type: 'long' | 'short' | 'vertical' | 'measure';
  price?: number;
  price2?: number;
  time?: number;
  time2?: number;
  label?: string;
}

export default function CandlestickChart({ symbol, interval, currentPrice }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ma7Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ma14Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLinesRef = useRef<Map<string, unknown>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showMA] = useState(true);
  const [activeTool, setActiveTool] = useState<Tool>('none');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [pendingDraw, setPendingDraw] = useState<Partial<Drawing> | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const activeToolRef = useRef<Tool>('none');
  const pendingDrawRef = useRef<Partial<Drawing> | null>(null);

  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { pendingDrawRef.current = pendingDraw; }, [pendingDraw]);

  const calcMA = (candles: Candle[], period: number) =>
    candles.map((_, i) => {
      if (i < period - 1) return null;
      const avg = candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0) / period;
      return { time: candles[i].time, value: avg };
    }).filter(Boolean);

  const fetchAndRender = useCallback(async (sym: string, intv: string) => {
    setLoading(true);
    try {
      const binanceInterval = INTERVALS[intv] || '1h';
      const apiUrl = `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${binanceInterval}&limit=200`;
      const endpoints = [
        apiUrl,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`,
      ];
      let raw: unknown[] | null = null;
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (res.ok) { raw = await res.json(); break; }
        } catch { /* try next */ }
      }
      if (!raw) throw new Error('API error');
      const candles: Candle[] = raw.map((k: unknown[]) => ({
        time: Math.floor((k[0] as number) / 1000),
        open: parseFloat(k[1] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string),
      }));
      candlesRef.current = candles;
      if (candleSeriesRef.current) {
        candleSeriesRef.current.setData(candles);
        if (showMA) {
          ma7Ref.current?.setData(calcMA(candles, 7));
          ma14Ref.current?.setData(calcMA(candles, 14));
        }
        chartRef.current?.timeScale().fitContent();
      }
    } catch {
      // keep chart as-is
    } finally {
      setLoading(false);
    }
  }, [showMA]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 280,
      layout: {
        background: { type: ColorType.Solid, color: '#181a20' },
        textColor: '#848e9c',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#2b2f36' },
        horzLines: { color: '#2b2f36' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#2b2f36' },
      timeScale: { borderColor: '#2b2f36', timeVisible: true },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderDownColor: '#f6465d',
      borderUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
      wickUpColor: '#0ecb81',
    });
    candleSeriesRef.current = candleSeries;

    const ma7 = chart.addLineSeries({ color: '#f0b90b', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const ma14 = chart.addLineSeries({ color: '#2196f3', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    ma7Ref.current = ma7;
    ma14Ref.current = ma14;

    // Handle chart clicks for drawing tools (uses refs to always read current state)
    chart.subscribeClick((param) => {
      const tool = activeToolRef.current;
      const pending = pendingDrawRef.current;
      if (tool === 'none' || !param.point || param.point.y === undefined) return;
      const price = candleSeries.coordinateToPrice(param.point.y as number);
      if (price === null || price === undefined) return;
      const time = param.time as number | undefined;

      if (tool === 'long' || tool === 'short') {
        if (!pending) {
          setPendingDraw({ type: tool, price, time });
        } else {
          const draw: Drawing = {
            id: `${Date.now()}`,
            type: tool as 'long' | 'short',
            price: pending.price,
            price2: price,
            time: pending.time,
            time2: time,
            label: tool === 'long' ? 'Long' : 'Short',
          };
          setDrawings(prev => [...prev, draw]);
          setPendingDraw(null);
          setActiveTool('none');
        }
      } else if (tool === 'vertical') {
        const draw: Drawing = {
          id: `${Date.now()}`,
          type: 'vertical',
          time,
          label: 'VLine',
        };
        setDrawings(prev => [...prev, draw]);
        setActiveTool('none');
      } else if (tool === 'measure') {
        if (!pending) {
          setPendingDraw({ type: 'measure', price, time });
        } else {
          const draw: Drawing = {
            id: `${Date.now()}`,
            type: 'measure',
            price: pending.price,
            price2: price,
            time: pending.time,
            time2: time,
            label: 'Measure',
          };
          setDrawings(prev => [...prev, draw]);
          setPendingDraw(null);
          setActiveTool('none');
        }
      }
    });

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current?.clientWidth ?? 300 });
    });
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  // (click handler uses refs — no re-subscription needed)

  // Render drawings as price lines
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;

    // Clear existing price lines
    priceLinesRef.current.forEach((pl) => {
      try { candleSeriesRef.current?.removePriceLine(pl as never); } catch { /* ignore */ }
    });
    priceLinesRef.current.clear();

    // Render each drawing
    for (const draw of drawings) {
      if (draw.type === 'long' && draw.price) {
        const pl = candleSeriesRef.current.createPriceLine({
          price: draw.price,
          color: '#0ecb81',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `Long Entry ${draw.price.toFixed(2)}`,
        });
        priceLinesRef.current.set(`${draw.id}-entry`, pl);

        if (draw.price2) {
          const pl2 = candleSeriesRef.current.createPriceLine({
            price: draw.price2,
            color: '#0ecb81',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Target ${draw.price2.toFixed(2)} (${(((draw.price2 - draw.price) / draw.price) * 100).toFixed(2)}%)`,
          });
          priceLinesRef.current.set(`${draw.id}-target`, pl2);
        }
      } else if (draw.type === 'short' && draw.price) {
        const pl = candleSeriesRef.current.createPriceLine({
          price: draw.price,
          color: '#f6465d',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `Short Entry ${draw.price.toFixed(2)}`,
        });
        priceLinesRef.current.set(`${draw.id}-entry`, pl);

        if (draw.price2) {
          const pl2 = candleSeriesRef.current.createPriceLine({
            price: draw.price2,
            color: '#f6465d',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Target ${draw.price2.toFixed(2)} (${(((draw.price - draw.price2) / draw.price) * 100).toFixed(2)}%)`,
          });
          priceLinesRef.current.set(`${draw.id}-target`, pl2);
        }
      } else if (draw.type === 'vertical' && draw.time) {
        // Vertical lines are drawn as a line series with a single vertical segment
        // lightweight-charts doesn't support vertical lines directly, so we use a line series
        // with the same value at the given time
        const vl = chartRef.current.addLineSeries({
          color: '#f0b90b',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const candles = candlesRef.current;
        if (candles.length > 0) {
          const min = Math.min(...candles.map(c => c.low));
          const max = Math.max(...candles.map(c => c.high));
          vl.setData([
            { time: draw.time, value: min },
            { time: draw.time + 1, value: max },
          ]);
        }
        priceLinesRef.current.set(`${draw.id}-vline`, vl);
      } else if (draw.type === 'measure' && draw.price && draw.price2) {
        const pl = candleSeriesRef.current.createPriceLine({
          price: draw.price,
          color: '#848e9c',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `From ${draw.price.toFixed(2)}`,
        });
        priceLinesRef.current.set(`${draw.id}-from`, pl);
        const pl2 = candleSeriesRef.current.createPriceLine({
          price: draw.price2,
          color: '#848e9c',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `To ${draw.price2.toFixed(2)} (${Math.abs((draw.price2 - draw.price) / draw.price * 100).toFixed(2)}%)`,
        });
        priceLinesRef.current.set(`${draw.id}-to`, pl2);
      }
    }
  }, [drawings]);

  useEffect(() => {
    fetchAndRender(symbol, interval);
  }, [symbol, interval, fetchAndRender]);

  // Update last candle with live price
  useEffect(() => {
    if (!currentPrice || !candleSeriesRef.current) return;
    // No-op: lightweight-charts doesn't expose easy last candle update without full data
  }, [currentPrice]);

  const clearAllDrawings = () => {
    setDrawings([]);
    setPendingDraw(null);
    setActiveTool('none');
  };

  const removeLastDrawing = () => {
    setDrawings(prev => prev.slice(0, -1));
  };

  return (
    <div className="relative bg-[#181a20]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#181a20]/80 z-10">
          <div className="w-5 h-5 border-2 border-[#f0b90b] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Drawing Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[#0b0e11] border-b border-[#2b2f36] overflow-x-auto">
        <button
          onClick={() => { setActiveTool('none'); setPendingDraw(null); }}
          className={`p-1.5 rounded-md transition-colors ${activeTool === 'none' ? 'bg-[#f0b90b] text-black' : 'text-[#848e9c] hover:bg-[#1e2026]'}`}
          title="Cursor"
        >
          <MousePointer2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-5 bg-[#2b2f36] mx-0.5" />
        <button
          onClick={() => { setActiveTool('long'); setPendingDraw(null); }}
          className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${activeTool === 'long' ? 'bg-[#0ecb81] text-black' : 'text-[#0ecb81] hover:bg-[#1e2026]'}`}
          title="Long Position Line"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold">Long</span>
        </button>
        <button
          onClick={() => { setActiveTool('short'); setPendingDraw(null); }}
          className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${activeTool === 'short' ? 'bg-[#f6465d] text-black' : 'text-[#f6465d] hover:bg-[#1e2026]'}`}
          title="Short Position Line"
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold">Short</span>
        </button>
        <button
          onClick={() => { setActiveTool('vertical'); setPendingDraw(null); }}
          className={`p-1.5 rounded-md transition-colors ${activeTool === 'vertical' ? 'bg-[#f0b90b] text-black' : 'text-[#f0b90b] hover:bg-[#1e2026]'}`}
          title="Vertical Line"
        >
          <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { setActiveTool('measure'); setPendingDraw(null); }}
          className={`p-1.5 rounded-md transition-colors ${activeTool === 'measure' ? 'bg-[#848e9c] text-black' : 'text-[#848e9c] hover:bg-[#1e2026]'}`}
          title="Measure"
        >
          <Ruler className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-5 bg-[#2b2f36] mx-0.5" />
        <button
          onClick={removeLastDrawing}
          className="p-1.5 rounded-md text-[#848e9c] hover:bg-[#1e2026] transition-colors"
          title="Remove Last Drawing"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={clearAllDrawings}
          className="p-1.5 rounded-md text-[#f6465d] hover:bg-[#1e2026] transition-colors text-[10px] font-bold"
          title="Clear All"
        >
          Clear All
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#848e9c]">MA</span>
          <span className="text-xs text-[#f0b90b]">7</span>
          <span className="text-xs text-[#2196f3]">14</span>
        </div>
      </div>

      {/* Pending draw indicator */}
      {pendingDraw && (
        <div className="absolute top-12 left-2 z-10 bg-[#1e2026] border border-[#f0b90b] rounded-lg px-2 py-1 text-[10px] text-[#f0b90b]">
          {pendingDraw.type === 'long' && 'Click on chart to set Long target price'}
          {pendingDraw.type === 'short' && 'Click on chart to set Short target price'}
          {pendingDraw.type === 'measure' && 'Click on chart to set end point'}
        </div>
      )}

      {/* Active tool indicator */}
      {activeTool !== 'none' && !pendingDraw && (
        <div className="absolute top-12 left-2 z-10 bg-[#1e2026] border border-[#f0b90b] rounded-lg px-2 py-1 text-[10px] text-[#f0b90b]">
          {activeTool === 'long' && 'Click on chart to set Long entry price'}
          {activeTool === 'short' && 'Click on chart to set Short entry price'}
          {activeTool === 'vertical' && 'Click on chart to place vertical line'}
          {activeTool === 'measure' && 'Click on chart to set start point'}
        </div>
      )}

      <div ref={containerRef} />
    </div>
  );
}
