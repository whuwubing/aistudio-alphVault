
// Service to fetch stock data from Tencent Finance (qt.gtimg.cn) and Yahoo Finance
// Implements a Hybrid Strategy for best data quality across different markets.

// --- Proxy Rotation Logic ---
const PROXY_LIST = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  // Fallback
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}` 
];

const fetchWithRetry = async (targetUrl: string, encoding: string = 'gb18030'): Promise<string> => {
  for (const proxyGen of PROXY_LIST) {
    try {
      const url = proxyGen(targetUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const buffer = await response.arrayBuffer();
      const decoder = new TextDecoder(encoding);
      const text = decoder.decode(buffer);

      if (text && text.length > 2) return text; 
    } catch (e) {
      continue;
    }
  }
  throw new Error("All proxies failed to fetch data");
};

// Symbol conversion helper
const formatSymbolForTencent = (symbol: string): string | null => {
  const s = symbol.toUpperCase();
  
  // Indices & ETFs
  if (s === 'HSI' || s === 'HKHSI') return 'hkHSI';
  if (s === 'HSTECH' || s === 'HKHSTECH') return 'hkHSTECH';
  if (s === 'SHCOMP' || s === '000001.SS') return 'sh000001'; 
  if (s === 'CHINEXT' || s === '399006.SZ') return 'sz399006'; 
  if (s === 'CSI300' || s === '000300.SS') return 'sh000300';

  // US Assets - Map to Tencent format first (used for price check), 
  // but K-Line fetcher will detect 'us' prefix and switch to Yahoo.
  if (s === 'NDX' || s === 'USNDX' || s === 'NASDAQ' || s === 'QQQ') return 'usQQQ'; 
  if (s === 'SPX' || s === 'SP500') return 'us.INX';
  if (s === 'VIX' || s === 'IVX') return 'usVIX'; 
  // Changed from usGLD to usXAU for Spot Gold
  if (s === 'XAU' || s === 'XAUUSD' || s === 'GOLD') return 'usXAU'; 

  // Specific fix for Zijin Mining or similar dual listed
  // If specifically requesting SS, map to sh. If HK, map to hk.
  if (s === '601899' || s === '601899.SS') return 'sh601899';
  if (s === '2899' || s === '02899' || s === '2899.HK') return 'hk02899';

  // Standard Formats
  if (s.endsWith('.HK')) return `hk${s.replace('.HK', '')}`;
  if (s.endsWith('.SS')) return `sh${s.replace('.SS', '')}`;
  if (s.endsWith('.SZ')) return `sz${s.replace('.SZ', '')}`;
  
  if (!s.includes('.') && /^[A-Z]+$/.test(s)) return `us${s}`;

  return null;
};

export interface StockData {
  symbol: string;
  price: number;
  changePercent: number;
  name?: string;
  currency?: string;
  exchange?: string;
}

export interface KLineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
}

// --- Real-time Price (Tencent is fast for this) ---
export const fetchStockPrices = async (symbols: string[]): Promise<StockData[]> => {
  const symbolMap = new Map<string, string>();
  const tencentCodes: string[] = [];

  symbols.forEach(sym => {
    const code = formatSymbolForTencent(sym);
    if (code) {
      tencentCodes.push(code);
      symbolMap.set(code, sym);
    }
  });

  if (tencentCodes.length === 0) return [];

  try {
    const query = tencentCodes.join(',');
    const targetUrl = `http://qt.gtimg.cn/q=${query}`;
    
    // Tencent uses GBK
    const text = await fetchWithRetry(targetUrl, 'gb18030');
    const results: StockData[] = [];

    const lines = text.split(';');
    lines.forEach(line => {
      if (!line.trim()) return;
      const match = line.match(/v_([a-zA-Z0-9_.]+)=["'](.*)["']/);
      if (match) {
        const tencentCode = match[1];
        const dataStr = match[2];
        const parts = dataStr.split('~');
        
        const originalSymbol = symbolMap.get(tencentCode);
        if (originalSymbol && parts.length > 30) {
          // Fix: If current price (idx 3) is 0, fallback to previous close (idx 4)
          let price = parseFloat(parts[3]);
          const prevClose = parseFloat(parts[4]);
          
          if (price === 0 && prevClose > 0) {
             price = prevClose;
          }

          if (!isNaN(price)) {
             results.push({
              symbol: originalSymbol,
              name: parts[1],
              price: price,
              changePercent: parseFloat(parts[32])
            });
          }
        }
      }
    });
    return results;
  } catch (error) {
    console.warn("Stock API fetch failed", error);
    return [];
  }
};

export const probeStockSymbol = async (rawInput: string): Promise<StockData | null> => {
  const s = rawInput.trim();
  const candidates: string[] = [];

  if (/^\d{5}$/.test(s)) candidates.push(`hk${s}`);
  else if (/^\d{6}$/.test(s)) {
    if (s.startsWith('6')) candidates.push(`sh${s}`);
    else if (s.startsWith('0') || s.startsWith('3')) candidates.push(`sz${s}`);
    else { candidates.push(`sh${s}`); candidates.push(`sz${s}`); }
  } else if (/^\d{3,4}$/.test(s)) candidates.push(`hk${s.padStart(5, '0')}`);
  else if (/^[a-zA-Z]+$/.test(s)) candidates.push(`us${s.toUpperCase()}`);
  else if (s.includes('.')) {
      const fmt = formatSymbolForTencent(s);
      if(fmt) candidates.push(fmt);
  }

  if (candidates.length === 0) return null;

  try {
    const query = candidates.join(',');
    const targetUrl = `http://qt.gtimg.cn/q=${query}`;
    const text = await fetchWithRetry(targetUrl, 'gb18030');
    
    const lines = text.split(';');
    for (const line of lines) {
      if (!line.trim()) continue;
      const match = line.match(/v_([a-zA-Z0-9_.]+)=["'](.*)["']/);
      
      if (match) {
        const code = match[1];
        const dataStr = match[2];
        const parts = dataStr.split('~');
        
        if (parts.length > 30) {
          let price = parseFloat(parts[3]);
          const prevClose = parseFloat(parts[4]);
          
          // Fix 0 price issue during probe
          if ((price === 0 || isNaN(price)) && prevClose > 0) {
            price = prevClose;
          }

          if (!isNaN(price) && price > 0) {
             let currency = 'CNY';
             let market = 'A-Shares';
             let prettySymbol = code.replace(/^us|^hk|^sh|^sz/, '').toUpperCase();

             if (code.startsWith('us')) { 
                currency = 'USD'; market = 'US Stocks';
             } else if (code.startsWith('hk')) { 
                currency = 'HKD'; market = 'HK Stocks';
                prettySymbol = `${code.substring(2)}.HK`;
             } else if (code.startsWith('sh')) {
                prettySymbol = `${code.substring(2)}.SS`;
             } else if (code.startsWith('sz')) {
                prettySymbol = `${code.substring(2)}.SZ`;
             }

             return {
               symbol: prettySymbol,
               name: parts[1],
               price: price,
               changePercent: parseFloat(parts[32]),
               currency,
               exchange: market
             };
          }
        }
      }
    }
  } catch (e) { console.warn("Probe failed", e); }
  return null;
};

export const searchTickerByName = async (keyword: string): Promise<StockData | null> => {
  const url = `https://smartbox.gtimg.cn/s3/?v=2&q=${encodeURIComponent(keyword)}&t=all`;
  try {
    const text = await fetchWithRetry(url, 'gb18030');
    const match = text.match(/v_hint="(.*)"/);
    if (match && match[1]) {
      const firstResult = match[1].split('^')[0];
      const parts = firstResult.split('~');
      
      if (parts.length > 3) {
        const market = parts[4];
        const code = parts[1];
        let standardSymbol = code;
        if (market.includes('HK')) standardSymbol = `${code}.HK`;
        else if (market.includes('GP-A') && code.startsWith('6')) standardSymbol = `${code}.SS`;
        else if (market.includes('GP-A')) standardSymbol = `${code}.SZ`;
        else if (market.includes('US')) standardSymbol = code;
        
        const realData = await fetchStockPrices([standardSymbol]);
        if (realData.length > 0) return realData[0];
      }
    }
  } catch (e) { console.warn("Smartbox search failed", e); }
  return null;
};

// --- Yahoo Finance Fetcher for US/Global ---
const fetchYahooKLine = async (tencentCode: string, days: number): Promise<KLineData[]> => {
    // Map internal Tencent codes back to Yahoo symbols
    let symbol = tencentCode.replace('us', '');
    if (tencentCode === 'usQQQ') symbol = 'QQQ';
    if (tencentCode === 'usGLD') symbol = 'GLD';
    if (tencentCode === 'usXAU') symbol = 'XAUUSD=X'; // Spot Gold
    if (tencentCode === 'usVIX') symbol = '^VIX';
    if (tencentCode === 'us.INX') symbol = '^GSPC'; // S&P 500
    if (tencentCode === 'us.DJI') symbol = '^DJI';

    // Approximate range
    let range = '3mo';
    if (days > 100) range = '1y';
    else if (days < 30) range = '1mo';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=1d`;
    
    try {
        // Yahoo returns JSON, use UTF-8
        const text = await fetchWithRetry(url, 'utf-8');
        const json = JSON.parse(text);
        const result = json.chart?.result?.[0];
        
        if (!result) return [];
        
        const timestamps = result.timestamp || [];
        const quotes = result.indicators?.quote?.[0] || {};
        
        const data: KLineData[] = [];
        
        timestamps.forEach((ts: number, i: number) => {
            if (quotes.close[i] !== null && quotes.open[i] !== null) {
                const date = new Date(ts * 1000).toISOString().split('T')[0];
                data.push({
                    date: date,
                    open: quotes.open[i],
                    high: quotes.high[i],
                    low: quotes.low[i],
                    close: quotes.close[i]
                });
            }
        });
        
        // Return only last N days requested
        return data.slice(-days);
    } catch (e) {
        console.error(`Yahoo fetch failed for ${symbol}`, e);
        return [];
    }
}

// --- Hybrid K-Line Data Fetcher ---
export const fetchKLineData = async (symbol: string, days: number = 60): Promise<KLineData[]> => {
  const tencentCode = formatSymbolForTencent(symbol);
  if (!tencentCode) return [];
  
  // STRATEGY:
  // 1. US Assets: Use Yahoo Finance (Better historical data, no qfq issues)
  // 2. CN/HK Assets: Use Tencent Finance (Better localization, supports QFQ)
  
  if (tencentCode.startsWith('us')) {
      return fetchYahooKLine(tencentCode, days);
  }

  // Tencent Logic for CN/HK
  const url = 'http://web.ifzq.gtimg.cn/appstock/app/fqkline/get';
  const paramStr = `${tencentCode},day,,,${days},qfq`;
  const fullUrl = `${url}?param=${paramStr}`;
  
  try {
    const text = await fetchWithRetry(fullUrl, 'gb18030');
    const jsonStr = text.replace(/^[^{]*\((.*)\)[^}]*$/, '$1'); 
    let data;
    try { data = JSON.parse(jsonStr); } catch { data = JSON.parse(text); }
    
    const codeObj = data?.data?.[tencentCode];
    if (!codeObj) return [];

    const rawData = codeObj.qfqday || codeObj.day || [];
    
    return rawData.map((d: any[]) => {
        let dateStr = d[0];
        if (typeof dateStr === 'string' && dateStr.length === 8 && !dateStr.includes('-')) {
            dateStr = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
        }
        return {
            date: dateStr,
            open: parseFloat(d[1]),
            close: parseFloat(d[2]),
            high: parseFloat(d[3]),
            low: parseFloat(d[4])
        };
    });
  } catch (e) {
    console.error("KLine Fetch Failed", e);
    return [];
  }
};